import express, { Router } from "express";

import * as authController from "../controllers/authController";
import * as profController from "../controllers/profController";
import checkVlmService from "../middlewares/checkVlmService";

const router: Router = express.Router();

// Remove the /me route which is not defined in profController
// router.get('/me', authController.protect, profController.me);

// Use authController.me instead if you need user profile data
router.get("/me", authController.protect, authController.me);

router
  .route("/exams")
  .get(
    authController.protect,
    /*authController.restrictTo("professor"),*/
    profController.getAllExams
  )
  .post(
    authController.protect,
    authController.restrictTo("professor"),
    profController.createExam
  );

// Add a new route specifically for VLM-powered exam creation
router.post(
  "/exams/from-photos",
  authController.protect,
  authController.restrictTo("professor"),
  checkVlmService, // Add this middleware
  profController.uploadExamPhotos
);

router
  .route("/exams/:id")
  .all(authController.protect /*authController.restrictTo("professor")*/)
  .get(profController.getExamByID)
  .put(profController.updateExam) // Changed from PATCH to PUT for the full update
  .patch(profController.updateExam)
  .delete(profController.deleteExam);

export default router;
