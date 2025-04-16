import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { aiTextDetection } from "./models/aiDetection";
import { AiTextAnalysis, aiTextAnalysisSchema } from "@shared/schema";
import { z } from "zod";

// Middleware to check authentication
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check role
const hasRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (userRoles.includes(req.user?.role)) {
      return next();
    }
    
    res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // API Routes
  // Submissions routes
  app.get("/api/submissions", isAuthenticated, async (req, res, next) => {
    try {
      let submissions;
      if (req.user?.role === "professor" || req.user?.role === "admin") {
        submissions = await storage.getAllSubmissions();
      } else {
        submissions = await storage.getSubmissionsByStudentId(req.user!.id);
      }
      res.json(submissions);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/submissions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const submission = await storage.getSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Check if user is authorized to view this submission
      if (req.user?.role !== "professor" && req.user?.role !== "admin" && submission.studentId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(submission);
    } catch (error) {
      next(error);
    }
  });

  // Exams routes
  app.get("/api/exams", isAuthenticated, async (req, res, next) => {
    try {
      if (req.user?.role === "professor") {
        const exams = await storage.getExamsByProfessorId(req.user.id);
        res.json(exams);
      } else if (req.user?.role === "admin") {
        const exams = await storage.getAllExams();
        res.json(exams);
      } else {
        // For students, get all exams they can take
        const exams = await storage.getExamsForStudent();
        res.json(exams);
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/exams", hasRole("professor"), async (req, res, next) => {
    try {
      const exam = await storage.createExam({
        ...req.body,
        professorId: req.user!.id
      });
      res.status(201).json(exam);
    } catch (error) {
      next(error);
    }
  });

  // AI Text Detection
  app.post("/api/detect", isAuthenticated, async (req, res, next) => {
    try {
      // Validate request body
      const validationResult = aiTextAnalysisSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors,
        });
      }
      
      const { text, sensitivity } = validationResult.data;
      
      // Call AI detection
      const result = await aiTextDetection(text, sensitivity);
      
      // Log the detection
      await storage.createAiDetectionLog({
        userId: req.user!.id,
        text,
        result,
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard stats
  app.get("/api/stats", isAuthenticated, async (req, res, next) => {
    try {
      // Role-specific stats
      if (req.user?.role === "professor") {
        const totalExams = await storage.countExamsByProfessorId(req.user.id);
        const totalStudents = await storage.countUniqueStudentsForProfessor(req.user.id);
        const totalDetections = await storage.countAiDetectionsForProfessor(req.user.id);
        const recentSubmissions = await storage.getRecentSubmissionsForProfessor(req.user.id, 5);
        
        res.json({
          totalExams,
          totalStudents,
          totalDetections,
          recentSubmissions
        });
      } else if (req.user?.role === "student") {
        const submissions = await storage.countSubmissionsByStudentId(req.user.id);
        const grades = await storage.getStudentGrades(req.user.id);
        
        res.json({
          totalSubmissions: submissions,
          grades
        });
      } else if (req.user?.role === "admin") {
        const totalUsers = await storage.countUsers();
        const totalExams = await storage.countExams();
        const totalSubmissions = await storage.countSubmissions();
        
        res.json({
          totalUsers,
          totalExams,
          totalSubmissions
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Users management (admin only)
  app.get("/api/users", hasRole("admin"), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  // Settings
  app.get("/api/settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.getUserSettings(req.user!.id);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/settings", isAuthenticated, async (req, res, next) => {
    try {
      const settings = await storage.updateUserSettings(req.user!.id, req.body);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
