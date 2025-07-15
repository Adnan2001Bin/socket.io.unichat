import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./src/lib/connectDB";
import UserModel from "./src/models/user.model";
import MessageModel from "./src/models/message.model";
import GroupModel from "./src/models/group.model";
import GroupMessageModel from "./src/models/groupMessage.model";
import GroupPostModel from "./src/models/groupPost.model";
import PostModel from "./src/models/post.model";

// Load environment variables from .env file
dotenv.config();

// Define the port for the Socket.IO server, defaulting to 4000 if not specified
const PORT = process.env.SOCKET_PORT || 4000;

// Create an HTTP server instance for Socket.IO to attach to
const server = http.createServer();

// Define allowed origins for CORS, using environment variable or default values
const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL.split(",")
  : ["http://localhost:3000", "https://unichat-cc.vercel.app"];

// Initialize Socket.IO server with CORS configuration
const io = new Server(server, {
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
    const user = await UserModel.findById(userId);
    if (!user || !user.isVerified) {
      throw new Error("User not found or not verified");
    }

    // Attach userId to the socket for use in event handlers
    socket.userId = user._id.toString();
    next();
  } catch (error: any) {
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
      const sender = await UserModel.findById(socket.userId);
      const recipient = await UserModel.findById(recipientId);

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
      const message = new MessageModel({
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
    } catch (error: any) {
      // Send error to the client if message sending fails
      socket.emit("error", { message: error.message || "Failed to send message" });
    }
  });

  // Handle sending a message to a group
  socket.on("sendGroupMessage", async ({ groupId, content }) => {
    try {
      // Fetch sender and group from the database
      const sender = await UserModel.findById(socket.userId);
      const group = await GroupModel.findById(groupId);

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
      const message = new GroupMessageModel({
        groupId,
        sender: socket.userId,
        content,
      });
      await message.save();

      // Populate sender details for the response
      const populatedMessage = await GroupMessageModel.findById(message._id)
        .populate<{ sender: { userName: string } }>("sender", "userName")
        .lean();

      // Emit the group message to all group members
      io.to(groupId).emit("groupMessage", {
        senderId: socket.userId,
        senderName: populatedMessage?.sender.userName,
        content,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (error: any) {
      // Send error to the client if group message sending fails
      socket.emit("error", { message: error.message || "Failed to send group message" });
    }
  });

  // Handle sending a group post
  socket.on("sendGroupPost", async ({ groupId, content, image }) => {
    try {
      // Fetch sender and group from the database
      const sender = await UserModel.findById(socket.userId);
      const group = await GroupModel.findById(groupId);

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
      const post = new GroupPostModel({
        groupId,
        creator: socket.userId,
        content,
        image: image || null,
      });
      await post.save();

      // Populate creator details for the response
      const populatedPost = await GroupPostModel.findById(post._id)
        .populate<{ creator: { userName: string; profilePicture?: string } }>(
          "creator",
          "userName profilePicture"
        )
        .lean();

      // Emit the group post to all group members
      io.to(groupId).emit("groupPost", {
        _id: post._id.toString(),
        groupId: groupId,
        creator: {
          _id: socket.userId,
          userName: populatedPost?.creator.userName,
          profilePicture: populatedPost?.creator.profilePicture,
        },
        content,
        image: post.image,
        createdAt: post.createdAt.toISOString(),
      });
    } catch (error: any) {
      // Send error to the client if group post sending fails
      socket.emit("error", { message: error.message || "Failed to send group post" });
    }
  });

  // Handle sending a personal post
  socket.on("sendPost", async ({ content, image }) => {
    try {
      // Fetch sender from the database
      const sender = await UserModel.findById(socket.userId);
      if (!sender) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      // Create and save the personal post to the database
      const post = new PostModel({
        creator: socket.userId,
        content,
        image: image || null,
      });
      await post.save();

      // Populate creator details for the response
      const populatedPost = await PostModel.findById(post._id)
        .populate<{ creator: { userName: string; profilePicture?: string } }>(
          "creator",
          "userName profilePicture"
        )
        .lean();

      // Get the user's connections for broadcasting
      const connections = await UserModel.findById(socket.userId).select("connections");
      const rooms = [socket.userId, ...(connections?.connections.map((c) => c.toString()) || [])];

      // Emit the personal post to the user and their connections
      io.to(rooms).emit("post", {
        _id: post._id.toString(),
        type: "personal",
        creator: {
          _id: socket.userId,
          userName: populatedPost?.creator.userName,
          profilePicture: populatedPost?.creator.profilePicture,
        },
        content,
        image: post.image,
        createdAt: post.createdAt.toISOString(),
      });
    } catch (error: any) {
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
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
});