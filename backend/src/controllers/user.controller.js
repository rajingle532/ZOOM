import httpStatus from "http-status";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { config } from "../config.js";

// Standard precomputed 60-character bcrypt hash to normalize comparison timing
const DUMMY_BCRYPT_HASH = "$2b$10$wT8yG9xM8pBq2eF7vD1hce5h8eB4Q6R7uM1rS8nB7oN3vC5wX7yG";

const login = async (req, res) => {
    const { username, password } = req.body ?? {};

    try {
        // Query user explicitly including the select:false password field
        const user = await User.findOne({ username }).select("+password");

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

        // Generate signed JWT without writing it back to the database
        const token = jwt.sign(
            { id: user._id, username: user.username, name: user.name },
            config.jwtSecret,
            { expiresIn: "7d" }
        );

        return res.status(httpStatus.OK).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username
            }
        });
    } catch (e) {
        console.error("Login internal error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Internal server error"
        });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body ?? {};

    try {
        // Case-insensitive duplicate check (e.g., 'Raj' vs 'raj')
        const existingUser = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, "i") }
        });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            message: "User Registered Successfully"
        });
    } catch (e) {
        console.error("User registration internal error:", e);
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
