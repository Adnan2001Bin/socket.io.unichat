"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    userName: zod_1.z
        .string()
        .min(2, { message: "Username must be at least 2 characters" })
        .max(50, { message: "Username cannot exceed 50 characters" })
        .trim()
        .optional(),
    university: zod_1.z
        .string()
        .trim()
        .max(100, { message: "University name cannot exceed 100 characters" })
        .optional(),
    graduationYear: zod_1.z
        .number()
        .min(1900, { message: "Invalid graduation year" })
        .max(2100, { message: "Invalid graduation year" })
        .optional(),
    skills: zod_1.z
        .array(zod_1.z.string().min(1, 'Each skill must be a non-empty string').max(50, 'Each skill cannot exceed 50 characters'))
        .max(20, 'Cannot have more than 20 skills')
        .optional(),
    headline: zod_1.z
        .string()
        .trim()
        .max(200, { message: "Headline cannot exceed 200 characters" })
        .optional(),
    profilePicture: zod_1.z.string().url({ message: "Invalid URL" }).optional(),
    coverPhoto: zod_1.z.string().url({ message: "Invalid URL" }).optional(),
});
