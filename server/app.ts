import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { log } from "./log.js";
import { storage } from "./storage.js";
import { supabaseServer } from "./supabase.js";
import type { User as AppUser } from "../shared/schema.js";

declare global {
  namespace Express {
    interface User extends AppUser {}
    interface Request {
      user?: User;
    }
  }
}

function assertRequiredEnv() {
  const requiredEnvVars: Record<string, string> = {
    OPENAI_API_KEY: "OpenAI API key - required for speech transcription, conversation AI, and TTS",
    GROQ_API_KEY: "Groq API key - required for video/audio caption generation",
    DATABASE_URL: "PostgreSQL connection string - required for data persistence",
    SUPABASE_URL: "Supabase project URL - required for Supabase Auth",
    SUPABASE_ANON_KEY: "Supabase anon key - required for Supabase Auth token verification",
  };
  const missingVars: string[] = [];
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      console.error(`[startup] Missing required environment variable: ${key}\n  ${description}`);
      missingVars.push(key);
    }
  }
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
}

function getBearerToken(req: Request) {
  const header = req.header("authorization");
  const [scheme, token] = header?.split(" ") ?? [];
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function attachSupabaseUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();

    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user?.email) return next();

    req.user = await storage.upsertUserProfile({
      id: data.user.id,
      email: data.user.email.toLowerCase().trim(),
    });
    next();
  } catch (error) {
    next(error);
  }
}

export async function createApp() {
  assertRequiredEnv();

  const app = express();
  if (process.env.VERCEL) {
    app.set("trust proxy", 1);
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(attachSupabaseUser);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "...";
        }
        log(logLine);
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

  return { app, server };
}
