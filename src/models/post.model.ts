import mongoose, { Schema, Document } from "mongoose";

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema<IPost> = new Schema(
  {
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

const PostModel =
  (mongoose.models.Post as mongoose.Model<IPost>) ||
  mongoose.model<IPost>("Post", PostSchema);

export default PostModel;
