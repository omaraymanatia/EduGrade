import express, { Router } from "express";
import * as authController from "../controllers/authController";

const router: Router = express.Router();

router.post("/register", authController.signup);
router.post("/login", authController.login);
router.post("/profile", authController.protect, authController.profile);
router.patch(
  "/change-password",
  authController.protect,
  authController.updatePassword
);
router.get("/user", authController.protect, authController.me); // Changed to authController.me
router.post("/logout", authController.logout); // Added logout route

export default router;
