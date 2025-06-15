import axios from "axios";

interface AIDetectionResponse {
  classification: string;
  confidence: string;
  confidence_score: number;
  human_probability: number;
  machine_probability: number;
}

export const detectAIUsage = async (
  text: string
): Promise<AIDetectionResponse | null> => {
  try {
    // Update to use the dedicated DeBERTa model API on port 8000
    const { data } = await axios.post("http://localhost:8000/detect", {
      text,
    });

    console.log("AI Detection Response:", data);
    return data;
  } catch (error) {
    console.error("AI Detection Service Error:", error);
    console.log("Falling back to backup AI detection service");

    // Fallback to the roberta_api implementation if the main one fails
    try {
      const { data } = await axios.post("http://localhost:7000/detect-ai", {
        text,
      });
      console.log("Fallback AI Detection Response:", data);
      return data;
    } catch (fallbackError) {
      console.error("Fallback AI Detection Service Error:", fallbackError);
      return null;
    }
  }
};

export const isAIGenerated = (
  response: AIDetectionResponse | null
): boolean => {
  if (!response) return false; // Default to not AI-generated when service is down
  return response.classification.includes("Machine-Generated");
};

export const getHumanProbability = (
  response: AIDetectionResponse | null
): number => {
  if (!response) return 1.0; // Default to 100% human when service is down
  return response.human_probability / 100; // Convert percentage to decimal
};
