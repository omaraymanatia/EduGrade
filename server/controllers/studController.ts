import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq, and, inArray, count as drizzleCount, desc } from "drizzle-orm";

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

    // Check if an answer for this question already exists
    const existingAnswer = await db
      .select()
      .from(studentAnswers)
      .where(
        and(
          eq(studentAnswers.studentExamId, studentExamId),
          eq(studentAnswers.questionId, questionId)
        )
      )
      .then((rows) => rows[0]);

    // For multiple choice, check correctness and store answer as option identifier
    let isCorrect = null;
    let points = null;
    let formattedAnswer = answer;

    if (question.type === QuestionType.enum.multiple_choice) {
      if (selectedOptionId) {
        const option = await db
          .select()
          .from(options)
          .where(eq(options.id, selectedOptionId))
          .then((rows) => rows[0]);

        if (option) {
          // Convert option order to identifier (a, b, c, d) based on order property
          const optionIdentifiers = ["a", "b", "c", "d", "e", "f"];
          formattedAnswer =
            optionIdentifiers[option.order - 1] ||
            String.fromCharCode(96 + option.order);

          isCorrect =
            option.isCorrect || formattedAnswer === question.model_answer;
          points = isCorrect ? question.points : 0;
        } else {
          // Selected option not found
          formattedAnswer = null;
          isCorrect = false;
          points = 0;
        }
      } else if (answer) {
        // If selectedOptionId not provided but answer is, try to use answer directly
        // This assumes answer is already the identifier (a, b, c, d)
        formattedAnswer = answer;
        isCorrect = formattedAnswer === question.model_answer;
        points = isCorrect ? question.points : 0;
      } else {
        // No answer provided
        formattedAnswer = null;
        isCorrect = false;
        points = 0;
      }
    }

    let studentAnswer;

    // Use a transaction to ensure the answer is saved atomically
    await db.transaction(async (tx) => {
      if (existingAnswer) {
        // Update existing answer
        const [updatedAnswer] = await tx
          .update(studentAnswers)
          .set({
            answer: formattedAnswer,
            selectedOptionId,
            isCorrect,
            points,
          })
          .where(eq(studentAnswers.id, existingAnswer.id))
          .returning();

        studentAnswer = updatedAnswer;
        console.log("Updated existing answer:", updatedAnswer);
      } else {
        // Create new answer
        const studentAnswerData = insertStudentAnswerSchema.parse({
          studentExamId,
          questionId,
          answer: formattedAnswer, // Use the formatted answer (option identifier for MCQs)
          selectedOptionId,
        });

        const [newAnswer] = await tx
          .insert(studentAnswers)
          .values({
            ...studentAnswerData,
            isCorrect,
            points,
          })
          .returning();

        studentAnswer = newAnswer;
        console.log("Created new answer:", newAnswer);
      }
    });

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
      // Add a delay to ensure any in-flight answer submissions have completed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Double check that we have answers before grading
      const answerCount = await db
        .select({ count: drizzleCount() })
        .from(studentAnswers)
        .where(eq(studentAnswers.studentExamId, studentExamId))
        .then((rows) => rows[0]?.count || 0);

      console.log(
        `Found ${answerCount} answers to grade for exam ${studentExamId}`
      );

      if (answerCount === 0) {
        console.log("No answers found yet, marking as completed with 0 score");
        // If no answers, just mark as completed with 0 score
        const [updated] = await db
          .update(studentExams)
          .set({
            score: 0,
            AI_detected: 0,
            status: "completed",
            submittedAt: new Date(),
          })
          .where(eq(studentExams.id, studentExamId))
          .returning();

        res.json(updated);
        return;
      }

      // Call gradeExam function to grade the exam and get the updated record
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

// Add new endpoint to get exams with details
export const getStudentExams = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);

    // Fetch all student exams with their related exam data
    const studentExamsData = await db.query.studentExams.findMany({
      where: eq(studentExams.studentId, user.id),
      orderBy: (exams, { desc }) => [desc(exams.startedAt)],
      with: {
        exam: {
          columns: {
            id: true,
            title: true,
            courseCode: true,
          },
        },
      },
    });

    // Format the response to include exam title directly
    const formattedExams = studentExamsData.map((exam) => ({
      ...exam,
      examTitle: exam.exam.title,
      courseCode: exam.exam.courseCode,
    }));

    res.json(formattedExams);
  }
);

// Fix the getStudentExamById function to resolve the SQL syntax error
export const getStudentExamById = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return next(new AppError("Valid exam ID is required", 400));
    }

    const user = await getUserFromRequest(req);

    // Get the student exam attempt for this exam - fix the ordering syntax
    const studentExam = await db
      .select()
      .from(studentExams)
      .where(
        and(
          eq(studentExams.examId, examId),
          eq(studentExams.studentId, user.id)
        )
      )
      // Fix the ordering syntax
      .orderBy(desc(studentExams.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!studentExam) {
      return next(new AppError("No exam attempt found", 404));
    }

    // Get the exam details
    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    // Get the exam questions
    const examQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId))
      .orderBy(questions.order);

    // For completed exams, include answers
    let studentAnswersArr: any[] = [];
    if (studentExam.status === "completed") {
      studentAnswersArr = await db
        .select()
        .from(studentAnswers)
        .where(eq(studentAnswers.studentExamId, studentExam.id));
    }

    // Get options for multiple choice questions
    const questionIds = examQuestions.map((q) => q.id);
    const questionOptions =
      questionIds.length > 0
        ? await db
            .select()
            .from(options)
            .where(inArray(options.questionId, questionIds))
            .orderBy(options.order)
        : [];

    // Organize options by question ID
    const optionsByQuestionId = questionOptions.reduce((acc, option) => {
      if (!acc[option.questionId]) {
        acc[option.questionId] = [];
      }
      acc[option.questionId].push(option);
      return acc;
    }, {} as Record<number, typeof questionOptions>);

    // Format questions with their options
    const formattedQuestions = examQuestions.map((question) => ({
      ...question,
      options: optionsByQuestionId[question.id] || [],
    }));

    res.json({
      studentExam,
      exam: {
        ...exam,
        questions: formattedQuestions,
      },
      answers: studentAnswersArr,
    });
  }
);
