import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq, and, inArray } from "drizzle-orm";

import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { db } from "@shared/index";
import {
  users,
  exams,
  questions,
  options,
  studentExams,
  insertExamSchema,
  insertQuestionSchema,
  insertOptionSchema,
  UserRole,
  QuestionType,
  User,
} from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

import { getUserFromRequest } from "./authController";

function generateExamKey(): string {
  // Format: XXX-XXXX-XXX (where X is alphanumeric)
  const part1 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);
  const part2 = randomBytes(4).toString("hex").toUpperCase().substring(0, 4);
  const part3 = randomBytes(3).toString("hex").toUpperCase().substring(0, 3);

  return `${part1}-${part2}-${part3}`;
}

export const getAllExams = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);

    let userExams;

    if (user.role === UserRole.enum.professor) {
      // Fetch exams created by the professor
      userExams = await db
        .select()
        .from(exams)
        .where(eq(exams.creatorId, user.id));
    } else {
      // Fetch exams the student has taken
      const studentAttempts = await db
        .select()
        .from(studentExams)
        .where(eq(studentExams.studentId, user.id));

      const examIds = studentAttempts.map((se) => se.examId);
      userExams = await db
        .select()
        .from(exams)
        .where(inArray(exams.id, examIds));
    }

    res.json(userExams);
  }
);

export const getExamByID = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return next(new AppError("Invalid exam ID", 400));
    }

    const user = await getUserFromRequest(req);

    // Get the exam details
    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    // Check permissions
    if (user.role === UserRole.enum.professor && exam.creatorId !== user.id) {
      return next(new AppError("You don't have access to this exam", 403));
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

    if (user.role === UserRole.enum.professor) {
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
        user.role === UserRole.enum.professor ? studentResults : undefined,
    });
  }
);

export const createExam = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);

    let examKey = generateExamKey();
    let isKeyUnique = false;

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
      creatorId: user.id,
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
  }
);

export const upload = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return next(new AppError("No files uploaded", 400));
    }

    const user = await getUserFromRequest(req);

    // Generate unique exam key
    let examKey = generateExamKey();
    while (true) {
      const existing = await db
        .select()
        .from(exams)
        .where(eq(exams.examKey, examKey))
        .then((rows) => rows[0]);
      if (!existing) break;
      examKey = generateExamKey();
    }

    // Construct exam data
    const examData = {
      title: "Exam from Photos",
      courseCode: "AUTO-" + Date.now().toString().slice(-4),
      description: `Auto-generated exam from ${files.length} uploaded photos`,
      duration: 60,
      examKey,
      creatorId: user.id,
      passingScore: 70,
      instructions:
        "This exam was automatically generated from uploaded photos.",
      isActive: true,
    };

    const [exam] = await db.insert(exams).values(examData).returning();

    // Prepare uploaded files metadata
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
  }
);

export const uploadStudentAnswers = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    const examId = parseInt(req.body.examId);

    if (isNaN(examId)) {
      return next(new AppError("Valid exam ID is required", 400));
    }

    const user = await getUserFromRequest(req);

    // Validate exam existence and access
    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    if (exam.creatorId !== user.id) {
      return next(new AppError("You don't have access to this exam", 403));
    }

    if (!files || files.length === 0) {
      return next(new AppError("No files uploaded", 400));
    }

    // Log uploaded file details
    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(201).json({
      message: `Successfully uploaded ${files.length} file(s)`,
      examId,
      files: uploadedFiles,
    });
  }
);
