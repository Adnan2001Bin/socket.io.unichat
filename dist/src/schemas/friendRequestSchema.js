"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondFriendRequestSchema = exports.sendFriendRequestSchema = exports.searchSchema = void 0;
const zod_1 = require("zod");
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1, "Search query is required").trim(),
});
exports.sendFriendRequestSchema = zod_1.z.object({
    recipientId: zod_1.z.string().min(1, "Recipient ID is required"),
});
exports.respondFriendRequestSchema = zod_1.z.object({
    senderId: zod_1.z.string().min(1, "Sender ID is required"),
    action: zod_1.z.enum(["accept", "reject"], { message: "Invalid action" }),
});
