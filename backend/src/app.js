import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";

import config from "./config.js";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", config.port);

// Trust reverse proxy if configured in environment
if (config.trustProxy) {
    app.set("trust proxy", 1);
}

// Security headers & banner concealment
app.use(helmet());
app.disable("x-powered-by");

// Strict Origin Matching CORS
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (tools, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        const corsError = new Error("Not allowed by CORS policy");
        corsError.status = 403;
        return callback(corsError);
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
    return res.status(200).json({ ok: true });
});

// Primary API Routes
app.use("/api/v1/users", userRoutes);

// 404 JSON Handler for unmatched routes
app.use((req, res) => {
    return res.status(404).json({ message: "Route not found" });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

    // Conceal internal error details in all 500 responses
    if (status === 500) {
        return res.status(500).json({ message: "Internal server error" });
    }

    return res.status(status).json({
        message: err.message || "An unexpected error occurred"
    });
});

const start = async () => {
    const connectionDb = await mongoose.connect(config.mongoUri);
    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
        console.log(`LISTENING ON PORT ${app.get("port")} (${config.nodeEnv})`);
    });
};

// Graceful Shutdown Handlers: io.close() closes sockets and underlying HTTP server
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Process] ${signal} received. Initiating graceful shutdown...`);

    io.close(() => {
        console.log("[Process] Socket.io and HTTP server closed.");
        mongoose.connection
            .close(false)
            .then(() => {
                console.log("[Process] MongoDB connection closed.");
                process.exit(0);
            })
            .catch((err) => {
                console.error("[Process] Error closing MongoDB:", err);
                process.exit(1);
            });
    });

    // Force exit after 10-second timeout
    setTimeout(() => {
        console.error("[Process] Forceful shutdown triggered after timeout.");
        process.exit(1);
    }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start().catch((error) => {
    console.error("Backend failed to start:", error.message);
    process.exitCode = 1;
});
