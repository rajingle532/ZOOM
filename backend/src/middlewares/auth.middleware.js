import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { config } from "../config.js";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token = null;

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.query?.token && typeof req.query.token === "string") {
        token = req.query.token;
    } else if (req.body?.token && typeof req.body.token === "string") {
        token = req.body.token;
    }

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

export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token = null;

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.query?.token && typeof req.query.token === "string") {
        token = req.query.token;
    } else if (req.body?.token && typeof req.body.token === "string") {
        token = req.body.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = decoded;
        } catch {
            // Token expired or invalid; proceed as unauthenticated without failing
        }
    }
    next();
};
