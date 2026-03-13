import mongoose, { Schema, Document } from "mongoose";

export interface IActivityTimeline extends Document {
  eventType: "ISSUED" | "VERIFIED" | "REVOKED";
  credentialId: string;
  walletAddress: string;
  issuerId?: string;
  timestamp: Date;
  details?: string;
}

const ActivityTimelineSchema = new Schema<IActivityTimeline>(
  {
    eventType: {
      type: String,
      enum: ["ISSUED", "VERIFIED", "REVOKED"],
      required: true
    },
    credentialId: { type: String, required: true },
    walletAddress: { type: String, required: true, lowercase: true },
    issuerId: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  },
  { timestamps: false }
);

export const ActivityTimeline = mongoose.model<IActivityTimeline>(
  "ActivityTimeline",
  ActivityTimelineSchema
);

