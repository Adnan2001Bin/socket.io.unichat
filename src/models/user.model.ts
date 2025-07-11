import mongoose, { Schema, Document } from "mongoose";

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

// User Schema
const UserSchema: Schema<IUser> = new Schema(
  {
    userName: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [2, "Username must be at least 2 characters"],
      maxlength: [50, "Username cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    university: {
      type: String,
      trim: true,
      maxlength: [100, "University name cannot exceed 100 characters"],
    },
    graduationYear: {
      type: Number,
      min: [1900, "Invalid graduation year"],
      max: [2100, "Invalid graduation year"],
    },
    skills: {
      type: [String],
      default: [],
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [200, "Headline cannot exceed 200 characters"],
    },
    profilePicture: {
      type: String,
      trim: true,
      default: null,
    },
    coverPhoto: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ["undergraduate", "graduate", "admin"],
      default: "undergraduate",
    },
    connections: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pendingSentRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pendingReceivedRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    verificationCode: {
      type: String,
      default: null,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
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

const UserModel =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default UserModel;
