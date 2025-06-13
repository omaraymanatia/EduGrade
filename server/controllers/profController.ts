import fs from "fs";
import path from "path";
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
import { VlmApiClient } from "../utils/vlmApiClient";
import { extractExamStructure } from "../utils/examPhotoProcessor";

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

        let model_answer: string | undefined = undefined;

        if (
          q.type === QuestionType.enum.multiple_choice &&
          Array.isArray(q.options)
        ) {
          // Find the correct option and use its index as the model_answer (a, b, c, d)
          const correctOptionIndex = q.options.findIndex(
            (opt: any) => opt.isCorrect
          );

          if (correctOptionIndex !== -1) {
            // Convert to a, b, c, d format based on index
            const optionIdentifiers = ["a", "b", "c", "d", "e", "f"];
            model_answer =
              optionIdentifiers[correctOptionIndex] ||
              String.fromCharCode(97 + correctOptionIndex); // Fallback to a, b, c, etc.
          } else {
            model_answer = ""; // fallback to empty string if no correct option
          }
        } else if (typeof q.modelAnswer === "string") {
          // For essay questions, use modelAnswer as is
          model_answer = q.modelAnswer;
        } else if (typeof q.model_answer === "string") {
          model_answer = q.model_answer;
        }

        console.log("Creating question:", model_answer);

        const questionData = insertQuestionSchema.parse({
          examId: exam.id,
          text: q.text,
          model_answer,
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

const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];

export const uploadExamPhotos = catchAsync(
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

    // Create directory to store files
    const timestamp = Date.now().toString();
    const examDir = path.join("uploads/exam_photos", timestamp);
    if (!fs.existsSync(examDir)) {
      fs.mkdirSync(examDir, { recursive: true });
    }

    // Move files into the exam folder and collect file paths
    const uploadedFiles = [];
    const filePaths = [];

    for (const file of files) {
      if (!allowedImageTypes.includes(file.mimetype)) {
        return next(
          new AppError(`Unsupported file type: ${file.originalname}`, 400)
        );
      }

      const targetPath = path.join(examDir, file.originalname);
      fs.renameSync(file.path, targetPath);

      uploadedFiles.push({
        filename: file.originalname,
        path: targetPath,
        size: file.size,
        mimetype: file.mimetype,
      });

      filePaths.push(targetPath);
    }

    try {
      console.log("Processing exam photos with VLM...");

      // Process image with VLM API - send only one file at a time
      const rawVlmResult = await VlmApiClient.processExamPhotos(filePaths);

      // Extract structured data from API response with fallbacks
      const processedExam = extractExamStructure(rawVlmResult);

      console.log(
        `Extracted ${processedExam.questions.length} questions from exam photo(s)`
      );

      // Log types of questions extracted
      const mcqCount = processedExam.questions.filter(
        (q) => q.type === "multiple_choice"
      ).length;
      const essayCount = processedExam.questions.filter(
        (q) => q.type === "essay"
      ).length;
      console.log(`Question types: ${mcqCount} MCQs, ${essayCount} essays`);

      // Construct exam data with processed information
      const examData = {
        title: processedExam.title,
        courseCode: processedExam.courseCode,
        description: processedExam.description,
        duration: processedExam.duration,
        examKey,
        creatorId: user.id,
        passingScore: processedExam.passingScore,
        instructions: processedExam.instructions,
        isActive: true,
      };

      // Create the exam in the database
      const [exam] = await db.insert(exams).values(examData).returning();
      console.log("Created exam in database with ID:", exam.id);

      // Create questions and options from processed data
      for (let i = 0; i < processedExam.questions.length; i++) {
        const q = processedExam.questions[i];

        // Ensure we have the correct question type
        const questionType =
          q.type === "multiple_choice"
            ? QuestionType.enum.multiple_choice
            : QuestionType.enum.essay;

        // Get model answer based on question type
        let modelAnswer = q.modelAnswer || "";
        if (questionType === QuestionType.enum.multiple_choice && q.options) {
          // For MCQs, use the correct option as model answer if not explicitly set
          if (!modelAnswer) {
            const correctOption = q.options.find((opt) => opt.isCorrect);
            if (correctOption) {
              modelAnswer = correctOption.text;
            }
          }
        }

        // Create the question in the database
        const questionData = {
          examId: exam.id,
          text: q.text,
          model_answer: modelAnswer,
          type: questionType,
          points: q.points,
          order: i + 1,
        };

        console.log(`Creating question ${i + 1}:`, {
          text: q.text.substring(0, 30) + "...",
          type: questionType,
          options: q.type === "multiple_choice" ? q.options.length : 0,
        });

        const [question] = await db
          .insert(questions)
          .values(questionData)
          .returning();

        console.log(`Created question ${i + 1} with ID:`, question.id);

        // Create options if it's a multiple choice question
        if (
          questionType === QuestionType.enum.multiple_choice &&
          q.options &&
          q.options.length
        ) {
          for (let j = 0; j < q.options.length; j++) {
            const opt = q.options[j];

            await db.insert(options).values({
              questionId: question.id,
              text: opt.text,
              isCorrect: opt.isCorrect || false,
              order: j + 1,
            });
          }
          console.log(
            `Added ${q.options.length} options for question ${i + 1}`
          );
        }
      }

      // Return the created exam with included upload information
      res.status(201).json({
        message: "Exam created successfully from uploaded photos",
        examId: exam.id,
        title: exam.title,
        examKey: exam.examKey,
        uploadedFiles,
        questionsCount: processedExam.questions.length,
        questionTypes: {
          multipleChoice: processedExam.questions.filter(
            (q) => q.type === "multiple_choice"
          ).length,
          essay: processedExam.questions.filter((q) => q.type === "essay")
            .length,
        },
      });
    } catch (error: any) {
      console.error("Error processing exam photos:", error);
      // Clean up the uploaded files on error
      try {
        fs.rmSync(examDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded files:", cleanupError);
      }

      return next(
        new AppError(`Failed to process exam photos: ${error.message}`, 500)
      );
    }
  }
);

export const uploadStudentAnswers = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    const examId = parseInt(req.body.examId);

    console.log("Exam ID:", req.body);
    console.log("Uploaded Files:", files); // Log the files to debug

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

    // Validate file types and optionally move to a permanent location
    const uploadedImages = [];

    for (const file of files) {
      if (!allowedImageTypes.includes(file.mimetype)) {
        // Optionally delete the uploaded invalid file
        fs.unlinkSync(file.path);
        return next(
          new AppError(`Unsupported file type: ${file.originalname}`, 400)
        );
      }

      // Optional: Rename or move file
      const targetPath = path.join("uploads/student_answers", file.filename); // create this folder if needed
      fs.renameSync(file.path, targetPath);

      uploadedImages.push({
        filename: file.filename,
        path: targetPath,
        size: file.size,
        mimetype: file.mimetype,
      });
    }

    res.status(201).json({
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      examId,
      files: uploadedImages,
    });
  }
);

