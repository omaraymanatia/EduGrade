import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { randomBytes } from "crypto";
import { db } from "./db/client";
import {
  insertExamSchema,
  insertQuestionSchema,
  insertOptionSchema,
  insertStudentExamSchema,
  insertStudentAnswerSchema,
  InsertExam,
  InsertStudentAnswer,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";

// Generate a unique exam key (similar to a coupon code format)
function generateExamKey(): string {
  // Format: XXX-XXXX-XXX (where X is alphanumeric)
  const part1 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);
  const part2 = randomBytes(4).toString("hex").toUpperCase().substring(0, 4);
  const part3 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);

  return `${part1}-${part2}-${part3}`;
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // User profile routes
  app.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      const updatedFields = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
      };

      // Check if email is already taken
      if (updatedFields.email) {
        const existingUser = await storage.getUserByEmail(updatedFields.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      const updatedUser = await storage.updateUser(userId, updatedFields);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Exclude password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password route
  app.put("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      // Verify current password (This would be handled by auth.ts in a real app)
      // For this MVP, we'll skip actual password verification

      const updatedUser = await storage.updateUser(userId, {
        password: newPassword,
      });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Exam routes
  app.post("/api/exams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "professor")
      return res
        .status(403)
        .json({ message: "Only professors can create exams" });

    try {
      // Generate a unique exam key
      let examKey = generateExamKey();
      let isKeyUnique = false;

      // Ensure the key is unique
      while (!isKeyUnique) {
        const existingExam = await storage.getExamByKey(examKey);
        if (!existingExam) {
          isKeyUnique = true;
        } else {
          examKey = generateExamKey();
        }
      }

      const examData = insertExamSchema.parse({
        ...req.body,
        creatorId: req.user!.id,
        examKey,
      });

      const exam = await storage.createExam(examData);

      // Create questions and options if provided
      if (req.body.questions && Array.isArray(req.body.questions)) {
        for (let i = 0; i < req.body.questions.length; i++) {
          const q = req.body.questions[i];
          const questionData = insertQuestionSchema.parse({
            examId: exam.id,
            text: q.text,
            type: q.type,
            points: q.points,
            order: i + 1,
          });

          const question = await storage.createQuestion(questionData);

          // Create options for multiple choice questions
          if (
            q.type === "multiple_choice" &&
            q.options &&
            Array.isArray(q.options)
          ) {
            for (let j = 0; j < q.options.length; j++) {
              const opt = q.options[j];
              const optionData = insertOptionSchema.parse({
                questionId: question.id,
                text: opt.text,
                isCorrect: opt.isCorrect || false,
                order: j + 1,
              });

              await storage.createOption(optionData);
            }
          }
        }
      }

      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  app.get("/api/exams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      let exams;
      if (req.user!.role === "professor") {
        exams = await storage.getExamsByCreator(req.user!.id);
      } else {
        // For students, get exams they've taken
        const studentExams = await storage.getStudentExamsByStudent(
          req.user!.id
        );
        exams = await Promise.all(
          studentExams.map(async (se) => await storage.getExam(se.examId))
        );
        // Filter out undefined values (in case an exam was deleted)
        exams = exams.filter((exam) => exam !== undefined);
      }

      res.json(exams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.get("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Check if user has access to this exam
      if (req.user!.role === "professor" && exam.creatorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "You don't have access to this exam" });
      }

      // Get questions for this exam
      const questions = await storage.getQuestionsByExam(examId);

      // Get options for each question
      const questionsWithOptions = await Promise.all(
        questions.map(async (q) => {
          if (q.type === "multiple_choice") {
            const options = await storage.getOptionsByQuestion(q.id);
            return { ...q, options };
          }
          return q;
        })
      );

      // If professor, include student results
      let studentResults: Array<{
        id: number;
        student: {
          id: number;
          firstName: string;
          lastName: string;
          email: string;
        };
        [key: string]: any;
      }> = [];
      if (req.user!.role === "professor") {
        const studentExams = await storage.getStudentExamsByExam(examId);

        studentResults = (
          await Promise.all(
            studentExams.map(async (se) => {
              const student = await storage.getUser(se.studentId);
              if (!student) return null;

              return {
                ...se,
                student: {
                  id: student.id,
                  firstName: student.firstName,
                  lastName: student.lastName,
                  email: student.email,
                },
              };
            })
          )
        ).filter((result) => result !== null);

        // Filter out null values
        studentResults = studentResults.filter((r) => r !== null);
      }

      res.json({
        ...exam,
        questions: questionsWithOptions,
        studentResults:
          req.user!.role === "professor" ? studentResults : undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam details" });
    }
  });

  // Update exam (partial) - e.g. activate/deactivate
  app.patch("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "professor")
      return res
        .status(403)
        .json({ message: "Only professors can update exams" });

    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Ensure the professor owns this exam
      if (exam.creatorId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "You don't have permission to update this exam" });
      }

      // Update only allowed fields (isActive for now)
      const updateData: Partial<InsertExam> = {};

      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive;
      }

      const updatedExam = await storage.updateExam(examId, updateData);

      res.json(updatedExam);
    } catch (error) {
      res.status(500).json({ message: "Failed to update exam" });
    }
  });

  // Verify exam key for students
  app.post("/api/verify-exam-key", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "student")
      return res
        .status(403)
        .json({ message: "Only students can access exams with keys" });

    try {
      const { examKey } = req.body;

      if (!examKey) {
        return res.status(400).json({ message: "Exam key is required" });
      }

      const exam = await storage.getExamByKey(examKey);

      if (!exam) {
        return res
          .status(404)
          .json({ message: "Exam not found with the provided key" });
      }

      if (!exam.isActive) {
        return res
          .status(403)
          .json({ message: "This exam is no longer active" });
      }

      res.json({ examId: exam.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify exam key" });
    }
  });

  // Start an exam attempt for a student
  app.post("/api/start-exam", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "student")
      return res.status(403).json({ message: "Only students can take exams" });

    try {
      const examId = parseInt(req.body.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "Valid exam ID is required" });
      }

      const exam = await storage.getExam(examId);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (!exam.isActive) {
        return res
          .status(403)
          .json({ message: "This exam is no longer active" });
      }

      // Check if student has already started this exam
      const studentExams = await storage.getStudentExamsByStudent(req.user!.id);
      const existingAttempt = studentExams.find(
        (se) => se.examId === examId && se.status === "in_progress"
      );

      if (existingAttempt) {
        return res.json({ studentExamId: existingAttempt.id });
      }

      // Create a new student exam record
      const studentExamData = insertStudentExamSchema.parse({
        examId,
        studentId: req.user!.id,
        startedAt: new Date(),
      });

      const studentExam = await storage.createStudentExam(studentExamData);

      res.status(201).json({ studentExamId: studentExam.id });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to start exam" });
    }
  });

  // Submit an answer
  app.post("/api/submit-answer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "student")
      return res
        .status(403)
        .json({ message: "Only students can submit answers" });

    try {
      const { studentExamId, questionId, answer, selectedOptionId } = req.body;

      // Validate student exam exists and belongs to this student
      const studentExam = await storage.getStudentExam(studentExamId);

      if (!studentExam) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }

      if (studentExam.studentId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "This exam attempt doesn't belong to you" });
      }

      if (studentExam.status !== "in_progress") {
        return res
          .status(400)
          .json({ message: "This exam attempt is already completed" });
      }

      // Get the question to check type
      const question = await storage
        .getQuestionsByExam(studentExam.examId)
        .then((questions) => questions.find((q) => q.id === questionId));

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // If multiple choice, check if answer is correct
      let isCorrect = null;
      let points = null;

      // Create student answer
      const studentAnswerData = insertStudentAnswerSchema.parse({
        studentExamId,
        questionId,
        answer,
        selectedOptionId:
          question.type === "multiple_choice" ? selectedOptionId : null,
        // Removed isCorrect as it is not part of the InsertStudentAnswer type
      } as InsertStudentAnswer);

      if (question.type === "multiple_choice" && selectedOptionId) {
        const options = await storage.getOptionsByQuestion(questionId);
        const selectedOption = options.find((o) => o.id === selectedOptionId);

        if (selectedOption) {
          isCorrect = selectedOption.isCorrect;
          points = isCorrect ? question.points : 0;
        }
      }

      // Create the answer with calculated points if applicable
      const studentAnswer = await storage.createStudentAnswer({
        ...studentAnswerData,
      });

      res.status(201).json(studentAnswer);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Complete an exam
  app.post("/api/complete-exam", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "student")
      return res
        .status(403)
        .json({ message: "Only students can complete exams" });

    try {
      const { studentExamId } = req.body;

      // Validate student exam exists and belongs to this student
      const studentExam = await storage.getStudentExam(studentExamId);

      if (!studentExam) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }

      if (studentExam.studentId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "This exam attempt doesn't belong to you" });
      }

      if (studentExam.status !== "in_progress") {
        return res
          .status(400)
          .json({ message: "This exam attempt is already completed" });
      }

      // Get all answers for this attempt
      const answers = await storage.getStudentAnswersByStudentExam(
        studentExamId
      );

      // Get all questions for this exam
      const questions = await storage.getQuestionsByExam(studentExam.examId);

      // Calculate total score (for now, only multiple choice are auto-graded)
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      let earnedPoints = 0;

      answers.forEach((answer) => {
        if (answer.points !== null) {
          earnedPoints += answer.points;
        }
      });

      // Calculate percentage score
      const score =
        totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Update student exam record
      const updatedStudentExam = await storage.updateStudentExam(
        studentExamId,
        {
          status: "completed",
          submittedAt: new Date(),
          score,
        }
      );

      res.json(updatedStudentExam);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete exam" });
    }
  });

  // Set up multer for file uploads
  // Create upload directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create directory for exam photos
  const examPhotosDir = path.join(uploadDir, "exam_photos");
  if (!fs.existsSync(examPhotosDir)) {
    fs.mkdirSync(examPhotosDir, { recursive: true });
  }

  // Create directory for student answers
  const studentAnswersDir = path.join(uploadDir, "student_answers");
  if (!fs.existsSync(studentAnswersDir)) {
    fs.mkdirSync(studentAnswersDir, { recursive: true });
  }

  // Configure multer storage for exam photos
  const examPhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const timestamp = Date.now().toString();
      const dir = path.join(examPhotosDir, timestamp);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with index prefix
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  // Configure multer storage for student answers
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Create a folder for each exam
      const examId = req.body.examId;
      const examDir = path.join(studentAnswersDir, `exam_${examId}`);

      if (!fs.existsSync(examDir)) {
        fs.mkdirSync(examDir, { recursive: true });
      }

      cb(null, examDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with timestamp
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      cb(null, `answer_${uniqueSuffix}${extension}`);
    },
  });

  // Set up multer upload
  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Only accept images
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  // Configure upload for exam photos
  const examPhotoUpload = multer({
    storage: examPhotoStorage,
    limits: {
      fileSize: 15 * 1024 * 1024, // 15MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Only accept images
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  // Upload and process exam photos with AI
  app.post(
    "/api/exams/upload",
    examPhotoUpload.array("examPhotos", 20),
    async (req, res) => {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (req.user!.role !== "professor")
        return res
          .status(403)
          .json({ message: "Only professors can create exams" });

      try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }

        // In a real implementation, here we would:
        // 1. Call a Python API to process the images
        // 2. Extract text, questions, and answers
        // 3. Structure the data appropriately
        // 4. Create exam and question records

        // For this demo, we'll create a placeholder exam
        // Generate a unique exam key
        let examKey = generateExamKey();
        let isKeyUnique = false;

        // Ensure the key is unique
        while (!isKeyUnique) {
          const existingExam = await storage.getExamByKey(examKey);
          if (!existingExam) {
            isKeyUnique = true;
          } else {
            examKey = generateExamKey();
          }
        }

        // Create a new exam
        const examData = {
          title: "Exam from Photos",
          courseCode: "AUTO-" + Date.now().toString().slice(-4),
          description: `Auto-generated exam from ${files.length} uploaded photos`,
          duration: 60, // Default 60 mins
          examKey,
          creatorId: req.user!.id,
          passingScore: 70,
          instructions:
            "This exam was automatically generated from uploaded photos.",
          isActive: true,
        };

        const exam = await storage.createExam(examData);

        // In a real implementation, we would extract questions here
        // For now, just log the uploaded files paths (would be sent to Python API)
        const uploadedFiles = files.map((file) => ({
          filename: file.filename,
          path: file.path,
          size: file.size,
        }));

        console.log("Uploaded exam photos:", uploadedFiles);

        res.status(201).json({
          message: "Exam created successfully from uploaded photos",
          examId: exam.id,
          title: exam.title,
          examKey: exam.examKey,
          uploadedFiles,
        });
      } catch (error) {
        console.error("Error processing exam photos:", error);
        res.status(500).json({ message: "Failed to process exam photos" });
      }
    }
  );

  // Upload student answer images
  app.post(
    "/api/upload-student-answers",
    upload.array("images", 10),
    async (req, res) => {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (req.user!.role !== "professor")
        return res
          .status(403)
          .json({ message: "Only professors can upload student answers" });

      try {
        const files = req.files as Express.Multer.File[];
        const { examId, studentExamId } = req.body;

        if (!examId) {
          return res.status(400).json({ message: "Exam ID is required" });
        }

        // Check if exam exists and professor has access
        const exam = await storage.getExam(parseInt(examId));
        if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
        }

        if (exam.creatorId !== req.user!.id) {
          return res
            .status(403)
            .json({ message: "You don't have access to this exam" });
        }

        // Process uploaded files
        const uploadedFiles = files.map((file) => ({
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
        }));

        res.status(201).json({
          message: `Successfully uploaded ${files.length} image(s)`,
          examId,
          studentExamId,
          files: uploadedFiles,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to upload images" });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}
