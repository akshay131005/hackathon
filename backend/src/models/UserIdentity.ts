import mongoose, { Schema, Document } from "mongoose";

export interface IUserIdentity extends Document {
  identityId: string;
  emailHash: string; // sha256 of email for lookup - we never store plaintext email
  nameHash: string;  // sha256 of name - never store plaintext
  passwordHash: string;
  /** Display name shared with external sites when they verify the key/QR (user consent) */
  displayName: string;
  walletAddress?: string;
  identityCommitment: string; // keccak256(name+email+passwordHash) - anchored on-chain
  credentialId?: string;      // links to Credential if issued
  qrCodeToken?: string;
  transactionHash?: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: Date;
  updatedAt: Date;
}

const UserIdentitySchema = new Schema<IUserIdentity>(
  {
    identityId: { type: String, required: true, unique: true },
    emailHash: { type: String, required: true, unique: true },
    nameHash: { type: String, required: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, default: "User" },
    walletAddress: { type: String, lowercase: true },
    identityCommitment: { type: String, required: true },
    credentialId: { type: String },
    qrCodeToken: { type: String },
    transactionHash: { type: String },
    status: { type: String, enum: ["ACTIVE", "REVOKED"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export const UserIdentity = mongoose.model<IUserIdentity>("UserIdentity", UserIdentitySchema);
