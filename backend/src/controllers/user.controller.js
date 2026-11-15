import httpStatus from "http-status";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { config } from "../config.js";

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
            username: user.username
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
            password: hashedPassword
        };
        if (lowerEmail) {
            userData.email = lowerEmail;
        }

        const newUser = new User(userData);
        await newUser.save();

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

export { login, register, getUserHistory, addToHistory };
