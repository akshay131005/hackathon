import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true, lowercase: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);

