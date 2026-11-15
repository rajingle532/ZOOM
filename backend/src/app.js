import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.use("/api/users", userRoutes);

app.get("/home", (req, res) => {
    return res.json({ hello: "World" });
});

const start = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is required");
    }
    const connectionDb = await mongoose.connect(mongoUri);

    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
        console.log(`LISTENING ON PORT ${app.get("port")}`);
    });
};

start().catch((error) => {
    console.error("Backend failed to start:", error.message);
    process.exitCode = 1;
});