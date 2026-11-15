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

// Rate Limiter: 10 failed attempts per 15 minutes per IP (skips successful logins)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many attempts, try again later." }
});

// Rate Limiter: 5 registrations per 1 hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many attempts, try again later." }
});

// General Limiter: 300 requests per 15 minutes per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many attempts, try again later." }
});

// Public routes with validation & rate limiting
router.route("/login").post(loginLimiter, validate(loginSchema), login);
router.route("/register").post(registerLimiter, validate(registerSchema), register);

// Protected routes (require valid JWT and subject to general rate limit)
router.route("/add_to_activity").post(generalLimiter, authenticateToken, validate(activitySchema), addToHistory);
router.route("/get_all_activity").get(generalLimiter, authenticateToken, getUserHistory);

export default router;
