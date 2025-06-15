import axios from "axios";

interface SimilarityResponse {
  rag_answer: string;
  similarity_scores: {
    student_to_doctor: number;
    student_to_rag: number;
    doctor_to_rag: number;
    average_similarity: number;
  };
}

export const checkSimilarity = async (
  question: string,
  doctorAnswer: string,
  studentAnswer: string
): Promise<SimilarityResponse | null> => {
  try {
    // Ensure we're connecting to the right endpoint at port 7000
    const { data } = await axios.post("http://localhost:7000/compare-answers", {
      question,
      doctor_answer: doctorAnswer,
      student_answer: studentAnswer,
    });

    console.log("Similarity Response:", data);
    return data;
  } catch (error) {
    console.error("Similarity Service Error:", error);
    // Return null to indicate service unavailability
    return null;
  }
};

export const calculateScoreFromSimilarity = (
  similarity: SimilarityResponse | null,
  maxPoints: number
): number => {
  if (!similarity) return 0;

  // Use average_similarity if available, otherwise use student_to_doctor
  const score =
    similarity.similarity_scores.average_similarity ||
    similarity.similarity_scores.student_to_doctor ||
    0;

  // Convert similarity (0-1) to percentage of maxPoints
  return Math.round(score * maxPoints);
};
