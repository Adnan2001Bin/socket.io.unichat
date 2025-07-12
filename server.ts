// Importing required dependencies
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./src/lib/connectDB";
import UserModel from "./src/models/user.model";
import MessageModel from "./src/models/message.model";
import GroupModel from "./src/models/group.model";
import GroupMessageModel from "./src/models/groupMessage.model";

// Load environment variables from .env file
dotenv.config();

// Define the port for the Socket.IO server, defaulting to 4000 if not specified
const PORT = process.env.SOCKET_PORT || 4000;

// Create an HTTP server to attach Socket.IO
const server = http.createServer();

// Initialize Socket.IO server with CORS configuration
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL.split(",")
  : ["http://localhost:3000", "https://unichat-cc.vercel.app"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware: Authenticate incoming socket connections
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    console.log("Received userId:", userId);

    if (!userId) {
      throw new Error("User ID required");
    }
    if (typeof userId !== "string") {
      throw new Error("User ID must be a string");
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.isVerified) {
      throw new Error("User not found or not verified");
    }

    socket.userId = user._id.toString();
    next();
  } catch (error: any) {
    console.error("Authentication error:", error.message, {
      userId: socket.handshake.auth.userId,
    });
    next(new Error(`Authentication error: ${error.message}`));
  }
});

// Handle Socket.IO connection events
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
      const sender = await UserModel.findById(socket.userId);
      const recipient = await UserModel.findById(recipientId);

      if (!sender || !recipient) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      if (!sender.connections.includes(recipient._id)) {
        socket.emit("error", {
          message:
            "Recipient is not in your friend list. Please send a friend request first.",
          action: "sendFriendRequest",
          recipientId,
        });
        return;
      }

      const message = new MessageModel({
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
    } catch (error: any) {
      socket.emit("error", {
        message: error.message || "Failed to send message",
      });
    }
  });

  socket.on("sendGroupMessage", async ({ groupId, content }) => {
    try {
      const sender = await UserModel.findById(socket.userId);
      const group = await GroupModel.findById(groupId);

      if (!sender || !group) {
        socket.emit("error", { message: "User or group not found" });
        return;
      }

      if (!group.members.includes(sender._id)) {
        socket.emit("error", { message: "You are not a member of this group" });
        return;
      }

      const message = new GroupMessageModel({
        groupId,
        sender: socket.userId,
        content,
      });
      await message.save();

      const populatedMessage = await GroupMessageModel.findById(message._id)
        .populate<{ sender: { userName: string } }>("sender", "userName")
        .lean();

      io.to(groupId).emit("groupMessage", {
        senderId: socket.userId,
        senderName: populatedMessage?.sender.userName,
        content,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (error: any) {
      socket.emit("error", {
        message: error.message || "Failed to send group message",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Connect to MongoDB and start the server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
});