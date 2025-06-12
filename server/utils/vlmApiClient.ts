import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";

const VLM_API_URL = process.env.VLM_API_URL || "http://localhost:6000";

/**
 * Client for interacting with the VLM API
 */
export class VlmApiClient {
  /**
   * Process exam photos through the VLM API
   *
   * @param filePaths - Array of paths to exam image files
   * @returns Processed exam structure with questions and options
   */
  static async processExamPhotos(filePaths: string[]): Promise<any> {
    try {
      if (!filePaths.length) {
        throw new Error("No files provided for processing");
      }

      console.log(
        `Sending request to process exam photos from: ${filePaths[0]}`
      );

      const form = new FormData();

      // Use the first image file for processing
      const filePath = filePaths[0];
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Add the file with the correct field name 'file'
      form.append("file", fs.createReadStream(filePath), {
        filename: path.basename(filePath),
      });

      console.log(
        "Sending file:",
        path.basename(filePath),
        "size:",
        fs.statSync(filePath).size,
        "bytes"
      );

      // Log the form data keys for debugging
      console.log("Form data keys:", Object.keys(form).join(", "));

      // Make POST request to the API
      const response = await axios.post(
        `${VLM_API_URL}/teacher/process-exam/`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 120000, // 120 seconds timeout
          maxContentLength: Infinity, // Allow for large files
          maxBodyLength: Infinity,
        }
      );

      if (!response.data) {
        throw new Error("No data returned from VLM API");
      }

      console.log("VLM API response received successfully");

      // Return the response data
      return response.data;
    } catch (error: any) {
      // Handle network errors
      if (error.code === "ECONNREFUSED") {
        console.error(
          "Could not connect to VLM API server. Make sure it's running."
        );
        throw new Error(
          "VLM API server connection failed: Is the server running?"
        );
      }

      // Handle timeout errors
      if (error.code === "ETIMEDOUT") {
        console.error("VLM API request timed out");
        throw new Error("VLM API request timed out: Processing took too long");
      }

      // Handle axios errors with response
      if (error.response) {
        console.error(
          "VLM API error:",
          error.response.status,
          error.response.data
        );
        throw new Error(
          `VLM API error (${error.response.status}): ${JSON.stringify(
            error.response.data
          )}`
        );
      }

      // Handle other errors
      console.error("Error processing exam with VLM API:", error.message);
      throw new Error(`VLM API error: ${error.message}`);
    }
  }

  /**
   * Process student answer sheets through the VLM API
   *
   * @param filePaths - Array of paths to student answer image files
   * @param examId - The exam ID to compare against
   * @returns Processed student answers with scores
   */
  static async processStudentAnswers(
    filePaths: string[],
    examId: number
  ): Promise<any> {
    try {
      if (!filePaths.length) {
        throw new Error("No files provided for processing");
      }

      // Use the first image for processing (can be enhanced to handle multiple images)
      const filePath = filePaths[0];

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log(
        `Sending request to process student answers for exam ${examId}`
      );

      const form = new FormData();
      form.append("file", fs.createReadStream(filePath), {
        filename: path.basename(filePath),
      });
      form.append("exam_id", examId.toString());

      const response = await axios.post(
        `${VLM_API_URL}/student/process-answers/`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      if (!response.data) {
        throw new Error("No data returned from VLM API");
      }

      console.log("Student answer processing successful");

      return response.data;
    } catch (error: any) {
      // Handle different types of errors with better messages
      if (error.code === "ECONNREFUSED") {
        console.error(
          "Could not connect to VLM API server. Make sure it's running."
        );
        throw new Error(
          "VLM API server connection failed: Is the server running?"
        );
      }

      if (error.response) {
        console.error(
          "VLM API error:",
          error.response.status,
          error.response.data
        );
        throw new Error(
          `VLM API error (${error.response.status}): ${JSON.stringify(
            error.response.data
          )}`
        );
      }

      console.error(
        "Error processing student answers with VLM API:",
        error.message
      );
      throw new Error(`VLM API error: ${error.message}`);
    }
  }
}
