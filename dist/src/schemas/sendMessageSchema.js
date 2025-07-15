"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageSchema = void 0;
const zod_1 = require("zod");
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, { message: "Message cannot be empty" })
        .max(2000, { message: "Message cannot exceed 2000 characters" })
        .trim(),
    chatType: zod_1.z.enum(["one-on-one", "group"], { message: "Invalid chat type" }),
    recipientId: zod_1.z
        .string()
        .optional()
        .refine((val) => val || !val, {
        message: "Recipient ID is required for one-on-one chat",
    })
        .transform((val) => val || undefined),
    groupId: zod_1.z
        .string()
        .optional()
        .refine((val) => val || !val, {
        message: "Group ID is required for group chat",
    })
        .transform((val) => val || undefined),
}).refine((data) => {
    if (data.chatType === "one-on-one" && !data.recipientId)
        return false;
    if (data.chatType === "group" && !data.groupId)
        return false;
    return true;
}, { message: "Recipient ID or Group ID is required based on chat type" });
