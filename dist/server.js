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
const post_model_1 = __importDefault(require("./src/models/post.model"));
// Load environment variables from .env file
dotenv_1.default.config();
// Define the port for the Socket.IO server, defaulting to 4000 if not specified
const PORT = process.env.SOCKET_PORT || 4000;
// Create an HTTP server instance for Socket.IO to attach to
const server = http_1.default.createServer();
// Define allowed origins for CORS, using environment variable or default values
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.split(",")
    : ["http://localhost:3000", "https://unichat-cc.vercel.app"];
// Initialize Socket.IO server with CORS configuration
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
// Middleware: Authenticate incoming socket connections
io.use(async (socket, next) => {
    // Extract userId from socket handshake authentication data
    try {
        const userId = socket.handshake.auth.userId;
        // Validate that userId is a non-empty string
        if (!userId || typeof userId !== "string") {
            throw new Error("User ID required and must be a string");
        }
        // Verify user exists and is verified in the database
        const user = await user_model_1.default.findById(userId);
        if (!user || !user.isVerified) {
            throw new Error("User not found or not verified");
        }
        // Attach userId to the socket for use in event handlers
        socket.userId = user._id.toString();
        next();
    }
    catch (error) {
        // Log authentication errors and pass them to the client
        console.error("Authentication error:", error.message, {
            userId: socket.handshake.auth.userId,
        });
        next(new Error(`Authentication error: ${error.message}`));
    }
});
// Handle socket connections and events
io.on("connection", async (socket) => {
    // Log when a user connects
    console.log(`User connected: ${socket.userId}`);
    // Automatically join the user's own room for personal posts
    socket.join(socket.userId);
    // Handle joining a private chat room between two users
    socket.on("joinChat", ({ recipientId }) => {
        // Create a unique room ID by sorting and joining user IDs
        const roomId = [socket.userId, recipientId].sort().join("-");
        socket.join(roomId);
        // Notify the client that they joined the room
        socket.emit("joinedRoom", { roomId });
        console.log(`User ${socket.userId} joined room ${roomId}`);
    });
    // Handle joining a group room for group messages and posts
    socket.on("joinGroup", ({ groupId }) => {
        socket.join(groupId);
        // Notify the client that they joined the group
        socket.emit("joinedGroup", { groupId });
        console.log(`User ${socket.userId} joined group ${groupId}`);
    });
    // Handle sending a private message between two users
    socket.on("sendMessage", async ({ recipientId, content }) => {
        try {
            // Fetch sender and recipient from the database
            const sender = await user_model_1.default.findById(socket.userId);
            const recipient = await user_model_1.default.findById(recipientId);
            // Validate sender and recipient existence
            if (!sender || !recipient) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            // Check if recipient is in sender's friend list
            if (!sender.connections.includes(recipient._id)) {
                socket.emit("error", {
                    message: "Recipient is not in your friend list.",
                    action: "sendFriendRequest",
                    recipientId,
                });
                return;
            }
            // Create and save the message to the database
            const message = new message_model_1.default({
                sender: socket.userId,
                recipient: recipientId,
                content,
            });
            await message.save();
            // Emit the message to the private chat room
            const roomId = [socket.userId, recipientId].sort().join("-");
            io.to(roomId).emit("message", {
                senderId: socket.userId,
                recipientId,
                content,
                createdAt: message.createdAt,
            });
        }
        catch (error) {
            // Send error to the client if message sending fails
            socket.emit("error", { message: error.message || "Failed to send message" });
        }
    });
    // Handle sending a message to a group
    socket.on("sendGroupMessage", async ({ groupId, content }) => {
        try {
            // Fetch sender and group from the database
            const sender = await user_model_1.default.findById(socket.userId);
            const group = await group_model_1.default.findById(groupId);
            // Validate sender and group existence
            if (!sender || !group) {
                socket.emit("error", { message: "User or group not found" });
                return;
            }
            // Check if sender is a member of the group
            if (!group.members.includes(sender._id)) {
                socket.emit("error", { message: "You are not a member of this group" });
                return;
            }
            // Create and save the group message to the database
            const message = new groupMessage_model_1.default({
                groupId,
                sender: socket.userId,
                content,
            });
            await message.save();
            // Populate sender details for the response
            const populatedMessage = await groupMessage_model_1.default.findById(message._id)
                .populate("sender", "userName")
                .lean();
            // Emit the group message to all group members
            io.to(groupId).emit("groupMessage", {
                senderId: socket.userId,
                senderName: populatedMessage === null || populatedMessage === void 0 ? void 0 : populatedMessage.sender.userName,
                content,
                createdAt: message.createdAt.toISOString(),
            });
        }
        catch (error) {
            // Send error to the client if group message sending fails
            socket.emit("error", { message: error.message || "Failed to send group message" });
        }
    });
    // Handle sending a group post
    socket.on("sendGroupPost", async ({ groupId, content, image }) => {
        try {
            // Fetch sender and group from the database
            const sender = await user_model_1.default.findById(socket.userId);
            const group = await group_model_1.default.findById(groupId);
            // Validate sender and group existence
            if (!sender || !group) {
                socket.emit("error", { message: "User or group not found" });
                return;
            }
            // Check if sender is a member of the group
            if (!group.members.includes(sender._id)) {
                socket.emit("error", { message: "You are not a member of this group" });
                return;
            }
            // Create and save the group post to the database
            const post = new groupPost_model_1.default({
                groupId,
                creator: socket.userId,
                content,
                image: image || null,
            });
            await post.save();
            // Populate creator details for the response
            const populatedPost = await groupPost_model_1.default.findById(post._id)
                .populate("creator", "userName profilePicture")
                .lean();
            // Emit the group post to all group members
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
            // Send error to the client if group post sending fails
            socket.emit("error", { message: error.message || "Failed to send group post" });
        }
    });
    // Handle sending a personal post
    socket.on("sendPost", async ({ content, image }) => {
        try {
            // Fetch sender from the database
            const sender = await user_model_1.default.findById(socket.userId);
            if (!sender) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            // Create and save the personal post to the database
            const post = new post_model_1.default({
                creator: socket.userId,
                content,
                image: image || null,
            });
            await post.save();
            // Populate creator details for the response
            const populatedPost = await post_model_1.default.findById(post._id)
                .populate("creator", "userName profilePicture")
                .lean();
            // Get the user's connections for broadcasting
            const connections = await user_model_1.default.findById(socket.userId).select("connections");
            const rooms = [socket.userId, ...((connections === null || connections === void 0 ? void 0 : connections.connections.map((c) => c.toString())) || [])];
            // Emit the personal post to the user and their connections
            io.to(rooms).emit("post", {
                _id: post._id.toString(),
                type: "personal",
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
            // Send error to the client if personal post sending fails
            socket.emit("error", { message: error.message || "Failed to send post" });
        }
    });
    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);
    });
});
// Connect to the database and start the Socket.IO server
(0, connectDB_1.default)().then(() => {
    server.listen(PORT, () => {
        console.log(`Socket.IO server running on port ${PORT}`);
    });
});
