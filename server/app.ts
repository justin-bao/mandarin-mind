import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { registerRoutes } from "./routes";
import { log } from "./log";
import { storage } from "./storage";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends Omit<import("../shared/schema").User, "passwordHash"> {}
  }
}

const PgSession = connectPgSimple(session);

let passportConfigured = false;

function assertRequiredEnv() {
  const requiredEnvVars: Record<string, string> = {
    OPENAI_API_KEY: "OpenAI API key - required for speech transcription, conversation AI, and TTS",
    GROQ_API_KEY: "Groq API key - required for video/audio caption generation",
    DATABASE_URL: "PostgreSQL connection string - required for data persistence",
    SESSION_SECRET: "Random secret for signing session cookies - required for account security",
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

function configurePassport() {
  if (passportConfigured) return;

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase().trim());
        if (!user) return done(null, false, { message: "Invalid email or password" });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid email or password" });
        const { passwordHash: _, ...safeUser } = user;
        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, (user as Express.User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) return done(null, false);
      const { passwordHash: _, ...safeUser } = user;
      done(null, safeUser);
    } catch (err) {
      done(err);
    }
  });

  passportConfigured = true;
}

export async function createApp() {
  assertRequiredEnv();
  configurePassport();

  const app = express();
  if (process.env.VERCEL) {
    app.set("trust proxy", 1);
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(process.env.VERCEL),
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

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
