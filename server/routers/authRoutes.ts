import express, { Router } from "express";
import * as authController from "../controllers/authController";

const router: Router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/profile", authController.protect, authController.profile);
router.patch(
  "/change-password",
  authController.protect,
  authController.updatePassword
);
router.get("/user", authController.protect, authController.getUserFromRequest);

export default router;
