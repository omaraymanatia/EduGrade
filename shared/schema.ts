import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  varchar,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for consistent values
export const UserRole = z.enum(["professor", "student"]);
export const QuestionType = z.enum(["multiple_choice", "essay"]);
export const AttemptStatus = z.enum(["in_progress", "completed"]);

// ************************************Models************************************

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  createdExams: many(exams),
  attempts: many(studentExams),
}));

// Exams model
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  courseCode: varchar("course_code", { length: 20 }).notNull(),
  instructions: text("instructions"),
  duration: integer("duration").notNull(), // in minutes
  passingScore: integer("passing_score"),
  examKey: varchar("exam_key", { length: 50 }).notNull().unique(),
  creatorId: integer("creator_id").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const examsRelations = relations(exams, ({ one, many }) => ({
  creator: one(users, {
    fields: [exams.creatorId],
    references: [users.id],
  }),
  questions: many(questions),
  attempts: many(studentExams),
}));

// Questions model
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  order: integer("order").notNull(),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
  options: many(options),
  answers: many(studentAnswers),
}));

// Options model for multiple choice questions
export const options = pgTable("options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull(),
});

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));

// Student Exams (attempts)
export const studentExams = pgTable("student_exams", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => exams.id),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id),
  score: integer("score"),
  AI_detected: integer("AI_detected"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
  status: text("status").notNull().default("in_progress"),
});

export const studentExamsRelations = relations(
  studentExams,
  ({ one, many }) => ({
    exam: one(exams, {
      fields: [studentExams.examId],
      references: [exams.id],
    }),
    student: one(users, {
      fields: [studentExams.studentId],
      references: [users.id],
    }),
    answers: many(studentAnswers),
  })
);

// Student Answers
export const studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  studentExamId: integer("student_exam_id")
    .notNull()
    .references(() => studentExams.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id),
  answer: text("answer"),
  selectedOptionId: integer("selected_option_id").references(() => options.id),
  isCorrect: boolean("is_correct"),
  points: integer("points"),
});

export const studentAnswersRelations = relations(studentAnswers, ({ one }) => ({
  attempt: one(studentExams, {
    fields: [studentAnswers.studentExamId],
    references: [studentExams.id],
  }),
  question: one(questions, {
    fields: [studentAnswers.questionId],
    references: [questions.id],
  }),
  selectedOption: one(options, {
    fields: [studentAnswers.selectedOptionId],
    references: [options.id],
  }),
}));

// ************************************Schemas************************************

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  role: UserRole,
}).pick({
  firstName: true,
  lastName: true,
  email: true,
  password: true,
  role: true,
});

export const insertExamSchema = createInsertSchema(exams, {
  courseCode: z.string().regex(/^[A-Za-z]{2,4}-\d{3,4}$/, {
    message: "Course code should be in format like CS-101 or MATH-202",
  }),
}).pick({
  title: true,
  courseCode: true,
  instructions: true,
  duration: true,
  passingScore: true,
  creatorId: true,
  examKey: true,
  isActive: true,
});

export const insertQuestionSchema = createInsertSchema(questions, {
  type: QuestionType,
}).pick({
  examId: true,
  text: true,
  type: true,
  points: true,
  order: true,
});

export const insertOptionSchema = createInsertSchema(options).pick({
  questionId: true,
  text: true,
  isCorrect: true,
  order: true,
});

export const insertStudentExamSchema = createInsertSchema(studentExams, {
  status: AttemptStatus,
}).pick({
  examId: true,
  studentId: true,
});

export const insertStudentAnswerSchema = createInsertSchema(
  studentAnswers
).pick({
  studentExamId: true,
  questionId: true,
  answer: true,
  selectedOptionId: true,
});

// *************************************Select Schemas************************************

export const createUserSchema = createSelectSchema(users, {
  email: z.string().email(),
  role: UserRole,
}).pick({
  firstName: true,
  lastName: true,
  email: true,
  password: true,
  role: true,
});

export const createExamSchema = createSelectSchema(exams, {
  courseCode: z.string().regex(/^[A-Za-z]{2,4}-\d{3,4}$/, {
    message: "Course code should be in format like CS-101 or MATH-202",
  }),
}).pick({
  title: true,
  courseCode: true,
  instructions: true,
  duration: true,
  passingScore: true,
  creatorId: true,
  examKey: true,
  isActive: true,
});

export const createQuestionSchema = createSelectSchema(questions, {
  type: QuestionType,
}).pick({
  examId: true,
  text: true,
  type: true,
  points: true,
  order: true,
});

export const createOptionSchema = createSelectSchema(options).pick({
  questionId: true,
  text: true,
  isCorrect: true,
  order: true,
});

export const createStudentExamSchema = createSelectSchema(studentExams, {
  status: AttemptStatus,
}).pick({
  examId: true,
  studentId: true,
});

export const createStudentAnswerSchema = createSelectSchema(
  studentAnswers
).pick({
  studentExamId: true,
  questionId: true,
  answer: true,
  selectedOptionId: true,
});

// *************************************Types************************************

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserRole = z.infer<typeof UserRole>;
export type SelectUser = typeof users.$inferSelect;

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

export type SelectExam = typeof exams.$inferSelect;

export type InsertStudentAnswer = z.infer<typeof insertStudentAnswerSchema>;
export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type SelectStudentAnswer = typeof studentAnswers.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;
export type QuestionType = z.infer<typeof QuestionType>;
export type SelectQuestion = typeof questions.$inferSelect;

export type InsertStudentExam = z.infer<typeof insertStudentExamSchema>;
export type StudentExam = typeof studentExams.$inferSelect;
export type AttemptStatus = z.infer<typeof AttemptStatus>;
export type SelectStudentExam = typeof studentExams.$inferSelect;

export type InsertOption = z.infer<typeof insertOptionSchema>;
export type Option = typeof options.$inferSelect;
export type SelectOption = typeof options.$inferSelect;
