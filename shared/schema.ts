import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Exam model
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  courseCode: text("course_code").notNull(),
  instructions: text("instructions"),
  duration: integer("duration").notNull(), // in minutes
  passingScore: integer("passing_score"),
  examKey: text("exam_key").notNull().unique(),
  creatorId: integer("creator_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExamSchema = createInsertSchema(exams).pick({
  title: true,
  courseCode: true,
  instructions: true,
  duration: true,
  passingScore: true,
  creatorId: true,
  examKey: true,
  isActive: true,
});

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// Questions model
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  text: text("text").notNull(),
  type: text("type").notNull(), // multiple_choice, short_answer, essay
  points: integer("points").notNull(),
  order: integer("order").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  examId: true,
  text: true,
  type: true,
  points: true,
  order: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Options model for multiple choice questions
export const options = pgTable("options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").default(false),
  order: integer("order").notNull(),
});

export const insertOptionSchema = createInsertSchema(options).pick({
  questionId: true,
  text: true,
  isCorrect: true,
  order: true,
});

export type InsertOption = z.infer<typeof insertOptionSchema>;
export type Option = typeof options.$inferSelect;

// Student Exams (attempts)
export const studentExams = pgTable("student_exams", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  studentId: integer("student_id").notNull(),
  score: integer("score"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("in_progress"), // in_progress, completed, abandoned
});

export const insertStudentExamSchema = createInsertSchema(studentExams).pick({
  examId: true,
  studentId: true,
  startedAt: true,
});

export type InsertStudentExam = z.infer<typeof insertStudentExamSchema>;
export type StudentExam = typeof studentExams.$inferSelect;

// Student Answers
export const studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  studentExamId: integer("student_exam_id").notNull(),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
  selectedOptionId: integer("selected_option_id"),
  isCorrect: boolean("is_correct"),
  points: integer("points"),
});

export const insertStudentAnswerSchema = createInsertSchema(studentAnswers).pick({
  studentExamId: true,
  questionId: true,
  answer: true,
  selectedOptionId: true,
});

export type InsertStudentAnswer = z.infer<typeof insertStudentAnswerSchema>;
export type StudentAnswer = typeof studentAnswers.$inferSelect;
