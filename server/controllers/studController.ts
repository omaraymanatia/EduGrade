import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq, and, inArray } from "drizzle-orm";

import AppError from "../utils/appError";
import catchAsync from "../utils/catchAsync";
import { db } from "@shared/index";
import {
  exams,
  questions,
  options,
  studentExams,
  studentAnswers,
  insertStudentExamSchema,
  insertStudentAnswerSchema,
  AttemptStatus,
  QuestionType,
  User,
} from "@shared/schema";

import { getUserFromRequest } from "./authController";
import { gradeExam } from "../utils/gradeExam";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const verifyExamKey = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { examKey } = req.body;

    if (!examKey) {
      return next(new AppError("Exam key is required", 400));
    }

    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.examKey, examKey))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found with the provided key", 404));
    }

    if (!exam.isActive) {
      return next(new AppError("This exam is no longer active", 403));
    }

    res.json({ examId: exam.id });
  }
);

export const startExam = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const examId = parseInt(req.body.examId);

    if (isNaN(examId)) {
      return next(new AppError("Valid exam ID is required", 400));
    }

    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    if (!exam.isActive) {
      return next(new AppError("This exam is no longer active", 403));
    }

    const user = await getUserFromRequest(req);

    // Check for existing attempt
    const existingAttempt = await db
      .select()
      .from(studentExams)
      .where(
        and(
          eq(studentExams.studentId, user.id),
          eq(studentExams.examId, examId),
          eq(studentExams.status, AttemptStatus.enum.in_progress)
        )
      )
      .then((rows) => rows[0]);

    if (existingAttempt) {
      res.json({ studentExamId: existingAttempt.id });
      return;
    }

    // Create new attempt
    const studentExamData = insertStudentExamSchema.parse({
      examId,
      studentId: user.id,
      status: AttemptStatus.enum.in_progress,
    });

    const [studentExam] = await db
      .insert(studentExams)
      .values(studentExamData)
      .returning();

    res.status(201).json({ studentExamId: studentExam.id });
  }
);

export const submitAnswer = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { studentExamId, questionId, answer, selectedOptionId } = req.body;

    // Validate student exam
    const studentExam = await db
      .select()
      .from(studentExams)
      .where(eq(studentExams.id, studentExamId))
      .then((rows) => rows[0]);

    if (!studentExam) {
      return next(new AppError("Exam attempt not found", 404));
    }
    const user = await getUserFromRequest(req);
    if (studentExam.studentId !== user.id) {
      return next(new AppError("This exam attempt doesn't belong to you", 403));
    }

    if (studentExam.status !== AttemptStatus.enum.in_progress) {
      return next(new AppError("This exam attempt is already completed", 400));
    }

    // Get question
    const question = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .then((rows) => rows[0]);

    if (!question) {
      return next(new AppError("Question not found", 404));
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
  }
);

export const completeExam = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { studentExamId } = req.body;

    // Validate student exam
    const studentExam = await db
      .select()
      .from(studentExams)
      .where(eq(studentExams.id, studentExamId))
      .then((rows) => rows[0]);

    if (!studentExam) {
      return next(new AppError("Exam attempt not found", 404));
    }

    const user = await getUserFromRequest(req);

    if (studentExam.studentId !== user.id) {
      return next(new AppError("This exam attempt doesn't belong to you", 403));
    }

    if (studentExam.status !== AttemptStatus.enum.in_progress) {
      return next(new AppError("This exam attempt is already completed", 400));
    }

    console.log("Starting grading for studentExamId:", studentExamId);
    try {
      // Call gradeExam function to grade the exam and get the updated record directly
      await new Promise((resolve) => setTimeout(resolve, 100));

      const updatedAttempt = await gradeExam(studentExamId);

      if (!updatedAttempt) {
        console.log(
          "Graded but couldn't get updated record, fetching manually"
        );
        // Fallback to fetching the record if needed
        const fetched = await db
          .select()
          .from(studentExams)
          .where(eq(studentExams.id, studentExamId))
          .then((rows) => rows[0]);

        res.json(fetched);
      } else {
        res.json(updatedAttempt);
      }
    } catch (error) {
      console.error("Error during exam grading:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return next(new AppError("Failed to grade exam: " + errorMessage, 500));
    }
  }
);
