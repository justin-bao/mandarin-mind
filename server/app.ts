import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes.js";
import { log } from "./log.js";
import { storage } from "./storage.js";
import { pool } from "./db.js";

declare global {
  namespace Express {
    interface User extends Omit<import("../shared/schema.js").User, "passwordHash"> {}
  }
}

const PgSession = connectPgSimple(session);

let passportConfigured = false;
let localTestUserPromise: Promise<Express.User> | null = null;

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

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const emailRecord = profile.emails?.find((email) => email.verified);
            const email = emailRecord?.value?.toLowerCase().trim();
            if (!email) {
              return done(null, false, { message: "Google account did not provide a verified email address" });
            }

            const existingGoogleUser = await storage.getUserByGoogleId(profile.id);
            if (existingGoogleUser) {
              const { passwordHash: _, ...safeUser } = existingGoogleUser;
              return done(null, safeUser);
            }

            const existingEmailUser = await storage.getUserByEmail(email);
            if (existingEmailUser) {
              const linkedUser = existingEmailUser.googleId
                ? existingEmailUser
                : await storage.linkUserToGoogle(existingEmailUser.id, profile.id);
              const { passwordHash: _, ...safeUser } = linkedUser;
              return done(null, safeUser);
            }

            const passwordHash = await bcrypt.hash(`google-oauth:${randomUUID()}`, 12);
            const user = await storage.createUser({
              email,
              passwordHash,
              googleId: profile.id,
            });
            const { passwordHash: _, ...safeUser } = user;
            return done(null, safeUser);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

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

async function getLocalTestUser(): Promise<Express.User> {
  if (!localTestUserPromise) {
    localTestUserPromise = (async () => {
      const email = process.env.LOCAL_AUTO_LOGIN_EMAIL || "local-test@mandarinmind.dev";
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        const { passwordHash: _, ...safeUser } = existing;
        return safeUser;
      }

      const passwordHash = await bcrypt.hash(
        process.env.LOCAL_AUTO_LOGIN_PASSWORD || "local-development-password",
        12
      );
      const user = await storage.createUser({
        email,
        passwordHash,
      });
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    })();
  }

  return localTestUserPromise;
}

function localAutoLogin(req: Request, res: Response, next: NextFunction) {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_AUTO_LOGIN !== "false";

  if (!enabled || req.isAuthenticated() || req.path === "/api/auth/logout") {
    return next();
  }

  getLocalTestUser()
    .then((user) => {
      req.login(user, (err) => {
        if (err) return next(err);
        next();
      });
    })
    .catch(next);
}

export async function createApp() {
  assertRequiredEnv();
  configurePassport();

  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
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
        secure: isProduction && Boolean(process.env.VERCEL),
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(localAutoLogin);

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
