import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    addToHistory,
    getUserHistory,
    login,
    register
} from "../controllers/user.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    validate,
    registerSchema,
    loginSchema,
    activitySchema
} from "../middlewares/validation.middleware.js";

const router = Router();

// Rate Limiter: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many attempts, try again later." }
});

// Rate Limiter: 5 registrations per 1 hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many attempts, try again later." }
});

// Public routes with validation & rate limiting
router.route("/login").post(loginLimiter, validate(loginSchema), login);
router.route("/register").post(registerLimiter, validate(registerSchema), register);

// Protected routes (require valid JWT)
router.route("/add_to_activity").post(authenticateToken, validate(activitySchema), addToHistory);
router.route("/get_all_activity").get(authenticateToken, getUserHistory);

export default router;
