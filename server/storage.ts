import { 
  users, 
  User, 
  InsertUser, 
  exams, 
  Exam, 
  InsertExam,
  submissions,
  Submission,
  InsertSubmission,
  aiDetectionLogs,
  AiDetectionLog,
  InsertAiDetectionLog,
  settings,
  Settings,
  InsertSettings,
  SubmissionWithDetails
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Modify the interface with the CRUD methods we need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  countUsers(): Promise<number>;
  
  // Exam methods
  getExam(id: number): Promise<Exam | undefined>;
  getAllExams(): Promise<Exam[]>;
  getExamsByProfessorId(professorId: number): Promise<Exam[]>;
  getExamsForStudent(): Promise<Exam[]>;
  createExam(exam: InsertExam): Promise<Exam>;
  countExams(): Promise<number>;
  countExamsByProfessorId(professorId: number): Promise<number>;
  
  // Submission methods
  getSubmission(id: number): Promise<SubmissionWithDetails | undefined>;
  getAllSubmissions(): Promise<SubmissionWithDetails[]>;
  getSubmissionsByStudentId(studentId: number): Promise<SubmissionWithDetails[]>;
  getSubmissionsByExamId(examId: number): Promise<SubmissionWithDetails[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmissionGrade(id: number, grade: number, feedback?: string): Promise<Submission>;
  countSubmissions(): Promise<number>;
  countSubmissionsByStudentId(studentId: number): Promise<number>;
  getRecentSubmissionsForProfessor(professorId: number, limit: number): Promise<SubmissionWithDetails[]>;
  countUniqueStudentsForProfessor(professorId: number): Promise<number>;
  
  // AI Detection methods
  createAiDetectionLog(log: InsertAiDetectionLog): Promise<AiDetectionLog>;
  getAiDetectionLogsByUserId(userId: number): Promise<AiDetectionLog[]>;
  countAiDetectionsForProfessor(professorId: number): Promise<number>;
  
  // Settings methods
  getUserSettings(userId: number): Promise<Settings | undefined>;
  updateUserSettings(userId: number, settingsData: Partial<InsertSettings>): Promise<Settings>;
  
  // Student grades
  getStudentGrades(studentId: number): Promise<{examId: number, examTitle: string, grade: number}[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private examsMap: Map<number, Exam>;
  private submissionsMap: Map<number, Submission>;
  private aiDetectionLogsMap: Map<number, AiDetectionLog>;
  private settingsMap: Map<number, Settings>;
  sessionStore: session.SessionStore;
  
  private userId: number;
  private examId: number;
  private submissionId: number;
  private aiDetectionLogId: number;
  private settingsId: number;
  
  constructor() {
    this.usersMap = new Map();
    this.examsMap = new Map();
    this.submissionsMap = new Map();
    this.aiDetectionLogsMap = new Map();
    this.settingsMap = new Map();
    
    this.userId = 1;
    this.examId = 1;
    this.submissionId = 1;
    this.aiDetectionLogId = 1;
    this.settingsId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Add some initial data for testing
    this.seedData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.email === email
    );
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const user: User = { ...userData, id, createdAt };
    this.usersMap.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }
  
  async countUsers(): Promise<number> {
    return this.usersMap.size;
  }
  
  // Exam methods
  async getExam(id: number): Promise<Exam | undefined> {
    return this.examsMap.get(id);
  }
  
  async getAllExams(): Promise<Exam[]> {
    return Array.from(this.examsMap.values());
  }
  
  async getExamsByProfessorId(professorId: number): Promise<Exam[]> {
    return Array.from(this.examsMap.values()).filter(
      (exam) => exam.professorId === professorId
    );
  }
  
  async getExamsForStudent(): Promise<Exam[]> {
    // In a real app, this would filter by courses student is enrolled in
    return Array.from(this.examsMap.values());
  }
  
  async createExam(examData: InsertExam): Promise<Exam> {
    const id = this.examId++;
    const createdAt = new Date();
    const exam: Exam = { ...examData, id, createdAt };
    this.examsMap.set(id, exam);
    return exam;
  }
  
  async countExams(): Promise<number> {
    return this.examsMap.size;
  }
  
  async countExamsByProfessorId(professorId: number): Promise<number> {
    return (await this.getExamsByProfessorId(professorId)).length;
  }
  
  // Submission methods
  async getSubmission(id: number): Promise<SubmissionWithDetails | undefined> {
    const submission = this.submissionsMap.get(id);
    if (!submission) return undefined;
    
    const student = await this.getUser(submission.studentId);
    const exam = await this.getExam(submission.examId);
    
    if (!student || !exam) return undefined;
    
    return {
      ...submission,
      student,
      exam
    };
  }
  
  async getAllSubmissions(): Promise<SubmissionWithDetails[]> {
    const submissions = Array.from(this.submissionsMap.values());
    const result: SubmissionWithDetails[] = [];
    
    for (const submission of submissions) {
      const student = await this.getUser(submission.studentId);
      const exam = await this.getExam(submission.examId);
      
      if (student && exam) {
        result.push({
          ...submission,
          student,
          exam
        });
      }
    }
    
    return result;
  }
  
  async getSubmissionsByStudentId(studentId: number): Promise<SubmissionWithDetails[]> {
    const submissions = Array.from(this.submissionsMap.values()).filter(
      (submission) => submission.studentId === studentId
    );
    
    const result: SubmissionWithDetails[] = [];
    
    for (const submission of submissions) {
      const student = await this.getUser(submission.studentId);
      const exam = await this.getExam(submission.examId);
      
      if (student && exam) {
        result.push({
          ...submission,
          student,
          exam
        });
      }
    }
    
    return result;
  }
  
  async getSubmissionsByExamId(examId: number): Promise<SubmissionWithDetails[]> {
    const submissions = Array.from(this.submissionsMap.values()).filter(
      (submission) => submission.examId === examId
    );
    
    const result: SubmissionWithDetails[] = [];
    
    for (const submission of submissions) {
      const student = await this.getUser(submission.studentId);
      const exam = await this.getExam(submission.examId);
      
      if (student && exam) {
        result.push({
          ...submission,
          student,
          exam
        });
      }
    }
    
    return result;
  }
  
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const id = this.submissionId++;
    const submittedAt = new Date();
    const submission: Submission = { ...submissionData, id, submittedAt };
    this.submissionsMap.set(id, submission);
    return submission;
  }
  
  async updateSubmissionGrade(id: number, grade: number, feedback?: string): Promise<Submission> {
    const submission = this.submissionsMap.get(id);
    if (!submission) {
      throw new Error("Submission not found");
    }
    
    const updatedSubmission: Submission = {
      ...submission,
      grade,
      feedback: feedback || submission.feedback,
      status: "graded"
    };
    
    this.submissionsMap.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  async countSubmissions(): Promise<number> {
    return this.submissionsMap.size;
  }
  
  async countSubmissionsByStudentId(studentId: number): Promise<number> {
    return Array.from(this.submissionsMap.values()).filter(
      (submission) => submission.studentId === studentId
    ).length;
  }
  
  async getRecentSubmissionsForProfessor(professorId: number, limit: number): Promise<SubmissionWithDetails[]> {
    // Get exams created by this professor
    const professorExams = await this.getExamsByProfessorId(professorId);
    const examIds = professorExams.map(exam => exam.id);
    
    // Get submissions for these exams
    const submissions = Array.from(this.submissionsMap.values())
      .filter(submission => examIds.includes(submission.examId))
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, limit);
    
    const result: SubmissionWithDetails[] = [];
    
    for (const submission of submissions) {
      const student = await this.getUser(submission.studentId);
      const exam = await this.getExam(submission.examId);
      
      if (student && exam) {
        result.push({
          ...submission,
          student,
          exam
        });
      }
    }
    
    return result;
  }
  
  async countUniqueStudentsForProfessor(professorId: number): Promise<number> {
    // Get exams created by this professor
    const professorExams = await this.getExamsByProfessorId(professorId);
    const examIds = professorExams.map(exam => exam.id);
    
    // Count unique students who have submitted to these exams
    const studentIds = new Set(
      Array.from(this.submissionsMap.values())
        .filter(submission => examIds.includes(submission.examId))
        .map(submission => submission.studentId)
    );
    
    return studentIds.size;
  }
  
  // AI Detection methods
  async createAiDetectionLog(logData: InsertAiDetectionLog): Promise<AiDetectionLog> {
    const id = this.aiDetectionLogId++;
    const detectedAt = new Date();
    const log: AiDetectionLog = { ...logData, id, detectedAt };
    this.aiDetectionLogsMap.set(id, log);
    return log;
  }
  
  async getAiDetectionLogsByUserId(userId: number): Promise<AiDetectionLog[]> {
    return Array.from(this.aiDetectionLogsMap.values()).filter(
      (log) => log.userId === userId
    );
  }
  
  async countAiDetectionsForProfessor(professorId: number): Promise<number> {
    return (await this.getAiDetectionLogsByUserId(professorId)).length;
  }
  
  // Settings methods
  async getUserSettings(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settingsMap.values()).find(
      (settings) => settings.userId === userId
    );
  }
  
  async updateUserSettings(userId: number, settingsData: Partial<InsertSettings>): Promise<Settings> {
    let settings = await this.getUserSettings(userId);
    
    if (!settings) {
      // Create new settings
      const id = this.settingsId++;
      settings = {
        id,
        userId,
        aiDetectionSensitivity: settingsData.aiDetectionSensitivity || 3,
        preferences: settingsData.preferences || {}
      };
    } else {
      // Update existing settings
      settings = {
        ...settings,
        aiDetectionSensitivity: settingsData.aiDetectionSensitivity !== undefined 
          ? settingsData.aiDetectionSensitivity 
          : settings.aiDetectionSensitivity,
        preferences: settingsData.preferences !== undefined
          ? settingsData.preferences
          : settings.preferences
      };
    }
    
    this.settingsMap.set(settings.id, settings);
    return settings;
  }
  
  // Student grades
  async getStudentGrades(studentId: number): Promise<{examId: number, examTitle: string, grade: number}[]> {
    const studentSubmissions = Array.from(this.submissionsMap.values())
      .filter(sub => sub.studentId === studentId && sub.grade !== null && sub.grade !== undefined);
    
    const grades = [];
    
    for (const submission of studentSubmissions) {
      const exam = await this.getExam(submission.examId);
      if (exam) {
        grades.push({
          examId: exam.id,
          examTitle: exam.title,
          grade: submission.grade!
        });
      }
    }
    
    return grades;
  }
  
  // Helper method to add some initial data for testing
  private seedData() {
    // Add some test users
    const professor = this.createUser({
      username: "professor",
      password: "$2a$10$X7O/wMGRHfV.ZMgL5WlP3.1N6OQgb8KbZIeR.I6DZ3dJL0e1jBYcK", // "password"
      fullName: "Dr. Sara Sweidan",
      email: "professor@test.com",
      role: "professor"
    });
    
    const student1 = this.createUser({
      username: "student1",
      password: "$2a$10$X7O/wMGRHfV.ZMgL5WlP3.1N6OQgb8KbZIeR.I6DZ3dJL0e1jBYcK", // "password"
      fullName: "Ziad Mostafa",
      email: "student1@test.com",
      role: "student"
    });
    
    const student2 = this.createUser({
      username: "student2",
      password: "$2a$10$X7O/wMGRHfV.ZMgL5WlP3.1N6OQgb8KbZIeR.I6DZ3dJL0e1jBYcK", // "password"
      fullName: "Omar Ayman",
      email: "student2@test.com",
      role: "student"
    });
    
    const admin = this.createUser({
      username: "admin",
      password: "$2a$10$X7O/wMGRHfV.ZMgL5WlP3.1N6OQgb8KbZIeR.I6DZ3dJL0e1jBYcK", // "password"
      fullName: "Admin User",
      email: "admin@test.com",
      role: "admin"
    });
  }
}

export const storage = new MemStorage();
