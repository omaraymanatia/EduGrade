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
    const { data } = await axios.post(
      "http://localhost:8000/detect",
      {
        text,
      },
      {
        timeout: 5000, // Add timeout to prevent long waits
      }
    );

    console.log("AI Detection Response:", data);
    return data;
  } catch (error) {
    console.error("AI Detection Service Error:", error);
    console.log("Falling back to backup AI detection service");

    // Fallback to the roberta_api implementation if the main one fails
    try {
      const { data } = await axios.post(
        "http://localhost:7000/detect-ai",
        {
          text,
        },
        {
          timeout: 5000, // Add timeout to prevent long waits
        }
      );
      console.log("Fallback AI Detection Response:", data);
      return data;
    } catch (fallbackError) {
      console.error("Fallback AI Detection Service Error:", fallbackError);
      // Return a default response when both services fail
      return {
        classification: "Human-Written",
        confidence: "Default",
        confidence_score: 0,
        human_probability: 100,
        machine_probability: 0,
      };
    }
  }
};

export const isAIGenerated = (
  response: AIDetectionResponse | null
): boolean => {
  if (!response) return false; // Default to not AI-generated when service is down
  return (
    response.classification.includes("Machine-Generated") ||
    response.machine_probability > 70 // Consider machine-generated if probability > 70%
  );
};

export const getHumanProbability = (
  response: AIDetectionResponse | null
): number => {
  if (!response) return 1.0; // Default to 100% human when service is down
  return Math.max(0.1, response.human_probability / 100); // Convert percentage to decimal with minimum 0.1
};
