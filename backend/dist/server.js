"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./config/db");
const credentials_1 = require("./routes/credentials");
const rateLimit_1 = require("./middleware/rateLimit");
const PORT = process.env.PORT || 4000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
async function bootstrap() {
    await (0, db_1.connectDb)();
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: ALLOWED_ORIGIN,
        credentials: true
    }));
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.get("/", (_req, res) => {
        res.send("Backend is running");
    });
    app.post("/auth/issuer/login", (req, res) => {
        const { issuerId } = req.body;
        if (!issuerId || typeof issuerId !== "string") {
            return res.status(400).json({ error: "issuerId is required" });
        }
        const token = jsonwebtoken_1.default.sign({ issuerId, role: "issuer" }, JWT_SECRET, { expiresIn: "8h" });
        return res.json({ token, issuerId });
    });
    app.use("/issueCredential", rateLimit_1.issueLimiter);
    app.use("/verifyCredential", rateLimit_1.verifyLimiter);
    app.use("/verify/qr", rateLimit_1.verifyLimiter);
    app.use("/", credentials_1.credentialsRouter);
    app.listen(PORT, () => {
        console.log(`Backend listening on port ${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
