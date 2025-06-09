import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";

import { config } from "./config.ts";
import { setupVite, serveStatic, log } from "./vite";

import authRoutes from "./routers/authRoutes";
import profRoutes from "./routers/profRoutes";
import studRoutes from "./routers/studRoutes";
import { upload } from "./utils/multer";
import * as profController from "./controllers/profController";

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    // Add these headers to ensure cookies work properly
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["set-cookie"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Use routers
app.use("/api", authRoutes);
app.use("/api", profRoutes);
app.use("/api", studRoutes);

// Upload and process exam photos with AI
app.post(
  "/api/exams/upload",
  upload.array("examPhotos", 10),
  profController.uploadExamPhotos
);

// Upload student answer images
app.post(
  "/api/upload-student-answers",
  upload.array("images", 10),
  profController.uploadStudentAnswers
);

(async () => {
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    let status = err.status || err.statusCode || 500;
    if (typeof status !== "number" || isNaN(status)) {
      status = 500;
    }

    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (config.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen(Number(config.PORT), "0.0.0.0", () => {
    log(`serving on port ${config.PORT}`);
  });
})();
