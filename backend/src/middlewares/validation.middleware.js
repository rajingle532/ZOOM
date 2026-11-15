import { z } from "zod";
import httpStatus from "http-status";

// Register validation schema
export const registerSchema = z.object({
    name: z
        .string({ required_error: "Name is required" })
        .trim()
        .min(1, { message: "Name must be between 1 and 50 characters" })
        .max(50, { message: "Name must be between 1 and 50 characters" }),
    username: z
        .string({ required_error: "Username is required" })
        .trim()
        .toLowerCase()
        .min(3, { message: "Username must be between 3 and 24 characters" })
        .max(24, { message: "Username must be between 3 and 24 characters" })
        .regex(/^[a-zA-Z0-9_]+$/, {
            message: "Username can only contain letters, numbers, and underscores"
        }),
    password: z
        .string({ required_error: "Password is required" })
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(72, { message: "Password cannot exceed 72 characters" })
        .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
            message: "Password must contain at least one letter and one number"
        })
});

// Login validation schema (Addendum A: non-empty, max 128 chars, no lowercasing/regex)
export const loginSchema = z.object({
    username: z
        .string({ required_error: "Username is required" })
        .min(1, { message: "Username is required" })
        .max(128, { message: "Username is too long" }),
    password: z
        .string({ required_error: "Password is required" })
        .min(1, { message: "Password is required" })
        .max(128, { message: "Password is too long" })
});

// Add to activity schema (accepts meetingCode or meeting_code)
export const activitySchema = z
    .object({
        meetingCode: z.string().optional(),
        meeting_code: z.string().optional()
    })
    .refine((data) => Boolean(data.meetingCode || data.meeting_code), {
        message: "Meeting code is required",
        path: ["meetingCode"]
    })
    .transform((data) => ({
        meetingCode: (data.meetingCode || data.meeting_code || "").trim()
    }))
    .pipe(
        z.object({
            meetingCode: z
                .string()
                .min(3, { message: "Meeting code must be between 3 and 64 characters" })
                .max(64, { message: "Meeting code must be between 3 and 64 characters" })
                .regex(/^[a-zA-Z0-9-_]+$/, {
                    message: "Meeting code can only contain letters, numbers, hyphens, and underscores"
                })
        })
    );

// Reusable Express middleware for Zod validation
export const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse(req.body ?? {});
        req.body = parsed;
        next();
    } catch (err) {
        if (err instanceof z.ZodError) {
            const fieldErrors = {};
            for (const issue of err.issues) {
                const fieldName = issue.path[0] || "general";
                if (!fieldErrors[fieldName]) {
                    fieldErrors[fieldName] = issue.message;
                }
            }
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Validation failed",
                errors: fieldErrors
            });
        }
        next(err);
    }
};
