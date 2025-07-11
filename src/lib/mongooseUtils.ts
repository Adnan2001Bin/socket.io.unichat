import mongoose, { Model, Document } from "mongoose";
import { NextResponse } from "next/server";

interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  password: string;
  university?: string;
  graduationYear?: number;
  skills?: string[];
  headline?: string;
  profilePicture?: string;
  coverPhoto?: string;
  role: "undergraduate" | "graduate" | "admin";
  connections: mongoose.Types.ObjectId[];
  pendingSentRequests: mongoose.Types.ObjectId[];
  pendingReceivedRequests: mongoose.Types.ObjectId[];
  verificationCode: string;
  verificationCodeExpires: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Generic query function for finding a user by ID or email
export async function findUser<T extends Document>(
  model: Model<T>,
  query: { _id?: string; email?: string },
  selectFields?: string
): Promise<T | null> {
  try {
    const user = query._id
      ? await model.findById(query._id, selectFields).exec()
      : await model.findOne({ email: query.email }, selectFields).exec();
    return user as T | null;
  } catch (error) {
    console.error(`Error finding user with query ${JSON.stringify(query)}:`, error);
    throw new Error("Database query failed");
  }
}

// Utility to handle common response patterns
export function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}