import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "../shared";
import { users, insertUserSchema, User, UserRole } from "../shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface AuthenticatedUser extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ai-grader-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // User login with email instead of username
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, {
            ...user,
            role: user.role as UserRole, // Ensure role matches the expected type
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { id: number }).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, { ...user, role: user.role as UserRole });
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate using Zod schema
      const userData = insertUserSchema.parse(req.body);

      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Create user with hashed password
      const hashedPassword = await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
          role: userData.role, // Default role
        })
        .returning();

      // Log user in after registration
      req.login({ ...user, role: user.role as UserRole }, (err) => {
        if (err) return next(err);

        // Remove password from response
        const { password, ...userWithoutPassword } = user as User & {
          password?: string;
        };
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: Express.User | false,
        info: { message: string } | undefined
      ) => {
        if (err) return next(err);
        if (!user)
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });

        req.login(user, (err) => {
          if (err) return next(err);

          // Remove password from response
          const { password, ...userWithoutPassword } = user as User & {
            password?: string;
          };
          res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User & {
      password?: string;
    };
    res.json(userWithoutPassword);
  });
}
