import { Request, Response } from "express";
import axios from "axios";

const VLM_API_URL = process.env.VLM_API_URL || "http://localhost:6000";

export const getSystemStatus = async (req: Request, res: Response) => {
  const status = {
    database: true,
    vlmService: false,
    storage: true,
  };

  // Check VLM service
  try {
    await axios.get(`${VLM_API_URL}/health`, { timeout: 2000 });
    status.vlmService = true;
  } catch (error) {
    status.vlmService = false;
  }

  res.json({
    status:
      status.database && status.vlmService && status.storage
        ? "healthy"
        : "degraded",
    components: status,
    timestamp: new Date().toISOString(),
  });
};
