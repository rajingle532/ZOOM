import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const ALLOWED_EMOJIS = new Set(["👏", "❤️", "👍", "🎉", "😂"]);
const ROOM_CODE_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const MAX_SIGNAL_BYTES = 64 * 1024; // 64 KB limit
const MAX_CHAT_LENGTH = 1000;
const MAX_NAME_LENGTH = 30;
const MAX_STORED_MESSAGES = 100;

// Rate limiting state per socket (10 events per 5 seconds)
const socketRateLimits = new Map();

// In-memory Room Chat History: roomCode -> Array<{ sender, data, socketId, time }>
const roomMessages = new Map();

const isRateLimited = (socketId, limit = 10, windowMs = 5000) => {
    const now = Date.now();
    let state = socketRateLimits.get(socketId);
    if (!state || now > state.resetAt) {
        state = { count: 1, resetAt: now + windowMs };
        socketRateLimits.set(socketId, state);
        return false;
    }
    state.count++;
    return state.count > limit;
};

const sanitizeName = (rawName) => {
    if (typeof rawName !== "string") return "Guest";
    const cleaned = rawName.trim().slice(0, MAX_NAME_LENGTH);
    return cleaned.length > 0 ? cleaned : "Guest";
};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        maxHttpBufferSize: 1e5,
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (config.allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error("CORS origin not allowed for socket"));
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Optional Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (token && typeof token === "string") {
            try {
                const decoded = jwt.verify(token, config.jwtSecret);
                socket.user = decoded;
            } catch {
                // Invalid or expired token treated as Guest (do not reject)
                socket.user = null;
            }
        } else {
            socket.user = null;
        }
        next();
    });

    const resolveRoomCode = (rawPath) => {
        if (!rawPath || typeof rawPath !== "string") return null;
        const segments = rawPath.replace(/^\/+|\/+$/g, "").split("/");
        const code = segments[segments.length - 1];
        if (!code || !ROOM_CODE_REGEX.test(code)) return null;
        return code.toLowerCase();
    };

    io.on("connection", (socket) => {
        const clientIdentity = socket.user?.username || "guest";
        console.log(`[Socket] Connected: ${socket.id} (user: ${clientIdentity})`);

        socket.on("join-call", (path) => {
            // Early return if socket is already in a room
            if (socket.roomCode) {
                console.warn(`[Socket] ${socket.id} attempted duplicate join-call while already in '${socket.roomCode}'`);
                return;
            }

            // Validate non-empty string room code input
            if (!path || typeof path !== "string" || path.trim().length === 0) {
                socket.emit("join-error", {
                    code: "invalid-room",
                    message: "Room code is required"
                });
                return;
            }

            const roomCode = resolveRoomCode(path);
            if (!roomCode) {
                console.warn(`[Socket] ${socket.id} attempted to join invalid room code: ${path}`);
                socket.emit("join-error", {
                    code: "invalid-room",
                    message: "Room code must be 3-64 characters: letters, numbers, - or _"
                });
                return;
            }

            const currentPeers = io.sockets.adapter.rooms.get(roomCode)?.size || 0;
            if (currentPeers >= config.maxRoomSize) {
                console.warn(`[Socket] Room '${roomCode}' is full (${currentPeers}/${config.maxRoomSize}). Rejecting ${socket.id}`);
                socket.emit("room-full", {
                    roomCode,
                    maxRoomSize: config.maxRoomSize,
                    message: `Room ${roomCode} has reached its maximum capacity of ${config.maxRoomSize} participants.`
                });
                return;
            }

            socket.roomCode = roomCode;
            socket.join(roomCode);

            const clients = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
            console.log(`[Socket] ${socket.id} joined '${roomCode}' (${clients.length}/${config.maxRoomSize} peers)`);

            // Broadcast newly joined user and active client list
            io.to(roomCode).emit("user-joined", socket.id, clients);

            // Replay room chat history to newly joined user (Apna College Zoom best feature)
            const history = roomMessages.get(roomCode);
            if (history && history.length > 0) {
                socket.emit("chat-history", history);
                history.forEach((msg) => {
                    socket.emit("chat-message", msg.data, msg.sender, msg.socketId, msg.time);
                });
            }
        });

        // WebRTC Signaling Relay
        socket.on("signal", (toId, message) => {
            const roomCode = socket.roomCode;
            if (!roomCode || typeof toId !== "string" || !message) return;

            // Enforce signal message payload size cap (64 KB)
            const payloadLength = typeof message === "string" ? message.length : JSON.stringify(message).length;
            if (payloadLength > MAX_SIGNAL_BYTES) {
                console.warn(`[Socket] Dropped oversized signal (${payloadLength} bytes) from ${socket.id}`);
                return;
            }

            // Verify target socket is valid and connected to the same room
            const targetSocket = io.sockets.sockets.get(toId);
            if (!targetSocket || targetSocket.roomCode !== roomCode) {
                return;
            }

            io.to(toId).emit("signal", socket.id, message);
        });

        // In-Meeting Chat with in-memory persistence and replay
        socket.on("chat-message", (data, sender) => {
            const roomCode = socket.roomCode;
            if (!roomCode) return;

            if (isRateLimited(socket.id)) return;

            if (typeof data !== "string") return;
            const trimmedMessage = data.trim();
            if (!trimmedMessage || trimmedMessage.length > MAX_CHAT_LENGTH) return;

            // Trust authenticated name first, fallback to sanitized client sender
            const senderName = socket.user?.name || socket.user?.username || sanitizeName(sender);
            const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const messageRecord = {
                sender: senderName,
                data: trimmedMessage,
                socketId: socket.id,
                time: messageTime
            };

            if (!roomMessages.has(roomCode)) {
                roomMessages.set(roomCode, []);
            }
            const roomHistory = roomMessages.get(roomCode);
            roomHistory.push(messageRecord);
            if (roomHistory.length > MAX_STORED_MESSAGES) {
                roomHistory.shift();
            }

            console.log(`[Chat] Message broadcast in '${roomCode}' by ${senderName} (${socket.id})`);
            io.to(roomCode).emit("chat-message", trimmedMessage, senderName, socket.id, messageTime);
        });

        // Emoji Reaction Broadcast
        socket.on("send-reaction", (data) => {
            const roomCode = socket.roomCode;
            if (!roomCode) return;

            if (isRateLimited(socket.id)) return;

            const emoji = data?.emoji;
            if (!ALLOWED_EMOJIS.has(emoji)) return;

            const displayName = socket.user?.name || socket.user?.username || sanitizeName(data?.username);

            io.to(roomCode).emit("user-reaction", {
                socketId: socket.id,
                emoji,
                username: displayName
            });
        });

        // Raise Hand Broadcast
        socket.on("raise-hand", (data) => {
            const roomCode = socket.roomCode;
            if (!roomCode) return;

            if (isRateLimited(socket.id)) return;

            const isHandRaised = Boolean(data?.isHandRaised);
            const displayName = socket.user?.name || socket.user?.username || sanitizeName(data?.username);

            io.to(roomCode).emit("user-raised-hand", {
                socketId: socket.id,
                username: displayName,
                isHandRaised
            });
        });

        // Media State (Video / Audio toggle) Broadcast
        socket.on("user-media-state", (data) => {
            const roomCode = socket.roomCode;
            if (!roomCode) return;

            socket.to(roomCode).emit("user-media-state", {
                socketId: socket.id,
                video: Boolean(data?.video),
                audio: Boolean(data?.audio)
            });
        });

        // Disconnect Handler
        socket.on("disconnect", () => {
            socketRateLimits.delete(socket.id);
            const roomCode = socket.roomCode;
            if (roomCode) {
                console.log(`[Socket] ${socket.id} disconnected from '${roomCode}'`);
                socket.to(roomCode).emit("user-left", socket.id);

                // Clean up room message history if room stays empty for 15 minutes
                const remaining = io.sockets.adapter.rooms.get(roomCode)?.size || 0;
                if (remaining === 0) {
                    setTimeout(() => {
                        const checkAgain = io.sockets.adapter.rooms.get(roomCode)?.size || 0;
                        if (checkAgain === 0) {
                            roomMessages.delete(roomCode);
                        }
                    }, 15 * 60 * 1000);
                }
            }
        });
    });

    return io;
};
