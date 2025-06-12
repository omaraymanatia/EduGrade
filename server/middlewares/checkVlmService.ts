import axios from "axios";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";

const VLM_API_URL = process.env.VLM_API_URL || "http://localhost:6000";

/**
 * Middleware to check if the VLM service is available
 */
const checkVlmService = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to reach the VLM service health check endpoint
    const response = await axios.get(`${VLM_API_URL}/health`, {
      timeout: 3000,
    });

    if (response.status === 200) {
      console.log("VLM service is available");
      next();
    } else {
      throw new Error(`VLM service responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error("VLM service check failed:", error);
    return next(
      new AppError(
        "AI processing service is unavailable. Please try creating an exam manually or contact support.",
        503
      )
    );
  }
};

export default checkVlmService;
