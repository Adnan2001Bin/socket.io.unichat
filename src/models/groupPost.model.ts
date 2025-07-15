import mongoose, { Schema, Document } from "mongoose";

export interface IGroupPost extends Document {
  _id: mongoose.Types.ObjectId; 
  groupId: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupPostSchema: Schema<IGroupPost> = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Group ID is required"],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      minlength: [1, "Post content cannot be empty"],
      maxlength: [2000, "Post content cannot exceed 2000 characters"],
    },
    image: {
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

const GroupPostModel =
  (mongoose.models.GroupPost as mongoose.Model<IGroupPost>) ||
  mongoose.model<IGroupPost>("GroupPost", GroupPostSchema);

export default GroupPostModel;