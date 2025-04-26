import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

import { randomBytes } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { upload } from "./utils/multer";

import * as authController from "./controllers/authController";
import * as profController from "./controllers/profController";
import * as studController from "./controllers/studController";

export function registerRoutes(app: Express): Server {
  app.post("/api/register", authController.signup);
  app.post("/api/login", authController.login);

  app.use(authController.protect);
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
  app.post("/api/exams/upload", upload.array("files"), profController.upload);

  // Upload student answer images
  app.post(
    "/api/upload-student-answers",
    upload.array("files"),
    profController.uploadStudentAnswers
  );

  const httpServer = createServer(app);
  return httpServer;
}
