import mongoose, { Schema, Document } from "mongoose";

export interface IVerificationLog extends Document {
  credentialId: string;
  walletAddress: string;
  issuerId?: string;
  timestamp: Date;
  result: "SUCCESS" | "FAILURE";
  reason?: string;
  viaQr: boolean;
  txHash?: string;
  usedZkp?: boolean;
}

const VerificationLogSchema = new Schema<IVerificationLog>(
  {
    credentialId: { type: String, required: true },
    walletAddress: { type: String, required: true, lowercase: true },
    issuerId: { type: String },
    timestamp: { type: Date, default: Date.now },
    result: { type: String, enum: ["SUCCESS", "FAILURE"], required: true },
    reason: { type: String },
    viaQr: { type: Boolean, default: false },
    txHash: { type: String },
    usedZkp: { type: Boolean, default: false }
  },
  { timestamps: false }
);

export const VerificationLog = mongoose.model<IVerificationLog>(
  "VerificationLog",
  VerificationLogSchema
);

