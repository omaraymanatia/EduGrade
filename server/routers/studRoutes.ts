import express, { Router } from 'express';
import * as authController from '../controllers/authController';
import * as studController from '../controllers/studController';

const router: Router = express.Router();

router.post(
  '/verify-exam-key',
  authController.protect,
  authController.restrictTo('student'),
  studController.verifyExamKey
);
router.post(
  '/start-exam',
  authController.protect,
  authController.restrictTo('student'),
  studController.startExam
);
router.post(
  '/submit-answer',
  authController.protect,
  authController.restrictTo('student'),
  studController.submitAnswer
);
router.post(
  '/complete-exam',
  authController.protect,
  authController.restrictTo('student'),
  studController.completeExam
);

export default router;
