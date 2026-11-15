import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("FATAL CONFIG ERROR: JWT_SECRET environment variable is missing.");
}
if (JWT_SECRET.length < 32) {
    throw new Error("FATAL CONFIG ERROR: JWT_SECRET must be at least 32 characters long.");
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("FATAL CONFIG ERROR: MONGODB_URI environment variable is missing.");
}

const PORT = parseInt(process.env.PORT, 10) || 8000;

// Parse comma-separated list of allowed origins
const rawOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

// Automatically allow localhost:3000 only in non-production environments
if (!isProduction && !rawOrigins.includes("http://localhost:3000")) {
    rawOrigins.push("http://localhost:3000");
}

const TRUST_PROXY =
    process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";

const MAX_ROOM_SIZE = parseInt(process.env.MAX_ROOM_SIZE, 10) || 4;

export const config = {
    port: PORT,
    mongoUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
    allowedOrigins: rawOrigins,
    nodeEnv: NODE_ENV,
    isProduction,
    trustProxy: TRUST_PROXY,
    maxRoomSize: MAX_ROOM_SIZE
};

export default config;
