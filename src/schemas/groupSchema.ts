import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Group name must be at least 3 characters" })
    .max(100, { message: "Group name cannot exceed 100 characters" })
    .trim(),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(1000, { message: "Description cannot exceed 1000 characters" })
    .trim(),
  privacy: z.enum(["public", "private"], {
    message: "Privacy must be either 'public' or 'private'",
  }),
  coverImage: z.string().url({ message: "Invalid cover image URL" }).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;