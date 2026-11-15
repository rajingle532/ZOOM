import jwt from "jsonwebtoken";
import httpStatus from "http-status";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    // Graceful fallback for backward compatibility
    if (!token) {
        token = req.query?.token || req.body?.token;
    }

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: "Access token required. Please sign in."
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "pulse_meet_super_secret_jwt_key_2026_xyz"
        );
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
