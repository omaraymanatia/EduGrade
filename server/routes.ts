import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

import { setupAuth } from "./auth";
import { randomBytes } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";

import * as authController from "./controllers/authController";
import * as profController from "./controllers/profController";
import * as studController from "./controllers/studController";

// Generate a unique exam key (similar to a coupon code format)
function generateExamKey(): string {
  // Format: XXX-XXXX-XXX (where X is alphanumeric)
  const part1 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);
  const part2 = randomBytes(4).toString("hex").toUpperCase().substring(0, 4);
  const part3 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);

  return `${part1}-${part2}-${part3}`;
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes (/api/register, /api/login, /api/logout)
  setupAuth(app);

  //app.use(authController.protect);
  // User profile routes
  app.put("/api/profile", authController.profile);
  // Change password route
  app.put("/api/change-password", authController.updatePassword);

  // Exam routes
  app.post("/api/exams", profController.createExam);

  app.get("/api/exams", profController.getAllExams);

  // Get exam details
  app.get("/api/exams/:id", profController.getExamByID);

  // Verify exam key for students
  app.post("/api/verify-exam-key", studController.verifyExamKey);

  // Start an exam attempt for a student
  app.post("/api/start-exam", studController.startExam);

  // Submit an answer
  app.post("/api/submit-answer", studController.submitAnswer);

  // Complete an exam
  app.post("/api/complete-exam", studController.completeExam);

  // Upload and process exam photos with AI
  app.post("/api/exams/upload", profController.upload);

  // Upload student answer images
  app.post("/api/upload-student-answers", profController.uploadStudentAnswers);

  const httpServer = createServer(app);
  return httpServer;
}

// E08-55FC-8FB
