import { z } from "zod";

export const updateProfileSchema = z.object({
  userName: z
    .string()
    .min(2, { message: "Username must be at least 2 characters" })
    .max(50, { message: "Username cannot exceed 50 characters" })
    .trim()
    .optional(),
  university: z
    .string()
    .trim()
    .max(100, { message: "University name cannot exceed 100 characters" })
    .optional(),
  graduationYear: z
    .number()
    .min(1900, { message: "Invalid graduation year" })
    .max(2100, { message: "Invalid graduation year" })
    .optional(),
  skills: z
    .array(z.string().min(1, 'Each skill must be a non-empty string').max(50, 'Each skill cannot exceed 50 characters'))
    .max(20, 'Cannot have more than 20 skills')
    .optional(),
  headline: z
    .string()
    .trim()
    .max(200, { message: "Headline cannot exceed 200 characters" })
    .optional(),
  profilePicture: z.string().url({ message: "Invalid URL" }).optional(),
  coverPhoto: z.string().url({ message: "Invalid URL" }).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
