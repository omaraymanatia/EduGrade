// utils/gradeExam.ts
import { db } from "@shared/index";
import { eq, inArray } from "drizzle-orm";
import { studentAnswers, studentExams, questions } from "@shared/schema";
import {
  detectAIUsage,
  isAIGenerated,
  getHumanProbability,
} from "./aiDetection";
import {
  checkSimilarity,
  calculateScoreFromSimilarity,
} from "./similarityCheck";
import { QuestionType } from "@shared/schema";

export async function gradeExam(SstudentExamId: number) {
  console.log("Grading exam for studentExamId:", SstudentExamId);

  // Add a retry mechanism for fetching answers
  let retries = 3;
  let answers: any[] = [];

  while (retries > 0) {
    // Fetch all answers for this studentExamId
    answers = await db.query.studentAnswers.findMany({
      where: eq(studentAnswers.studentExamId, SstudentExamId),
    });

    if (answers && answers.length > 0) {
      break;
    }

    console.log(`No answers found yet, retrying... (${retries} attempts left)`);
    retries--;
    // Wait a bit before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!answers || answers.length === 0) {
    console.log(
      "No answers found after retries for studentExamId:",
      SstudentExamId
    );
    // Mark the exam as completed with score 0
    const finalUpdateResult = await db
      .update(studentExams)
      .set({
        score: 0,
        AI_detected: 0,
        status: "completed",
        submittedAt: new Date(),
      })
      .where(eq(studentExams.id, SstudentExamId))
      .returning();

    return finalUpdateResult[0];
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

      // Get AI detection results
      const aiDetectionResults = await detectAIUsage(ans.answer);
      const isAI = isAIGenerated(aiDetectionResults);
      const humanProbability = getHumanProbability(aiDetectionResults);

      // Get similarity results if model answer exists
      let similarityScore = 0;
      if (question.model_answer) {
        const similarityResults = await checkSimilarity(
          question.text,
          question.model_answer,
          ans.answer
        );

        // Get average similarity score
        if (similarityResults && similarityResults.similarity_scores) {
          similarityScore = similarityResults.similarity_scores.average || 0;
        }
      }

      // Calculate points based on the similarity thresholds
      let points = 0;
      if (similarityScore >= 0.8) {
        // 100% of points if similarity >= 0.8
        points = question.points;
      } else if (similarityScore >= 0.6) {
        // 75% of points if similarity between 0.6-0.8
        points = Math.round(question.points * 0.75);
      } else if (similarityScore >= 0.4) {
        // 50% of points if similarity between 0.4-0.6
        points = Math.round(question.points * 0.5);
      } else {
        // 0 points if similarity < 0.4
        points = 0;
      }

      // Apply AI detection penalty if detected
      if (isAI) {
        totalAIDetected += 1;
        // Reduce score by 70% if AI-generated
        points = Math.round(points * 0.3);
      }

      console.log(
        "Final points:",
        points,
        "AI detected:",
        isAI,
        "Human probability:",
        humanProbability,
        "Similarity score:",
        similarityScore
      );

      // Wait for the update to complete
      const updateResult = await db
        .update(studentAnswers)
        .set({
          isCorrect: points > question.points * 0.5, // More than 50% is considered correct
          points,
        })
        .where(eq(studentAnswers.id, ans.id))
        .returning();

      console.log("Update result:", updateResult);

      totalScore += points;
    } else if (question.type === QuestionType.enum.multiple_choice) {
      console.log(
        "Grading MCQ question:",
        question.id,
        "Student answer:",
        ans.answer,
        "Model answer:",
        question.model_answer
      );

      // Direct comparison of option identifiers (a, b, c, d)
      const isCorrect =
        ans.answer &&
        question.model_answer &&
        ans.answer === question.model_answer;
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
