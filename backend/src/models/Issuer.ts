import mongoose, { Schema, Document } from "mongoose";

export interface IIssuer extends Document {
  issuerId: string;
  name: string;
  walletAddress?: string;
  email?: string;
  passwordHash: string;
  isActive: boolean;
  enforceZkVerification?: boolean;
  allowQrVerification?: boolean;
  sessionTimeoutMinutes?: number;
  autoRevokeExpired?: boolean;
  rateLimitPerMinute?: number;
  auditRetentionDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssuerSchema = new Schema<IIssuer>(
  {
    issuerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    walletAddress: { type: String },
    email: { type: String },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    enforceZkVerification: { type: Boolean, default: false },
    allowQrVerification: { type: Boolean, default: true },
    sessionTimeoutMinutes: { type: Number, default: 60 },
    autoRevokeExpired: { type: Boolean, default: true },
    rateLimitPerMinute: { type: Number, default: 30 },
    auditRetentionDays: { type: Number, default: 90 }
  },
  { timestamps: true }
);

export const Issuer = mongoose.model<IIssuer>("Issuer", IssuerSchema);

