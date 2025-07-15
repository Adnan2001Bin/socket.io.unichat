"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3, { message: "Group name must be at least 3 characters" })
        .max(100, { message: "Group name cannot exceed 100 characters" })
        .trim(),
    description: zod_1.z
        .string()
        .min(10, { message: "Description must be at least 10 characters" })
        .max(1000, { message: "Description cannot exceed 1000 characters" })
        .trim(),
    privacy: zod_1.z.enum(["public", "private"], {
        message: "Privacy must be either 'public' or 'private'",
    }),
    coverImage: zod_1.z.string().url({ message: "Invalid cover image URL" }).optional(),
});
