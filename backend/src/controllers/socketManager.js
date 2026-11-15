import { Server } from "socket.io";

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    const getRoomCode = (path) => {
        try {
            if (!path) return "default-room";
            const segments = path.replace(/\/+$/, "").split("/");
            return segments[segments.length - 1] || "default-room";
        } catch {
            return String(path || "default-room");
        }
    };

    io.on("connection", (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        socket.on("join-call", (path) => {
            const roomCode = getRoomCode(path);
            socket.roomCode = roomCode;
            socket.join(roomCode);

            // Fetch all socket IDs currently in this room
            const clients = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
            console.log(`[Socket] ${socket.id} joined room '${roomCode}' (${clients.length} active peers)`);

            // Notify everyone in the room about the newly joined user and client list
            io.to(roomCode).emit("user-joined", socket.id, clients);
        });

        // WebRTC Signaling: relay SDP Offer/Answer and ICE candidates
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // In-meeting instant messaging
        socket.on("chat-message", (data, sender) => {
            const roomCode = socket.roomCode;
            if (roomCode) {
                console.log(`[Chat] Room ${roomCode} | ${sender}: ${data}`);
                io.to(roomCode).emit("chat-message", data, sender, socket.id);
            }
        });

        // Real-time emoji reaction broadcast
        socket.on("send-reaction", (data) => {
            const roomCode = socket.roomCode;
            if (roomCode) {
                io.to(roomCode).emit("user-reaction", {
                    socketId: socket.id,
                    emoji: data?.emoji || "👍",
                    username: data?.username || "Participant"
                });
            }
        });

        // Raise Hand toggle broadcast
        socket.on("raise-hand", (data) => {
            const roomCode = socket.roomCode;
            if (roomCode) {
                io.to(roomCode).emit("user-raised-hand", {
                    socketId: socket.id,
                    username: data?.username || "Participant",
                    isHandRaised: Boolean(data?.isHandRaised)
                });
            }
        });

        // Disconnect handler
        socket.on("disconnect", () => {
            const roomCode = socket.roomCode;
            if (roomCode) {
                console.log(`[Socket] ${socket.id} disconnected from room '${roomCode}'`);
                socket.to(roomCode).emit("user-left", socket.id);
            }
        });
    });

    return io;
};
