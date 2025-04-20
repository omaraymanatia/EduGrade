import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

// Extend Express.User to include role
declare global {
  namespace Express {
    interface User {
      id: number;
      role: UserRole;
    }
  }
}
import { setupAuth } from "./auth";
import { randomBytes } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";

import { db } from "../shared/index";
import { comparePasswords, hashPassword } from "./utils/passwordUtils.ts";
import {
  insertExamSchema,
  insertQuestionSchema,
  insertOptionSchema,
  insertStudentExamSchema,
  insertStudentAnswerSchema,
  InsertExam,
  InsertStudentAnswer,
  users,
  exams,
  questions,
  options,
  studentExams,
  studentAnswers,
  UserRole,
  AttemptStatus,
  QuestionType,
} from "@shared/schema";

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
      const userId = (req.user as { id: number }).id;
      const updatedFields = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
      };

      // Check if email is already taken
      if (updatedFields.email) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, updatedFields.email))
          .limit(1);

        if (existingUser.length > 0 && existingUser[0].id !== Number(userId)) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Update user profile in the database
      const updatedUser = await db
        .update(users)
        .set(updatedFields)
        .where(eq(users.id, Number(userId)))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Exclude password from response
      const { password, ...userWithoutPassword } = updatedUser[0];
      res.json(userWithoutPassword);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password route
  app.put("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = (req.user as { id: number }).id;
      const { currentPassword, newPassword } = req.body;

      // Fetch the user from the database
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(userId)))
        .limit(1);

      if (!user || !user[0]) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingPassword = user[0].password;

      // Compare the current password with the stored one
      const isPasswordValid = await comparePasswords(
        currentPassword,
        existingPassword
      );
      if (!isPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the password in the database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, Number(userId)))
        .returning();

      if (!updatedUser || !updatedUser[0]) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while updating the password" });
    }
  });

  // Exam routes
  app.post("/api/exams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if ((req.user as { role: UserRole }).role !== UserRole.enum.professor)
      return res
        .status(403)
        .json({ message: "Only professors can create exams" });

    try {
      // Generate a unique exam key
      let examKey = generateExamKey();
      let isKeyUnique = false;

      // Ensure the key is unique
      while (!isKeyUnique) {
        const existingExam = await db
          .select()
          .from(exams)
          .where(eq(exams.examKey, examKey))
          .limit(1);
        if (!existingExam.length) {
          isKeyUnique = true;
        } else {
          examKey = generateExamKey();
        }
      }

      // Parse and validate exam data using the schema
      const examData = insertExamSchema.parse({
        ...req.body,
        creatorId: (req.user as { id: number }).id,
        examKey,
      });

      // Create the exam
      const [exam] = await db.insert(exams).values(examData).returning();

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

          const [question] = await db
            .insert(questions)
            .values(questionData)
            .returning();

          // Create options for multiple choice questions
          if (
            q.type === QuestionType.enum.multiple_choice &&
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

              await db.insert(options).values(optionData);
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
      console.error(error);
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  app.get("/api/exams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      let userExams;

      if ((req.user as { role: UserRole }).role === UserRole.enum.professor) {
        // Fetch exams created by the professor
        userExams = await db
          .select()
          .from(exams)
          .where(eq(exams.creatorId, (req.user as { id: number }).id));
      } else {
        // Fetch exams the student has taken
        const studentAttempts = await db
          .select()
          .from(studentExams)
          .where(eq(studentExams.studentId, (req.user as { id: number }).id));

        const examIds = studentAttempts.map((se) => se.examId);
        userExams = await db
          .select()
          .from(exams)
          .where(inArray(exams.id, examIds));
      }

      res.json(userExams);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  // Get exam details
  app.get("/api/exams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const examId = parseInt(req.params.id);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "Invalid exam ID" });
      }

      // Get the exam details
      const exam = await db
        .select()
        .from(exams)
        .where(eq(exams.id, examId))
        .then((rows) => rows[0]);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Check permissions
      if (
        (req.user as { id: number; role: UserRole }).role ===
          UserRole.enum.professor &&
        exam.creatorId !== (req.user as { id: number }).id
      ) {
        return res
          .status(403)
          .json({ message: "You don't have access to this exam" });
      }

      // Get questions
      const examQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, examId))
        .orderBy(questions.order);

      // Get options for multiple choice questions
      const questionsWithOptions = await Promise.all(
        examQuestions.map(async (q) => {
          if (q.type === QuestionType.enum.multiple_choice) {
            const questionOptions = await db
              .select()
              .from(options)
              .where(eq(options.questionId, q.id))
              .orderBy(options.order);
            return { ...q, options: questionOptions };
          }
          return q;
        })
      );

      // Get student results if professor
      let studentResults: {
        id: number;
        studentId: number;
        examId: number;
        status: string;
        submittedAt?: Date;
        score?: number;
        student: {
          id: number;
          firstName: string;
          lastName: string;
          email: string;
        };
      }[] = [];
      if ((req.user as { role: UserRole }).role === UserRole.enum.professor) {
        const attempts = await db
          .select()
          .from(studentExams)
          .where(eq(studentExams.examId, examId));

        studentResults = await Promise.all(
          attempts.map(async (attempt) => {
            const student = await db
              .select()
              .from(users)
              .where(eq(users.id, attempt.studentId))
              .then((rows) => rows[0]);

            return {
              ...attempt,
              submittedAt: attempt.submittedAt || undefined,
              score: attempt.score ?? undefined,
              student: {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
              },
            };
          })
        );
      }

      res.json({
        ...exam,
        questions: questionsWithOptions,
        studentResults:
          req.user!.role === UserRole.enum.professor
            ? studentResults
            : undefined,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch exam details" });
    }
  });

  // Verify exam key for students
  app.post("/api/verify-exam-key", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== UserRole.enum.student)
      return res
        .status(403)
        .json({ message: "Only students can access exams with keys" });

    try {
      const { examKey } = req.body;

      if (!examKey) {
        return res.status(400).json({ message: "Exam key is required" });
      }

      const exam = await db
        .select()
        .from(exams)
        .where(eq(exams.examKey, examKey))
        .then((rows) => rows[0]);

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
    if (req.user!.role !== UserRole.enum.student)
      return res.status(403).json({ message: "Only students can take exams" });

    try {
      const examId = parseInt(req.body.examId);

      if (isNaN(examId)) {
        return res.status(400).json({ message: "Valid exam ID is required" });
      }

      const exam = await db
        .select()
        .from(exams)
        .where(eq(exams.id, examId))
        .then((rows) => rows[0]);

      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (!exam.isActive) {
        return res
          .status(403)
          .json({ message: "This exam is no longer active" });
      }

      // Check for existing attempt
      const existingAttempt = await db
        .select()
        .from(studentExams)
        .where(
          and(
            eq(studentExams.studentId, req.user!.id),
            eq(studentExams.examId, examId),
            eq(studentExams.status, AttemptStatus.enum.in_progress)
          )
        )
        .then((rows) => rows[0]);

      if (existingAttempt) {
        return res.json({ studentExamId: existingAttempt.id });
      }

      // Create new attempt
      const studentExamData = insertStudentExamSchema.parse({
        examId,
        studentId: req.user!.id,
        status: AttemptStatus.enum.in_progress,
      });

      const [studentExam] = await db
        .insert(studentExams)
        .values(studentExamData)
        .returning();

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
    if (req.user!.role !== UserRole.enum.student)
      return res
        .status(403)
        .json({ message: "Only students can submit answers" });

    try {
      const { studentExamId, questionId, answer, selectedOptionId } = req.body;

      // Validate student exam
      const studentExam = await db
        .select()
        .from(studentExams)
        .where(eq(studentExams.id, studentExamId))
        .then((rows) => rows[0]);

      if (!studentExam) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }

      if (studentExam.studentId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "This exam attempt doesn't belong to you" });
      }

      if (studentExam.status !== AttemptStatus.enum.in_progress) {
        return res
          .status(400)
          .json({ message: "This exam attempt is already completed" });
      }

      // Get question
      const question = await db
        .select()
        .from(questions)
        .where(eq(questions.id, questionId))
        .then((rows) => rows[0]);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // For multiple choice, check correctness
      let isCorrect = null;
      let points = null;

      if (
        question.type === QuestionType.enum.multiple_choice &&
        selectedOptionId
      ) {
        const option = await db
          .select()
          .from(options)
          .where(eq(options.id, selectedOptionId))
          .then((rows) => rows[0]);

        if (option) {
          isCorrect = option.isCorrect;
          points = isCorrect ? question.points : 0;
        }
      }

      // Create answer
      const studentAnswerData = insertStudentAnswerSchema.parse({
        studentExamId,
        questionId,
        answer,
        selectedOptionId,
      });

      const [studentAnswer] = await db
        .insert(studentAnswers)
        .values({
          ...studentAnswerData,
          isCorrect,
          points,
        })
        .returning();

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
    if (req.user!.role !== UserRole.enum.student)
      return res
        .status(403)
        .json({ message: "Only students can complete exams" });

    try {
      const { studentExamId } = req.body;

      // Validate student exam
      const studentExam = await db
        .select()
        .from(studentExams)
        .where(eq(studentExams.id, studentExamId))
        .then((rows) => rows[0]);

      if (!studentExam) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }

      if (studentExam.studentId !== req.user!.id) {
        return res
          .status(403)
          .json({ message: "This exam attempt doesn't belong to you" });
      }

      if (studentExam.status !== AttemptStatus.enum.in_progress) {
        return res
          .status(400)
          .json({ message: "This exam attempt is already completed" });
      }

      // Get all answers
      const answers = await db
        .select()
        .from(studentAnswers)
        .where(eq(studentAnswers.studentExamId, studentExamId));

      // Get all questions
      const examQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, studentExam.examId));

      // Calculate score
      const totalPoints = examQuestions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = answers.reduce((sum, a) => sum + (a.points || 0), 0);
      const score =
        totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Update attempt
      const [updatedAttempt] = await db
        .update(studentExams)
        .set({
          status: AttemptStatus.enum.completed,
          submittedAt: new Date(),
          score,
        })
        .where(eq(studentExams.id, studentExamId))
        .returning();

      res.json(updatedAttempt);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete exam" });
    }
  });

  // Set up multer for file uploads
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const examPhotosDir = path.join(uploadDir, "exam_photos");
  if (!fs.existsSync(examPhotosDir)) {
    fs.mkdirSync(examPhotosDir, { recursive: true });
  }

  const studentAnswersDir = path.join(uploadDir, "student_answers");
  if (!fs.existsSync(studentAnswersDir)) {
    fs.mkdirSync(studentAnswersDir, { recursive: true });
  }

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
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const examId = req.body.examId;
      const examDir = path.join(studentAnswersDir, `exam_${examId}`);

      if (!fs.existsSync(examDir)) {
        fs.mkdirSync(examDir, { recursive: true });
      }

      cb(null, examDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname);
      cb(null, `answer_${uniqueSuffix}${extension}`);
    },
  });

  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  const examPhotoUpload = multer({
    storage: examPhotoStorage,
    limits: {
      fileSize: 15 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
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
      if (req.user!.role !== UserRole.enum.professor)
        return res
          .status(403)
          .json({ message: "Only professors can create exams" });

      try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }

        // Generate exam key
        let examKey = generateExamKey();
        let isKeyUnique = false;

        while (!isKeyUnique) {
          const existingExam = await db
            .select()
            .from(exams)
            .where(eq(exams.examKey, examKey))
            .then((rows) => rows[0]);
          if (!existingExam) {
            isKeyUnique = true;
          } else {
            examKey = generateExamKey();
          }
        }

        // Create exam
        const examData = {
          title: "Exam from Photos",
          courseCode: "AUTO-" + Date.now().toString().slice(-4),
          description: `Auto-generated exam from ${files.length} uploaded photos`,
          duration: 60,
          examKey,
          creatorId: req.user!.id,
          passingScore: 70,
          instructions:
            "This exam was automatically generated from uploaded photos.",
          isActive: true,
        };

        const [exam] = await db.insert(exams).values(examData).returning();

        // Log uploaded files
        const uploadedFiles = files.map((file) => ({
          filename: file.filename,
          path: file.path,
          size: file.size,
        }));

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
      if (req.user!.role !== UserRole.enum.professor)
        return res
          .status(403)
          .json({ message: "Only professors can upload student answers" });

      try {
        const files = req.files as Express.Multer.File[];
        const { examId } = req.body;

        if (!examId) {
          return res.status(400).json({ message: "Exam ID is required" });
        }

        // Check exam access
        const exam = await db
          .select()
          .from(exams)
          .where(eq(exams.id, parseInt(examId)))
          .then((rows) => rows[0]);

        if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
        }

        if (exam.creatorId !== req.user!.id) {
          return res
            .status(403)
            .json({ message: "You don't have access to this exam" });
        }

        // Process files
        const uploadedFiles = files.map((file) => ({
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
        }));

        res.status(201).json({
          message: `Successfully uploaded ${files.length} image(s)`,
          examId,
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
