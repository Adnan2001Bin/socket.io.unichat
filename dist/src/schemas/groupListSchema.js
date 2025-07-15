"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupListSchema = void 0;
const zod_1 = require("zod");
exports.groupListSchema = zod_1.z.object({
    query: zod_1.z.string().trim().optional(),
    page: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, { message: "Page must be a positive integer" })
        .default("1"),
    limit: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0 && val <= 100, {
        message: "Limit must be between 1 and 100",
    })
        .default("10"),
});
