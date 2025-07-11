import mongoose, { Schema, Document } from "mongoose";

interface IGroup extends Document {
  name: string;
  description: string;
  privacy: "public" | "private";
  creator: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  pendingJoinRequests: mongoose.Types.ObjectId[];
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema<IGroup> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: [3, "Group name must be at least 3 characters"],
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Group description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    privacy: {
      type: String,
      enum: ["public", "private"],
      required: [true, "Privacy setting is required"],
      default: "public",
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pendingJoinRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    coverImage: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const GroupModel =
  (mongoose.models.Group as mongoose.Model<IGroup>) ||
  mongoose.model<IGroup>("Group", GroupSchema);

export default GroupModel;