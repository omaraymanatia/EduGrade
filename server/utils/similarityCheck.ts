import axios from "axios";

interface SimilarityResponse {
  rag_answer: string;
  similarity_scores: {
    student_doctor: number;
    student_rag: number;
    average: number;
  };
}

export const checkSimilarity = async (
  question: string,
  doctorAnswer: string,
  studentAnswer: string
): Promise<SimilarityResponse | null> => {
  try {
    // Ensure we're connecting to the right endpoint at port 7000
    const { data } = await axios.post(
      "http://localhost:7000/compare-answers",
      {
        question,
        doctor_answer: doctorAnswer,
        student_answer: studentAnswer,
      },
      {
        timeout: 10000, // Increase timeout for this potentially slower operation
      }
    );

    console.log("Similarity Response:", data);
    return data;
  } catch (error) {
    console.error("Similarity Service Error:", error);

    // Return a basic response with modest similarity when service fails
    return {
      rag_answer: "Service unavailable",
      similarity_scores: {
        student_doctor: calculateBasicSimilarity(studentAnswer, doctorAnswer),
        student_rag: 0,
        average: calculateBasicSimilarity(studentAnswer, doctorAnswer) * 0.5, // Half the direct similarity as fallback
      },
    };
  }
};

export const calculateScoreFromSimilarity = (
  similarity: SimilarityResponse | null,
  maxPoints: number
): number => {
  if (!similarity) return 0;

  // Use average_similarity if available, otherwise use student_to_doctor
  const similarityScore =
    similarity.similarity_scores.average ||
    similarity.similarity_scores.student_doctor ||
    0;

  // Implement the tiered scoring system
  if (similarityScore >= 0.8) {
    return maxPoints; // 100% of points
  } else if (similarityScore >= 0.6) {
    return Math.round(maxPoints * 0.75); // 75% of points
  } else if (similarityScore >= 0.4) {
    return Math.round(maxPoints * 0.5); // 50% of points
  } else {
    return 0; // Below threshold, no points
  }
};

// Basic similarity calculation as a fallback when the service is down
const calculateBasicSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;

  // Convert to lowercase and remove extra spaces
  const normalizedText1 = text1.toLowerCase().trim().replace(/\s+/g, " ");
  const normalizedText2 = text2.toLowerCase().trim().replace(/\s+/g, " ");

  // Get word sets
  const words1 = new Set(normalizedText1.split(/\s+/));
  const words2 = new Set(normalizedText2.split(/\s+/));

  // Calculate intersection
  const intersection = new Set([...words1].filter((word) => words2.has(word)));

  // Calculate Jaccard similarity
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
};
