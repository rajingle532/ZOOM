import httpStatus from "http-status";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { config } from "../config.js";
import { sendVerificationOtpEmail, sendPasswordResetEmail } from "../services/email.service.js";

// Precomputed valid bcrypt hash generated at startup to equalize timing against user enumeration
const DUMMY_BCRYPT_HASH = bcrypt.hashSync("dummy-password-for-timing", config.bcryptRounds);

const login = async (req, res) => {
    const identifier = (req.body?.identifier || req.body?.username || "").trim();
    const { password } = req.body ?? {};

    try {
        let user;
        if (identifier.includes("@")) {
            user = await User.findOne({ email: identifier.toLowerCase() }).select("+password");
        } else {
            user = await User.findOne({ username: identifier })
                .collation({ locale: "en", strength: 2 })
                .select("+password");
        }

        if (!user) {
            // Perform dummy compare to equalize response timing against user enumeration
            await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid username or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid username or password"
            });
        }

        // Generate signed JWT using stored user.username
        const token = jwt.sign(
            { id: user._id, username: user.username, name: user.name },
            config.jwtSecret,
            { expiresIn: "7d" }
        );

        const userResponse = {
            id: user._id,
            name: user.name,
            username: user.username,
            isVerified: Boolean(user.isVerified)
        };
        if (user.email) {
            userResponse.email = user.email;
        }

        return res.status(httpStatus.OK).json({
            token,
            user: userResponse
        });
    } catch (e) {
        console.error(`Login internal error: ${e.name} ${e.code || ""}`);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const register = async (req, res) => {
    const { name, username, email, password } = req.body ?? {};

    try {
        const lowerEmail = email ? email.toLowerCase().trim() : undefined;

        // Duplicate check for email
        if (lowerEmail) {
            const existingEmail = await User.findOne({ email: lowerEmail });
            if (existingEmail) {
                return res.status(httpStatus.CONFLICT).json({
                    message: "User already exists",
                    errors: {
                        email: "This email is already registered"
                    }
                });
            }
        }

        // Case-insensitive duplicate check using collation for username
        const existingUser = await User.findOne({ username }).collation({
            locale: "en",
            strength: 2
        });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                message: "User already exists",
                errors: {
                    username: "This username is taken"
                }
            });
        }

        const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

        const userData = {
            name,
            username,
            password: hashedPassword,
            isVerified: false
        };

        let otpCode = null;
        if (lowerEmail) {
            userData.email = lowerEmail;
            otpCode = crypto.randomInt(100000, 999999).toString();
            userData.verificationToken = otpCode;
            userData.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        }

        const newUser = new User(userData);
        await newUser.save();

        // Send verification email in background if email was provided
        if (lowerEmail && otpCode) {
            sendVerificationOtpEmail(lowerEmail, name, otpCode).catch((err) => {
                console.error("Background verification email error:", err.message);
            });
        }

        return res.status(httpStatus.CREATED).json({
            message: "User Registered Successfully"
        });
    } catch (e) {
        if (e.code === 11000) {
            const keyPattern = e.keyPattern || {};
            const errors = {};
            if (keyPattern.email) {
                errors.email = "This email is already registered";
            } else if (keyPattern.username) {
                errors.username = "This username is taken";
            } else {
                errors.username = "User already exists";
            }
            return res.status(httpStatus.CONFLICT).json({
                message: "User already exists",
                errors
            });
        }
        console.error(`User registration internal error: ${e.name} ${e.code || ""}`);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const sendVerification = async (req, res) => {
    try {
        let user;
        if (req.user?.id) {
            user = await User.findById(req.user.id);
        } else if (req.body?.email) {
            user = await User.findOne({ email: req.body.email.trim().toLowerCase() });
        } else if (req.body?.username) {
            user = await User.findOne({ username: req.body.username.trim() }).collation({ locale: "en", strength: 2 });
        }

        if (!user || !user.email) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "No user account found with that email address"
            });
        }

        if (user.isVerified) {
            return res.status(httpStatus.OK).json({
                message: "Your email address is already verified"
            });
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        user.verificationToken = otpCode;
        user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        await sendVerificationOtpEmail(user.email, user.name, otpCode);

        return res.status(httpStatus.OK).json({
            message: "Verification code sent to your email"
        });
    } catch (e) {
        console.error("Send verification error:", e.name, e.code || "");
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const verifyEmail = async (req, res) => {
    const { code, email } = req.body ?? {};

    try {
        let user;
        if (req.user?.id) {
            user = await User.findById(req.user.id).select("+verificationToken +verificationTokenExpires");
        } else if (email) {
            user = await User.findOne({ email: email.trim().toLowerCase() }).select("+verificationToken +verificationTokenExpires");
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "User account not found"
            });
        }

        if (user.isVerified) {
            return res.status(httpStatus.OK).json({
                message: "Email is already verified",
                isVerified: true
            });
        }

        if (!user.verificationToken || !user.verificationTokenExpires) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "No active verification code. Please request a new code."
            });
        }

        if (user.verificationTokenExpires < new Date()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Verification code has expired. Please request a new code."
            });
        }

        if (user.verificationToken !== code.trim()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Invalid verification code"
            });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Email verified successfully",
            isVerified: true
        });
    } catch (e) {
        console.error("Verify email error:", e.name, e.code || "");
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body ?? {};

    try {
        const lowerEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: lowerEmail });

        // Mitigate user enumeration by returning uniform success message
        if (!user) {
            return res.status(httpStatus.OK).json({
                message: "If that email is registered, a password reset link has been sent."
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        const frontendOrigin = req.headers.origin || "http://localhost:3000";
        const resetUrl = `${frontendOrigin}/auth?reset_token=${resetToken}&email=${encodeURIComponent(user.email)}`;

        await sendPasswordResetEmail(user.email, user.name, resetUrl);

        return res.status(httpStatus.OK).json({
            message: "If that email is registered, a password reset link has been sent."
        });
    } catch (e) {
        console.error("Forgot password error:", e.name, e.code || "");
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body ?? {};

    try {
        const user = await User.findOne({
            resetPasswordToken: token.trim(),
            resetPasswordExpires: { $gt: new Date() }
        }).select("+password");

        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Invalid or expired password reset token"
            });
        }

        const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Password reset successfully. You can now sign in with your new password."
        });
    } catch (e) {
        console.error("Reset password error:", e.name, e.code || "");
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const addEmail = async (req, res) => {
    const { email } = req.body ?? {};

    try {
        const lowerEmail = email.trim().toLowerCase();

        // Check if email is already taken by another account
        const existing = await User.findOne({
            email: lowerEmail,
            _id: { $ne: req.user.id }
        });

        if (existing) {
            return res.status(httpStatus.CONFLICT).json({
                message: "User already exists",
                errors: {
                    email: "This email is already registered"
                }
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "User account not found"
            });
        }

        user.email = lowerEmail;
        user.isVerified = false;

        const otpCode = crypto.randomInt(100000, 999999).toString();
        user.verificationToken = otpCode;
        user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        sendVerificationOtpEmail(lowerEmail, user.name, otpCode).catch((err) => {
            console.error("Add email verification send error:", err.message);
        });

        return res.status(httpStatus.OK).json({
            message: "Email added successfully. A verification code has been sent.",
            email: user.email,
            isVerified: false
        });
    } catch (e) {
        console.error("Add email error:", e.name, e.code || "");
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const username = req.user?.username;
        if (!username) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "User not authenticated"
            });
        }

        const meetings = await Meeting.find({ user_id: username }).sort({ date: -1 });
        return res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        console.error("Get user history internal error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const addToHistory = async (req, res) => {
    const code = req.body?.meetingCode;

    if (!code) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Meeting code is required"
        });
    }

    try {
        const username = req.user?.username;
        if (!username) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "User not authenticated"
            });
        }

        // De-duplicate: skip creating row if added within the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentMeeting = await Meeting.findOne({
            user_id: username,
            meetingCode: code,
            date: { $gte: twoMinutesAgo }
        });

        if (recentMeeting) {
            return res.status(httpStatus.OK).json({
                message: "Added code to history"
            });
        }

        const newMeeting = new Meeting({
            user_id: username,
            meetingCode: code
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            message: "Added code to history"
        });
    } catch (e) {
        console.error("Add to history internal error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

export {
    login,
    register,
    sendVerification,
    verifyEmail,
    forgotPassword,
    resetPassword,
    addEmail,
    getUserHistory,
    addToHistory
};
