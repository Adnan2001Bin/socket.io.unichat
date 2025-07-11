import { z } from "zod";

export const groupListSchema = z.object({
  query: z.string().trim().optional(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, { message: "Page must be a positive integer" })
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, {
      message: "Limit must be between 1 and 100",
    })
    .default("10"),
});

export type GroupListInput = z.infer<typeof groupListSchema>;