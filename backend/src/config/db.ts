import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

export async function connectDb() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required. Set it in .env (e.g. your MongoDB Atlas connection string).");
  }

  await mongoose.connect(MONGO_URI, {
    retryWrites: true,
    w: "majority",
    maxPoolSize: 10,
  });
  console.log("MongoDB connected (Atlas)");
}

