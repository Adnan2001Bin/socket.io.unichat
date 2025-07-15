"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const connectDB_1 = __importDefault(require("./src/lib/connectDB"));
const user_model_1 = __importDefault(require("./src/models/user.model"));
const message_model_1 = __importDefault(require("./src/models/message.model"));
const group_model_1 = __importDefault(require("./src/models/group.model"));
const groupMessage_model_1 = __importDefault(require("./src/models/groupMessage.model"));
const groupPost_model_1 = __importDefault(require("./src/models/groupPost.model"));
dotenv_1.default.config();
const PORT = process.env.SOCKET_PORT || 4000;
const server = http_1.default.createServer();
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.split(",")
    : ["http://localhost:3000", "https://unichat-cc.vercel.app"];
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
io.use(async (socket, next) => {
    try {
        const userId = socket.handshake.auth.userId;
        if (!userId || typeof userId !== "string") {
            throw new Error("User ID required and must be a string");
        }
        const user = await user_model_1.default.findById(userId);
        if (!user || !user.isVerified) {
            throw new Error("User not found or not verified");
        }
        socket.userId = user._id.toString();
        next();
    }
    catch (error) {
        console.error("Authentication error:", error.message, {
            userId: socket.handshake.auth.userId,
        });
        next(new Error(`Authentication error: ${error.message}`));
    }
});
io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    socket.on("joinChat", ({ recipientId }) => {
        const roomId = [socket.userId, recipientId].sort().join("-");
        socket.join(roomId);
        socket.emit("joinedRoom", { roomId });
        console.log(`User ${socket.userId} joined room ${roomId}`);
    });
    socket.on("joinGroup", ({ groupId }) => {
        socket.join(groupId);
        socket.emit("joinedGroup", { groupId });
        console.log(`User ${socket.userId} joined group ${groupId}`);
    });
    socket.on("sendMessage", async ({ recipientId, content }) => {
        try {
            const sender = await user_model_1.default.findById(socket.userId);
            const recipient = await user_model_1.default.findById(recipientId);
            if (!sender || !recipient) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            if (!sender.connections.includes(recipient._id)) {
                socket.emit("error", {
                    message: "Recipient is not in your friend list.",
                    action: "sendFriendRequest",
                    recipientId,
                });
                return;
            }
            const message = new message_model_1.default({
                sender: socket.userId,
                recipient: recipientId,
                content,
            });
            await message.save();
            const roomId = [socket.userId, recipientId].sort().join("-");
            io.to(roomId).emit("message", {
                senderId: socket.userId,
                recipientId,
                content,
                createdAt: message.createdAt,
            });
        }
        catch (error) {
            socket.emit("error", { message: error.message || "Failed to send message" });
        }
    });
    socket.on("sendGroupMessage", async ({ groupId, content }) => {
        try {
            const sender = await user_model_1.default.findById(socket.userId);
            const group = await group_model_1.default.findById(groupId);
            if (!sender || !group) {
                socket.emit("error", { message: "User or group not found" });
                return;
            }
            if (!group.members.includes(sender._id)) {
                socket.emit("error", { message: "You are not a member of this group" });
                return;
            }
            const message = new groupMessage_model_1.default({
                groupId,
                sender: socket.userId,
                content,
            });
            await message.save();
            const populatedMessage = await groupMessage_model_1.default.findById(message._id)
                .populate("sender", "userName")
                .lean();
            io.to(groupId).emit("groupMessage", {
                senderId: socket.userId,
                senderName: populatedMessage === null || populatedMessage === void 0 ? void 0 : populatedMessage.sender.userName,
                content,
                createdAt: message.createdAt.toISOString(),
            });
        }
        catch (error) {
            socket.emit("error", { message: error.message || "Failed to send group message" });
        }
    });
    socket.on("sendGroupPost", async ({ groupId, content, image }) => {
        try {
            const sender = await user_model_1.default.findById(socket.userId);
            const group = await group_model_1.default.findById(groupId);
            if (!sender || !group) {
                socket.emit("error", { message: "User or group not found" });
                return;
            }
            if (!group.members.includes(sender._id)) {
                socket.emit("error", { message: "You are not a member of this group" });
                return;
            }
            const post = new groupPost_model_1.default({
                groupId,
                creator: socket.userId,
                content,
                image: image || null,
            });
            await post.save();
            const populatedPost = await groupPost_model_1.default.findById(post._id)
                .populate("creator", "userName profilePicture")
                .lean();
            io.to(groupId).emit("groupPost", {
                _id: post._id.toString(),
                groupId: groupId,
                creator: {
                    _id: socket.userId,
                    userName: populatedPost === null || populatedPost === void 0 ? void 0 : populatedPost.creator.userName,
                    profilePicture: populatedPost === null || populatedPost === void 0 ? void 0 : populatedPost.creator.profilePicture,
                },
                content,
                image: post.image,
                createdAt: post.createdAt.toISOString(),
            });
        }
        catch (error) {
            socket.emit("error", { message: error.message || "Failed to send group post" });
        }
    });
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);
    });
});
(0, connectDB_1.default)().then(() => {
    server.listen(PORT, () => {
        console.log(`Socket.IO server running on port ${PORT}`);
    });
});
