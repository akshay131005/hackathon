import mongoose, { Schema, Document } from "mongoose";

export interface ICredential extends Document {
  credentialId: string;
  walletAddress: string;
  credentialType: string;
  issuerId: string;
  issueDate: Date;
  expirationDate: Date;
  credentialHash: string;
  revocationStatus: "ACTIVE" | "REVOKED" | "EXPIRED";
  transactionHash?: string;
  qrCodeToken: string;
  zkCommitment?: string;
  zkCircuitType?: string;
  /** When set, verification returns identity claims (displayName, emailVerified) from UserIdentity */
  linkedIdentityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new Schema<ICredential>(
  {
    credentialId: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true, lowercase: true },
    credentialType: { type: String, required: true },
    issuerId: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expirationDate: { type: Date, required: true },
    credentialHash: { type: String, required: true },
    revocationStatus: {
      type: String,
      enum: ["ACTIVE", "REVOKED", "EXPIRED"],
      default: "ACTIVE"
    },
    transactionHash: { type: String },
    qrCodeToken: { type: String, required: true, unique: true },
    zkCommitment: { type: String },
    zkCircuitType: { type: String },
    linkedIdentityId: { type: String }
  },
  { timestamps: true }
);

export const Credential = mongoose.model<ICredential>(
  "Credential",
  CredentialSchema
);

