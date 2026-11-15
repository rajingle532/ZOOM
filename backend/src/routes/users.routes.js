import { Router } from "express";
import { addToHistory, getUserHistory, login, register } from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/login").post(login);
router.route("/register").post(register);

// Protected routes (require valid JWT)
router.route("/add_to_activity").post(authenticateToken, addToHistory);
router.route("/get_all_activity").get(authenticateToken, getUserHistory);

export default router;
