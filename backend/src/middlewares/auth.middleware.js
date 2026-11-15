import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { config } from "../config.js";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token =
        authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Access token required. Please sign in."
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Session expired. Please log in again."
            });
        }
        return res.status(httpStatus.FORBIDDEN).json({
            message: "Invalid or malformed authentication token."
        });
    }
};
