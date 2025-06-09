import express, { Router } from "express";

import * as authController from "../controllers/authController";
import * as profController from "../controllers/profController";

const router: Router = express.Router();

router
  .route("/exams")
  .get(
    authController.protect,
    authController.restrictTo("professor"),
    profController.getAllExams
  )
  .post(
    authController.protect,
    authController.restrictTo("professor"),
    profController.createExam
  );

router
  .route("/exams/:id")
  .all(authController.protect, authController.restrictTo("professor"))
  .get(profController.getExamByID)
  .patch(profController.updateExam)
  .delete(profController.deleteExam);

// The upload routes are handled in index.ts with multer

export default router;
