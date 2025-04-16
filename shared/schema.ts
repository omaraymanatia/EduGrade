import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull(),
  description: text("description"),
  examType: text("exam_type").notNull(), // 'mcq', 'article'
  professorId: integer("professor_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  dueDate: timestamp("due_date"),
  isActive: boolean("is_active").default(true),
  timeLimit: integer("time_limit"), // in minutes, null means no time limit
  configuration: jsonb("configuration"), // Stores exam questions, options for MCQ, etc.
  imageUrl: text("image_url"), // For exams created from uploaded images
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  grade: real("grade"),
  feedback: text("feedback"),
  aiDetectionResult: jsonb("ai_detection_result"),
  status: text("status").notNull().default("submitted"), // 'submitted', 'graded', 'flagged'
});

export const aiDetectionLogs = pgTable("ai_detection_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  result: jsonb("result").notNull(),
  detectedAt: timestamp("detected_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  aiDetectionSensitivity: integer("ai_detection_sensitivity").default(3),
  preferences: jsonb("preferences"),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertAiDetectionLogSchema = createInsertSchema(aiDetectionLogs).omit({
  id: true,
  detectedAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export type InsertAiDetectionLog = z.infer<typeof insertAiDetectionLogSchema>;
export type AiDetectionLog = typeof aiDetectionLogs.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Extended schemas for validation
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;

// MCQ Exam Schema
export const mcqQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1),
    isCorrect: z.boolean().default(false),
  })).min(2),
  points: z.number().positive().default(1),
});

export type McqQuestion = z.infer<typeof mcqQuestionSchema>;

// Article Question Schema
export const articleQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  points: z.number().positive().default(10),
  expectedLength: z.number().positive().optional(),
});

export type ArticleQuestion = z.infer<typeof articleQuestionSchema>;

// Exam Creation Schema
export const createExamSchema = insertExamSchema.extend({
  questions: z.array(
    z.union([
      mcqQuestionSchema,
      articleQuestionSchema
    ])
  ).optional(),
});

export type CreateExamData = z.infer<typeof createExamSchema>;

// Exam Image Upload Schema
export const examImageUploadSchema = z.object({
  title: z.string().min(3),
  course: z.string().min(2),
  description: z.string().optional(),
  examType: z.enum(["mcq", "article"]),
  imageFile: z.any(), // File object
});

export type ExamImageUploadData = z.infer<typeof examImageUploadSchema>;

export const aiTextAnalysisSchema = z.object({
  text: z.string().min(10),
  sensitivity: z.number().min(1).max(5).default(3),
});

export type AiTextAnalysis = z.infer<typeof aiTextAnalysisSchema>;

export interface AiDetectionResult {
  score: number;
  confidence: string;
  perplexity: number;
  burstiness: number;
  patternScore: number;
  highlightedText?: string;
}

export interface SubmissionWithDetails extends Submission {
  student: User;
  exam: Exam;
}
