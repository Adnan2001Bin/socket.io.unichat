import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./src/lib/connectDB";
import UserModel from "./src/models/user.model";
import MessageModel from "./src/models/message.model";
import GroupModel from "./src/models/group.model";
import GroupMessageModel from "./src/models/groupMessage.model";
import GroupPostModel from "./src/models/groupPost.model";

dotenv.config();

const PORT = process.env.SOCKET_PORT || 4000;
const server = http.createServer();
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

io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId || typeof userId !== "string") {
      throw new Error("User ID required and must be a string");
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
          message: "Recipient is not in your friend list.",
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
      socket.emit("error", { message: error.message || "Failed to send message" });
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
      socket.emit("error", { message: error.message || "Failed to send group message" });
    }
  });

  socket.on("sendGroupPost", async ({ groupId, content, image }) => {
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

      const post = new GroupPostModel({
        groupId,
        creator: socket.userId,
        content,
        image: image || null,
      });
      await post.save();

      const populatedPost = await GroupPostModel.findById(post._id)
        .populate<{ creator: { userName: string; profilePicture?: string } }>(
          "creator",
          "userName profilePicture"
        )
        .lean();

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
      socket.emit("error", { message: error.message || "Failed to send group post" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
  });
});