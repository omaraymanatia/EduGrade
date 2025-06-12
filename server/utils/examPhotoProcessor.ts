/**
 * Utility to extract exam structure from photos, with fallbacks
 */
export const extractExamStructure = (vlmResult: any) => {
  console.log("Raw VLM result:", JSON.stringify(vlmResult, null, 2));

  // Default structure if API returns unexpected format
  const defaultExam = {
    title: "Exam from Photos",
    courseCode: `EXAM-${Date.now().toString().slice(-6)}`,
    description: "Extracted from photos",
    duration: 60,
    passingScore: 70,
    instructions: "Answer all questions.",
    questions: [
      {
        text: "Question extracted from image",
        type: "essay" as "essay",
        points: 10,
        modelAnswer: "",
        options: [],
      },
    ],
  };

  // Check if result has expected structure
  if (!vlmResult || typeof vlmResult !== "object") {
    console.warn("Invalid VLM result - using default exam structure");
    return defaultExam;
  }

  // Define types for exam and question
  interface ExamQuestion {
    text: string;
    type: "multiple_choice" | "essay";
    points: number;
    modelAnswer: string;
    options: { text: string; isCorrect: boolean }[];
  }

  interface ExamStructure {
    title: string;
    courseCode: string;
    description: string;
    duration: number;
    passingScore: number;
    instructions: string;
    questions: ExamQuestion[];
  }

  // Extract fields with proper fallbacks
  const result: ExamStructure = {
    title: vlmResult.title || vlmResult.exam_title || defaultExam.title,
    courseCode:
      vlmResult.courseCode || vlmResult.course_code || defaultExam.courseCode,
    description: vlmResult.description || defaultExam.description,
    duration: vlmResult.duration || defaultExam.duration,
    passingScore:
      vlmResult.passingScore ||
      vlmResult.passing_score ||
      defaultExam.passingScore,
    instructions: vlmResult.instructions || defaultExam.instructions,
    questions: [],
  };

  // Handle different formats of questions array
  const rawQuestions = vlmResult.questions || vlmResult.exam_questions || [];

  // Process questions
  if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
    result.questions = rawQuestions.map((q: any, index: number) => {
      // Determine the question type with careful fallbacks
      let questionType: "multiple_choice" | "essay" = "essay";

      // Check for explicit type
      if (q.type) {
        if (
          q.type === "multiple_choice" ||
          q.type === "mcq" ||
          q.type === "MCQ"
        ) {
          questionType = "multiple_choice";
        } else if (q.type === "essay" || q.type === "Essay") {
          questionType = "essay";
        }
      }

      // Check for question_type field
      else if (q.question_type) {
        if (
          q.question_type === "multiple_choice" ||
          q.question_type === "mcq" ||
          q.question_type === "MCQ"
        ) {
          questionType = "multiple_choice";
        } else if (q.question_type === "essay" || q.question_type === "Essay") {
          questionType = "essay";
        }
      }

      // Infer from presence of options
      else if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        questionType = "multiple_choice";
      } else if (
        q.choices &&
        Array.isArray(q.choices) &&
        q.choices.length > 0
      ) {
        questionType = "multiple_choice";
      }

      // Create the question object
      const question: ExamQuestion = {
        text: q.text || q.question_text || `Question ${index + 1}`,
        type: questionType,
        points: q.points || q.marks || 10,
        modelAnswer: q.modelAnswer || q.model_answer || q.correct_answer || "",
        options: [],
      };

      // Process options for multiple choice
      if (question.type === "multiple_choice") {
        // Try to get options from different possible fields
        const rawOptions = q.options || q.choices || [];

        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          question.options = rawOptions.map((opt: any, optIndex: number) => {
            const optText =
              opt.text || opt.choice_text || `Option ${optIndex + 1}`;
            // Detect if this is the correct option
            let isCorrect = false;

            if (opt.isCorrect !== undefined) {
              isCorrect = Boolean(opt.isCorrect);
            } else if (opt.is_correct !== undefined) {
              isCorrect = Boolean(opt.is_correct);
            } else if (opt.correct !== undefined) {
              isCorrect = Boolean(opt.correct);
            }

            // If this option text matches the model answer, mark it as correct
            if (
              !isCorrect &&
              question.modelAnswer &&
              optText.toLowerCase() === question.modelAnswer.toLowerCase()
            ) {
              isCorrect = true;
            }

            return {
              text: optText,
              isCorrect: isCorrect,
            };
          });
        } else {
          // If no options were provided but type is multiple_choice, create default options
          question.options = [
            { text: "Option 1", isCorrect: true },
            { text: "Option 2", isCorrect: false },
            { text: "Option 3", isCorrect: false },
          ];
        }

        // Ensure at least one option is correct
        const hasCorrectOption = question.options.some((opt) => opt.isCorrect);
        if (!hasCorrectOption && question.options.length > 0) {
          question.options[0].isCorrect = true;

          // If there's a model answer, try to find a matching option
          if (question.modelAnswer) {
            for (let i = 0; i < question.options.length; i++) {
              if (
                question.options[i].text
                  .toLowerCase()
                  .includes(question.modelAnswer.toLowerCase())
              ) {
                // Reset all options
                question.options.forEach((opt) => (opt.isCorrect = false));
                // Set this option as correct
                question.options[i].isCorrect = true;
                break;
              }
            }
          }
        }

        // Update model answer based on the correct option if not already set
        if (!question.modelAnswer) {
          const correctOption = question.options.find((opt) => opt.isCorrect);
          if (correctOption) {
            question.modelAnswer = correctOption.text;
          }
        }
      }

      return question;
    });
  }

  // Fallback if no questions were extracted
  if (result.questions.length === 0) {
    result.questions = defaultExam.questions;
  }

  console.log("Processed exam structure:", JSON.stringify(result, null, 2));
  return result;
};
