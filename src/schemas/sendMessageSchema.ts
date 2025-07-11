import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message cannot exceed 2000 characters" })
    .trim(),
  chatType: z.enum(["one-on-one", "group"], { message: "Invalid chat type" }),
  recipientId: z
    .string()
    .optional()
    .refine((val) => val || !val, {
      message: "Recipient ID is required for one-on-one chat",
    })
    .transform((val) => val || undefined),
  groupId: z
    .string()
    .optional()
    .refine((val) => val || !val, {
      message: "Group ID is required for group chat",
    })
    .transform((val) => val || undefined),
}).refine(
  (data) => {
    if (data.chatType === "one-on-one" && !data.recipientId) return false;
    if (data.chatType === "group" && !data.groupId) return false;
    return true;
  },
  { message: "Recipient ID or Group ID is required based on chat type" }
);

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
