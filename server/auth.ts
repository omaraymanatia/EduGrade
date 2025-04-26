import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "../shared";
import { users, insertUserSchema, User, UserRole } from "../shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from "drizzle-orm";

import * as authController from "./controllers/authController";

const scryptAsync = promisify(scrypt);

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // User login with email instead of username

  app.post("/api/register", authController.signup);
  app.post("/api/login", authController.login);

  //app.post("/api/logout", authController.logout);
}
