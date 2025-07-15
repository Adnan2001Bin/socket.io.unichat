"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUser = findUser;
exports.createErrorResponse = createErrorResponse;
const server_1 = require("next/server");
// Generic query function for finding a user by ID or email
async function findUser(model, query, selectFields) {
    try {
        const user = query._id
            ? await model.findById(query._id, selectFields).exec()
            : await model.findOne({ email: query.email }, selectFields).exec();
        return user;
    }
    catch (error) {
        console.error(`Error finding user with query ${JSON.stringify(query)}:`, error);
        throw new Error("Database query failed");
    }
}
// Utility to handle common response patterns
function createErrorResponse(message, status) {
    return server_1.NextResponse.json({ success: false, message }, { status });
}
