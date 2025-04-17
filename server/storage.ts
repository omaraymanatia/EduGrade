import {
  users,
  exams,
  questions,
  options,
  studentExams,
  studentAnswers,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Exam,
  InsertExam,
  Question,
  InsertQuestion,
  Option,
  InsertOption,
  StudentExam,
  InsertStudentExam,
  StudentAnswer,
  InsertStudentAnswer,
} from "@shared/schema";
import session, { Store } from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Exam methods
  createExam(exam: InsertExam): Promise<Exam>;
  getExam(id: number): Promise<Exam | undefined>;
  getExamByKey(examKey: string): Promise<Exam | undefined>;
  getExamsByCreator(creatorId: number): Promise<Exam[]>;
  updateExam(id: number, data: Partial<InsertExam>): Promise<Exam | undefined>;

  // Question methods
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByExam(examId: number): Promise<Question[]>;

  // Option methods
  createOption(option: InsertOption): Promise<Option>;
  getOptionsByQuestion(questionId: number): Promise<Option[]>;

  // Student exam methods
  createStudentExam(studentExam: InsertStudentExam): Promise<StudentExam>;
  getStudentExam(id: number): Promise<StudentExam | undefined>;
  getStudentExamsByStudent(studentId: number): Promise<StudentExam[]>;
  getStudentExamsByExam(examId: number): Promise<StudentExam[]>;
  updateStudentExam(
    id: number,
    data: Partial<StudentExam>
  ): Promise<StudentExam | undefined>;

  // Student answer methods
  createStudentAnswer(
    studentAnswer: InsertStudentAnswer
  ): Promise<StudentAnswer>;
  getStudentAnswersByStudentExam(
    studentExamId: number
  ): Promise<StudentAnswer[]>;

  // Session store
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private exams: Map<number, Exam>;
  private examKeyIndex: Map<string, number>; // Map from exam key to id
  private questions: Map<number, Question>;
  private options: Map<number, Option>;
  private studentExams: Map<number, StudentExam>;
  private studentAnswers: Map<number, StudentAnswer>;

  // IDs for auto-increment
  private currentUserId: number;
  private currentExamId: number;
  private currentQuestionId: number;
  private currentOptionId: number;
  private currentStudentExamId: number;
  private currentStudentAnswerId: number;

  sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.exams = new Map();
    this.examKeyIndex = new Map();
    this.questions = new Map();
    this.options = new Map();
    this.studentExams = new Map();
    this.studentAnswers = new Map();

    this.currentUserId = 1;
    this.currentExamId = 1;
    this.currentQuestionId = 1;
    this.currentOptionId = 1;
    this.currentStudentExamId = 1;
    this.currentStudentAnswerId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<InsertUser>
  ): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Exam methods
  async createExam(insertExam: InsertExam): Promise<Exam> {
    const id = this.currentExamId++;
    const now = new Date();
    const exam: Exam = {
      ...insertExam,
      id,
      createdAt: now,
      description: insertExam.description ?? null,
      instructions: insertExam.instructions ?? null,
      passingScore: insertExam.passingScore ?? null,
      isActive: insertExam.isActive ?? false,
    };
    this.exams.set(id, exam);
    this.examKeyIndex.set(exam.examKey, id);
    return exam;
  }

  async getExam(id: number): Promise<Exam | undefined> {
    return this.exams.get(id);
  }

  async getExamByKey(examKey: string): Promise<Exam | undefined> {
    const examId = this.examKeyIndex.get(examKey);
    if (!examId) return undefined;
    return this.getExam(examId);
  }

  async getExamsByCreator(creatorId: number): Promise<Exam[]> {
    return Array.from(this.exams.values()).filter(
      (exam) => exam.creatorId === creatorId
    );
  }

  async updateExam(
    id: number,
    data: Partial<InsertExam>
  ): Promise<Exam | undefined> {
    const exam = await this.getExam(id);
    if (!exam) return undefined;

    const updatedExam = { ...exam, ...data };
    this.exams.set(id, updatedExam);

    // Update the key index if the key changed
    if (data.examKey && data.examKey !== exam.examKey) {
      this.examKeyIndex.delete(exam.examKey);
      this.examKeyIndex.set(data.examKey, id);
    }

    return updatedExam;
  }

  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.currentQuestionId++;
    const question: Question = { ...insertQuestion, id };
    this.questions.set(id, question);
    return question;
  }

  async getQuestionsByExam(examId: number): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((q) => q.examId === examId)
      .sort((a, b) => a.order - b.order);
  }

  // Option methods
  async createOption(insertOption: InsertOption): Promise<Option> {
    const id = this.currentOptionId++;
    const option: Option = {
      ...insertOption,
      id,
      isCorrect: insertOption.isCorrect ?? false,
    };
    this.options.set(id, option);
    return option;
  }

  async getOptionsByQuestion(questionId: number): Promise<Option[]> {
    return Array.from(this.options.values())
      .filter((o) => o.questionId === questionId)
      .sort((a, b) => a.order - b.order);
  }

  // Student exam methods
  async createStudentExam(
    insertStudentExam: InsertStudentExam
  ): Promise<StudentExam> {
    const id = this.currentStudentExamId++;
    const studentExam: StudentExam = {
      ...insertStudentExam,
      id,
      score: null,
      startedAt: new Date(),
      submittedAt: null,
      status: "in_progress",
    };
    this.studentExams.set(id, studentExam);
    return studentExam;
  }

  async getStudentExam(id: number): Promise<StudentExam | undefined> {
    return this.studentExams.get(id);
  }

  async getStudentExamsByStudent(studentId: number): Promise<StudentExam[]> {
    return Array.from(this.studentExams.values())
      .filter((se) => se.studentId === studentId)
      .sort(
        (a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
      );
  }

  async getStudentExamsByExam(examId: number): Promise<StudentExam[]> {
    return Array.from(this.studentExams.values())
      .filter((se) => se.examId === examId)
      .sort(
        (a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0)
      );
  }

  async updateStudentExam(
    id: number,
    data: Partial<StudentExam>
  ): Promise<StudentExam | undefined> {
    const studentExam = await this.getStudentExam(id);
    if (!studentExam) return undefined;

    const updatedStudentExam = { ...studentExam, ...data };
    this.studentExams.set(id, updatedStudentExam);
    return updatedStudentExam;
  }

  // Student answer methods
  async createStudentAnswer(
    insertStudentAnswer: InsertStudentAnswer
  ): Promise<StudentAnswer> {
    const id = this.currentStudentAnswerId++;
    const studentAnswer: StudentAnswer = {
      ...insertStudentAnswer,
      id,
      isCorrect: null,
      points: null,
      answer: insertStudentAnswer.answer ?? null,
      selectedOptionId: insertStudentAnswer.selectedOptionId ?? null,
    };
    this.studentAnswers.set(id, studentAnswer);
    return studentAnswer;
  }

  async getStudentAnswersByStudentExam(
    studentExamId: number
  ): Promise<StudentAnswer[]> {
    return Array.from(this.studentAnswers.values()).filter(
      (sa) => sa.studentExamId === studentExamId
    );
  }
}

export const storage = new MemStorage();