export const deleteExam = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return next(new AppError("Invalid exam ID", 400));
    }

    const user = await getUserFromRequest(req);

    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    if (exam.creatorId !== user.id) {
      return next(
        new AppError("You don't have permission to delete this exam", 403)
      );
    }

    await db.delete(exams).where(eq(exams.id, examId));

    res.status(204).json({
      status: "success",
      message: "Exam deleted successfully",
    });
  }
);

export const updateExam = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const examId = parseInt(req.params.id);

    if (isNaN(examId)) {
      return next(new AppError("Invalid exam ID", 400));
    }

    // Log the incoming request body for debugging
    console.log(
      "Received update request with data:",
      JSON.stringify(req.body, null, 2)
    );

    const user = await getUserFromRequest(req);

    // Check if exam exists and user has permissions
    const exam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .then((rows) => rows[0]);

    if (!exam) {
      return next(new AppError("Exam not found", 404));
    }

    if (exam.creatorId !== user.id) {
      return next(
        new AppError("You don't have permission to update this exam", 403)
      );
    }

    // Process questions and track changes
    let questionsUpdated = false;
    let instructionsUpdated = false;

    // Update exam instructions if provided
    if (
      req.body.instructions !== undefined &&
      req.body.instructions !== exam.instructions
    ) {
      await db
        .update(exams)
        .set({ instructions: req.body.instructions })
        .where(eq(exams.id, examId));

      instructionsUpdated = true;
    }

    // Process questions if provided
    if (req.body.questions && Array.isArray(req.body.questions)) {
      questionsUpdated = true;

      // Get existing questions and options for comparison and efficient updates
      const existingQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, examId));

      const existingQuestionMap = new Map(
        existingQuestions.map((q) => [q.id, q])
      );

      // Get all existing options for this exam's questions
      const existingOptions = await db
        .select()
        .from(options)
        .where(
          inArray(
            options.questionId,
            existingQuestions.map((q) => q.id)
          )
        );

      // Group options by question ID for efficient access
      const optionsByQuestionId = existingOptions.reduce((acc, opt) => {
        if (!acc[opt.questionId]) acc[opt.questionId] = [];
        acc[opt.questionId].push(opt);
        return acc;
      }, {} as Record<number, typeof existingOptions>);

      // Track processed question IDs to identify deleted questions
      const processedQuestionIds = new Set<number>();

      // Process each question in the request
      for (let i = 0; i < req.body.questions.length; i++) {
        const question = req.body.questions[i];
        // Ensure points is always a number
        const questionPoints = Number(question.points) || 10;
        console.log(`Processing question ${i + 1}, points:`, questionPoints);

        const isExistingQuestion =
          question.id && typeof question.id === "number";

        if (isExistingQuestion) {
          // Handle existing question
          processedQuestionIds.add(question.id);
          const existingQuestion = existingQuestionMap.get(question.id);

          if (!existingQuestion) {
            console.warn(`Question ID ${question.id} not found in database`);
            continue;
          }

          // Log comparison for debugging
          if (existingQuestion) {
            console.log(`Question ${question.id} points comparison:`, {
              existing: existingQuestion.points,
              new: questionPoints,
              changed: existingQuestion.points !== questionPoints,
            });
          }

          // Check if question data has changed before updating
          if (
            !existingQuestion ||
            existingQuestion.text !== question.text ||
            existingQuestion.model_answer !==
              (question.modelAnswer || question.model_answer || "") ||
            existingQuestion.points !== questionPoints ||
            existingQuestion.order !== i + 1
          ) {
            // Update question with changed fields, including points
            console.log(
              `Updating question ${question.id} with points:`,
              questionPoints
            );

            await db
              .update(questions)
              .set({
                text: question.text,
                model_answer:
                  question.modelAnswer || question.model_answer || "",
                points: questionPoints,
                order: i + 1,
              })
              .where(eq(questions.id, question.id));

            console.log(`Question ${question.id} updated successfully`);
          }

          // Process options for MCQ questions
          if (
            question.type === QuestionType.enum.multiple_choice &&
            question.options
          ) {
            const existingQuestionOptions =
              optionsByQuestionId[question.id] || [];
            const existingOptionMap = new Map(
              existingQuestionOptions.map((o) => [o.id, o])
            );
            const processedOptionIds = new Set<number>();

            // Find the correct option to update model_answer
            let correctOptionIndex = -1;

            // Process each option
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              if (option.isCorrect) {
                correctOptionIndex = j;
              }

              const isExistingOption =
                option.id && typeof option.id === "number";

              if (isExistingOption) {
                // Handle existing option
                processedOptionIds.add(option.id);
                const existingOption = existingOptionMap.get(option.id);

                if (!existingOption) {
                  console.warn(`Option ID ${option.id} not found in database`);
                  continue;
                }

                // Only update if option data has changed
                if (
                  existingOption.text !== option.text ||
                  existingOption.isCorrect !== option.isCorrect ||
                  existingOption.order !== j + 1
                ) {
                  await db
                    .update(options)
                    .set({
                      text: option.text,
                      isCorrect: option.isCorrect,
                      order: j + 1,
                    })
                    .where(eq(options.id, option.id));
                }
              } else {
                // Add new option
                await db.insert(options).values({
                  questionId: question.id,
                  text: option.text,
                  isCorrect: option.isCorrect || false,
                  order: j + 1,
                });
              }
            }

            // Update model_answer based on correct option index
            if (correctOptionIndex !== -1) {
              const optionIdentifiers = ["a", "b", "c", "d", "e", "f"];
              const model_answer =
                optionIdentifiers[correctOptionIndex] ||
                String.fromCharCode(97 + correctOptionIndex);

              // Update the question's model_answer
              await db
                .update(questions)
                .set({ model_answer })
                .where(eq(questions.id, question.id));
            }

            // Delete options not included in the request
            for (const opt of existingQuestionOptions) {
              if (!processedOptionIds.has(opt.id)) {
                await db.delete(options).where(eq(options.id, opt.id));
              }
            }
          }
        } else {
          // Create new question
          const newQuestion = {
            examId: examId,
            text: question.text,
            type: question.type,
            points: questionPoints,
            order: i + 1,
            model_answer: question.modelAnswer || question.model_answer || "",
          };

          console.log("Creating new question with points:", questionPoints);
          // Insert question and get ID
          const [createdQuestion] = await db
            .insert(questions)
            .values(newQuestion)
            .returning();

          // Create options for MCQ
          if (
            question.type === QuestionType.enum.multiple_choice &&
            question.options
          ) {
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              await db.insert(options).values({
                questionId: createdQuestion.id,
                text: option.text,
                isCorrect: option.isCorrect || false,
                order: j + 1,
              });
            }
          }
        }
      }

      // Delete questions not included in the request
      for (const q of existingQuestions) {
        if (!processedQuestionIds.has(q.id)) {
          // Delete the question's options first
          await db.delete(options).where(eq(options.questionId, q.id));
          // Then delete the question
          await db.delete(questions).where(eq(questions.id, q.id));
        }
      }
    }

    // Only fetch updated data if changes were made
    if (questionsUpdated || instructionsUpdated) {
      // Get updated exam data
      const updatedExam = await db
        .select()
        .from(exams)
        .where(eq(exams.id, examId))
        .then((rows) => rows[0]);

      // Get updated questions
      const updatedQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, examId))
        .orderBy(questions.order);

      // Get options for multiple choice questions
      const questionsWithOptions = await Promise.all(
        updatedQuestions.map(async (q) => {
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

      // Return full updated exam data
      res.status(200).json({
        ...updatedExam,
        questions: questionsWithOptions,
      });
    } else {
      // If no changes were made, just return success
      res.status(200).json({ message: "No changes detected" });
    }
  }
);
