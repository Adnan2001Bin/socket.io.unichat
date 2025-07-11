import mongoose, { Schema, Document } from "mongoose";

interface IGroupMessage extends Document {
  groupId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const GroupMessageSchema: Schema<IGroupMessage> = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Group ID is required"],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      minlength: [1, "Message cannot be empty"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const GroupMessageModel =
  (mongoose.models.GroupMessage as mongoose.Model<IGroupMessage>) ||
  mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);

export default GroupMessageModel;