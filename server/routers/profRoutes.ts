import express, { Router } from 'express';

import * as authController from '../controllers/authController';
import * as profController from '../controllers/profController';

const router: Router = express.Router();

router
  .route('/exams')
  .get(
    authController.protect,
    authController.restrictTo('professor'),
    profController.getAllExams
  )
  .post(
    authController.protect,
    authController.restrictTo('professor'),
    profController.createExam
  );

router.get(
  '/exams/:id',
  authController.protect,
  authController.restrictTo('professor'),
  profController.getExamByID
);

router.post(
  'exams/upload',
  authController.protect,
  authController.restrictTo('professor'),
  profController.upload
);

router.post(
  'upload-student-answers',
  authController.protect,
  authController.restrictTo('professor'),
  profController.uploadStudentAnswers
);

export default router;
