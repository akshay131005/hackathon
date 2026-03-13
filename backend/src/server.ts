import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { connectDb } from "./config/db";
import { credentialsRouter } from "./routes/credentials";
import { identityRouter } from "./routes/identity";
import { issueLimiter, verifyLimiter } from "./middleware/rateLimit";
import { Issuer } from "./models/Issuer";

const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

async function bootstrap() {
  await connectDb();

  const app = express();
  app.use(
    cors({
      origin: ALLOWED_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.send("Backend is running");
  });

  app.post("/auth/issuer/login", async (req, res) => {
    const { issuerId } = req.body;
    if (!issuerId || typeof issuerId !== "string") {
      return res.status(400).json({ error: "issuerId is required" });
    }
    try {
      await Issuer.findOneAndUpdate(
        { issuerId },
        {
          $setOnInsert: {
            name: issuerId,
            passwordHash: "auto",
            isActive: true
          }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn("Issuer upsert warning:", err);
    }
    const token = jwt.sign(
      { issuerId, role: "issuer" as const },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    return res.json({ token, issuerId });
  });

  app.use("/issueCredential", issueLimiter);
  app.use("/verifyCredential", verifyLimiter);
  app.use("/verify/qr", verifyLimiter);

  app.use("/identity", identityRouter);
  app.use("/", credentialsRouter);

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
