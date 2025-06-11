import axios from "axios";

export const detectAIUsage = async (
  text: string
): Promise<"Machine-Generated" | "Human-Written"> => {
  try {
    const { data } = await axios.post("http://localhost:7000/detect", { text });

    console.log("AI Detection Response:", data);

    const ans = data.classification;
    console.log("AI Detection Classification:", ans);

    return data.classification.includes("Machine-Generated")
      ? "Machine-Generated"
      : "Human-Written";
  } catch (error) {
    console.error("AI Detection Service Error:");
    // Default to human-written when service is unavailable to avoid penalizing students
    return "Human-Written";
  }
};
