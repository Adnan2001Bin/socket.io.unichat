"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Importing required dependencies
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const connectDB_1 = __importDefault(require("./src/lib/connectDB"));
const user_model_1 = __importDefault(require("./src/models/user.model"));
const message_model_1 = __importDefault(require("./src/models/message.model"));
const group_model_1 = __importDefault(require("./src/models/group.model"));
const groupMessage_model_1 = __importDefault(require("./src/models/groupMessage.model"));
// Load environment variables from .env file
dotenv_1.default.config();
// Define the port for the Socket.IO server, defaulting to 4000 if not specified
const PORT = process.env.SOCKET_PORT || 4000;
// Create an HTTP server to attach Socket.IO
const server = http_1.default.createServer();
// Initialize Socket.IO server with CORS configuration to allow cross-origin requests
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", // Allow requests from the frontend app URL
        methods: ["GET", "POST"], // Supported HTTP methods
        credentials: true, // Allow credentials (e.g., cookies) in requests
    },
});
// Middleware: Authenticate incoming socket connections to ensure only verified users can connect
io.use(async (socket, next) => {
    // Extract userId from socket handshake authentication data
    try {
        const userId = socket.handshake.auth.userId;
        console.log("Received userId:", userId); // Debug: Log the received userId for troubleshooting
        // Validate userId presence and type
        if (!userId) {
            throw new Error("User ID required");
        }
        if (typeof userId !== "string") {
            throw new Error("User ID must be a string");
        }
        // Connect to MongoDB and verify user existence and verification status
        const user = await user_model_1.default.findById(userId);
        if (!user || !user.isVerified) {
            throw new Error("User not found or not verified");
        }
        // Attach userId to socket for use in event handlers
        socket.userId = user._id.toString();
        next(); // Proceed to connection if authentication succeeds
    }
    catch (error) {
        // Log authentication errors and pass error to client
        console.error("Authentication error:", error.message, {
            userId: socket.handshake.auth.userId,
        });
        next(new Error(`Authentication error: ${error.message}`));
    }
});
// Handle Socket.IO connection events and set up event listeners for chat functionality
io.on("connection", async (socket) => {
    // Log successful connection with user ID
    console.log(`User connected: ${socket.userId}`);
    // Event Handler: Handle user joining a one-on-one chat room
    socket.on("joinChat", ({ recipientId }) => {
        // Create a unique room ID by sorting and joining user IDs to ensure consistency for both users
        const roomId = [socket.userId, recipientId].sort().join("-");
        socket.join(roomId); // Add socket to the room
        socket.emit("joinedRoom", { roomId }); // Notify client of successful room join
        console.log(`User ${socket.userId} joined room ${roomId}`); // Debug: Log room join
    });
    // Event Handler: Handle user joining a group chat room
    socket.on("joinGroup", ({ groupId }) => {
        socket.join(groupId); // Add the socket to the group room identified by groupId
        socket.emit("joinedGroup", { groupId }); // Notify the client of successful group join
        console.log(`User ${socket.userId} joined group ${groupId}`);
    });
    // Event Handler: Handle sending a one-on-one chat message
    socket.on("sendMessage", async ({ recipientId, content }) => {
        try {
            // Fetch sender and recipient from MongoDB
            const sender = await user_model_1.default.findById(socket.userId);
            const recipient = await user_model_1.default.findById(recipientId);
            // Validate sender and recipient existence
            if (!sender || !recipient) {
                socket.emit("error", { message: "User not found" });
                return;
            }
            // Check if recipient is in sender's friend list (connections)
            if (!sender.connections.includes(recipient._id)) {
                socket.emit("error", {
                    message: "Recipient is not in your friend list. Please send a friend request first.",
                    action: "sendFriendRequest",
                    recipientId,
                });
                return;
            }
            // Create and save the message to MongoDB
            const message = new message_model_1.default({
                sender: socket.userId,
                recipient: recipientId,
                content,
            });
            await message.save();
            // Broadcast the message to the one-on-one chat room (both sender and recipient)
            const roomId = [socket.userId, recipientId].sort().join("-");
            io.to(roomId).emit("message", {
                senderId: socket.userId,
                recipientId,
                content,
                createdAt: message.createdAt,
            });
        }
        catch (error) {
            // Emit error to client if message sending fails
            socket.emit("error", {
                message: error.message || "Failed to send message",
            });
        }
    });
    // Event Handler: Handle sending a group chat message
    socket.on("sendGroupMessage", async ({ groupId, content }) => {
        try {
            // Fetch sender and group from MongoDB to validate their existence
            const sender = await user_model_1.default.findById(socket.userId);
            const group = await group_model_1.default.findById(groupId);
            if (!sender || !group) {
                socket.emit("error", { message: "User or group not found" });
                return;
            }
            // Verify that the sender is a member of the group
            if (!group.members.includes(sender._id)) {
                socket.emit("error", { message: "You are not a member of this group" });
                return;
            }
            // Create and save the group message to MongoDB
            const message = new groupMessage_model_1.default({
                groupId,
                sender: socket.userId,
                content,
            });
            await message.save();
            // Fetch the saved message with populated sender details (userName)
            const populatedMessage = await groupMessage_model_1.default.findById(message._id)
                .populate("sender", "userName")
                .lean();
            // Broadcast the group message to all members in the group room
            io.to(groupId).emit("groupMessage", {
                senderId: socket.userId,
                senderName: populatedMessage === null || populatedMessage === void 0 ? void 0 : populatedMessage.sender.userName,
                content,
                createdAt: message.createdAt.toISOString(),
            });
        }
        catch (error) {
            // Emit an error to the client if group message sending fails
            socket.emit("error", {
                message: error.message || "Failed to send group message",
            });
        }
    });
    // Event: Handle socket disconnection
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`); // Debug: Log disconnection
    });
});
// Connect to MongoDB and start the Socket.IO server
(0, connectDB_1.default)().then(() => {
    server.listen(PORT, () => {
        console.log(`Socket.IO server running on port ${PORT}`); // Log server startup
    });
});
