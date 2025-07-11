import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required").trim(),
});

export const sendFriendRequestSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
});

export const respondFriendRequestSchema = z.object({
  senderId: z.string().min(1, "Sender ID is required"),
  action: z.enum(["accept", "reject"], { message: "Invalid action" }),
});

export type SearchInput = z.infer<typeof searchSchema>;
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;