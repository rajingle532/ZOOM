import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pulse_meet_super_secret_jwt_key_2026_xyz";

const login = async (req, res) => {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide username and password"
        });
    }

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid username or password"
            });
        }

        // Generate signed JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        user.token = token;
        await user.save();

        return res.status(httpStatus.OK).json({
            token: token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username
            }
        });

    } catch (e) {
        console.error("Login failed:", e);

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Something went wrong: ${e.message}`
        });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body ?? {};

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide name, username, and password"
        });
    }

    try {
        const existingUser = await User.findOne({ username });

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
        console.error("User registration failed:", e);

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `User registration failed: ${e.message}`
        });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const username = req.user?.username;
        if (!username) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated" });
        }

        const meetings = await Meeting.find({ user_id: username }).sort({ date: -1 });
        return res.json(meetings);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code, meetingCode } = req.body;
    const code = meeting_code || meetingCode;

    if (!code) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    }

    try {
        const username = req.user?.username;
        if (!username) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not authenticated" });
        }

        const newMeeting = new Meeting({
            user_id: username,
            meetingCode: code
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
};

export { login, register, getUserHistory, addToHistory };
