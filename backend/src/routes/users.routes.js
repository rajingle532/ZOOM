import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    addToHistory,
    getUserHistory,
    login,
    register,
    sendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    addEmail
} from "../controllers/user.controller.js";
import { authenticateToken, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    validate,
    registerSchema,
    loginSchema,
    activitySchema,
    sendVerificationSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    addEmailSchema
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

// Rate Limiter: 10 email actions per 15 minutes per IP
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: { message: "Too many requests. Please wait a few minutes before trying again." }
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

// Public Authentication Endpoints
router.route("/login").post(loginLimiter, validate(loginSchema), login);
router.route("/register").post(registerLimiter, validate(registerSchema), register);

// Email Verification & Password Recovery Endpoints
router.route("/send-verification").post(emailLimiter, optionalAuth, validate(sendVerificationSchema), sendVerification);
router.route("/verify-email").post(emailLimiter, optionalAuth, validate(verifyEmailSchema), verifyEmail);
router.route("/forgot-password").post(emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password").post(emailLimiter, validate(resetPasswordSchema), resetPassword);

// Protected User Endpoints (Require valid JWT)
router.route("/add-email").post(generalLimiter, authenticateToken, validate(addEmailSchema), addEmail);
router.route("/add_to_activity").post(generalLimiter, authenticateToken, validate(activitySchema), addToHistory);
router.route("/get_all_activity").get(generalLimiter, authenticateToken, getUserHistory);

export default router;
