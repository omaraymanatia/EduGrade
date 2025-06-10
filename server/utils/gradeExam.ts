// utils/gradeExam.ts
import { db } from "@shared/index";
import { eq, inArray } from "drizzle-orm";
import { studentAnswers, studentExams, questions } from "@shared/schema";
import { detectAIUsage } from "./aiDetection";
import { QuestionType } from "@shared/schema";

export async function gradeExam(SstudentExamId: number) {
  console.log("Grading exam for studentExamId:", SstudentExamId);

  // Fetch all answers for this studentExamId
  const answers = await db.query.studentAnswers.findMany({
    where: eq(studentAnswers.studentExamId, SstudentExamId),
  });

  if (!answers || answers.length === 0) {
    console.log("No answers found for studentExamId:", SstudentExamId);
    return;
  }

  console.log("Fetched answers:", answers);

  // Fetch all related questions
  const questionIds = answers.map((a) => a.questionId);
  const allQuestions = await db.query.questions.findMany({
    where: inArray(questions.id, questionIds),
  });

  // Create a map of questions for quick lookup
  const questionsMap = new Map<number, any>();
  for (const q of allQuestions) {
    questionsMap.set(q.id, q);
  }

  let totalScore = 0;
  let totalAIDetected = 0;

  // Process each answer separately with individual transactions
  for (const ans of answers) {
    const question = questionsMap.get(ans.questionId);
    if (!question) continue;

    if (question.type === QuestionType.enum.essay) {
      console.log(
        "Grading essay question:",
        question.id,
        "Answer:",
        ans.answer
      );

      if (!ans.answer || ans.answer.trim() === "") {
        console.log("Empty answer detected");
        // No answer provided, give 0 points
        await db
          .update(studentAnswers)
          .set({
            isCorrect: false,
            points: 0,
          })
          .where(eq(studentAnswers.id, ans.id));
        continue;
      }

      // Check if answer is AI generated
      const isAI = await detectAIUsage(ans.answer);
      const points = isAI === "Machine-Generated" ? 0 : question.points;

      console.log("Points:", points, "isAI:", isAI);

      // Wait for the update to complete
      const updateResult = await db
        .update(studentAnswers)
        .set({
          isCorrect: points > 0,
          points,
        })
        .where(eq(studentAnswers.id, ans.id))
        .returning();

      console.log("Update result:", updateResult);

      totalScore += points;
      if (isAI === "Machine-Generated") totalAIDetected += 1;
    } else if (question.type === QuestionType.enum.multiple_choice) {
      console.log(
        "Grading MCQ question:",
        question.id,
        "Student answer:",
        ans.answer,
        "Model answer:",
        question.model_answer
      );

      // Compare student answer with model answer
      const isCorrect =
        ans.answer &&
        question.model_answer &&
        ans.answer.trim().toLowerCase() ===
          question.model_answer.trim().toLowerCase();
      const points = isCorrect ? question.points : 0;

      // Wait for the update to complete
      const updateResult = await db
        .update(studentAnswers)
        .set({
          isCorrect,
          points,
        })
        .where(eq(studentAnswers.id, ans.id))
        .returning();

      console.log("Update result:", updateResult);

      totalScore += points;
    }
  }

  // Re-fetch the updated answers to get the latest points
  const updatedAnswers = await db.query.studentAnswers.findMany({
    where: eq(studentAnswers.studentExamId, SstudentExamId),
  });

  // Calculate total from the updated answers (double-check)
  let verifiedTotalScore = 0;
  updatedAnswers.forEach((answer) => {
    if (answer.points) {
      verifiedTotalScore += answer.points;
    }
  });

  console.log(
    `Calculated total: ${totalScore}, Verified total: ${verifiedTotalScore}`
  );
  // Use the verified score
  totalScore = verifiedTotalScore;

  // Calculate percentage score
  const examRecord = await db.query.studentExams.findFirst({
    where: eq(studentExams.id, SstudentExamId),
    with: {
      exam: {
        columns: { id: true },
        with: {
          questions: {
            columns: { points: true },
          },
        },
      },
    },
  });

  const totalPossiblePoints =
    examRecord?.exam.questions.reduce((sum, q) => sum + q.points, 0) || 0;

  const percentageScore =
    totalPossiblePoints > 0
      ? Math.round((totalScore / totalPossiblePoints) * 100)
      : 0;

  console.log(
    `Final score: ${totalScore}/${totalPossiblePoints} = ${percentageScore}%`
  );

  // Mark the exam as completed
  const finalUpdateResult = await db
    .update(studentExams)
    .set({
      score: percentageScore,
      AI_detected: totalAIDetected,
      status: "completed",
      submittedAt: new Date(),
    })
    .where(eq(studentExams.id, SstudentExamId))
    .returning();

  console.log("Final update result:", finalUpdateResult);

  return finalUpdateResult[0];
}
