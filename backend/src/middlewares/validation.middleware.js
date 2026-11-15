import { z } from "zod";
import httpStatus from "http-status";

// Register validation schema
export const registerSchema = z.object({
    name: z
        .string({ error: "Name is required" })
        .trim()
        .min(1, { error: "Name must be between 1 and 50 characters" })
        .max(50, { error: "Name must be between 1 and 50 characters" }),
    email: z
        .string({ error: "Email is required" })
        .trim()
        .min(1, { error: "Email is required" })
        .max(254, { error: "Enter a valid email address" })
        .toLowerCase()
        .email({ error: "Enter a valid email address" }),
    username: z
        .string({ error: "Username is required" })
        .trim()
        .toLowerCase()
        .min(3, { error: "Username must be between 3 and 24 characters" })
        .max(24, { error: "Username must be between 3 and 24 characters" })
        .regex(/^[a-zA-Z0-9_]+$/, {
            error: "Username can only contain letters, numbers, and underscores"
        }),
    password: z
        .string({ error: "Password is required" })
        .min(8, { error: "Password must be at least 8 characters long" })
        .max(72, { error: "Password cannot exceed 72 characters" })
        .refine((val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
            message: "Password must contain at least one letter and one number"
        })
});

// Login validation schema: accepts username or identifier alias, normalizes to req.body.identifier
export const loginSchema = z
    .preprocess(
        (val) => {
            if (val && typeof val === "object") {
                const raw = val.identifier !== undefined ? val.identifier : val.username;
                return {
                    ...val,
                    identifier: typeof raw === "string" ? raw.trim() : raw,
                    username: typeof raw === "string" ? raw.trim() : raw
                };
            }
            return val;
        },
        z.object({
            identifier: z
                .string({ error: "Username or email is required" })
                .min(1, { error: "Username or email is required" })
                .max(254, { error: "Username or email is too long" }),
            username: z.string().optional(),
            password: z
                .string({ error: "Password is required" })
                .min(1, { error: "Password is required" })
                .max(128, { error: "Password is too long" })
        })
    );

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
                .string({ error: "Meeting code is required" })
                .min(3, { error: "Meeting code must be between 3 and 64 characters" })
                .max(64, { error: "Meeting code must be between 3 and 64 characters" })
                .regex(/^[a-zA-Z0-9_-]+$/, {
                    error: "Meeting code can only contain letters, numbers, hyphens, and underscores"
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
