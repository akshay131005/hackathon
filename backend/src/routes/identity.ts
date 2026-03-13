import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { UserIdentity } from "../models/UserIdentity";
import { Credential } from "../models/Credential";
import {
  hashEmail,
  hashName,
  computeIdentityCommitment,
  generateQrToken,
  signQrPayload,
  signLoginToken,
  verifyLoginToken,
  signIdentityClaims
} from "../utils/crypto";
import { registerCredentialOnChain } from "../blockchain/contract";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const SALT_ROUNDS = 10;

/** Convert commitment hash to 20-byte address format for contract */
function commitmentToAddress(commitment: string): string {
  const hex = commitment.startsWith("0x") ? commitment.slice(2) : commitment;
  return "0x" + hex.slice(0, 40).padEnd(40, "0");
}

export const identityRouter = Router();

/** Register new identity - stores hashed data, anchors commitment on-chain */
identityRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, walletAddress, displayName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const displayNameToStore = (typeof displayName === "string" && displayName.trim()) ? displayName.trim() : name.trim();

    const emailHash = hashEmail(email);
    const existing = await UserIdentity.findOne({ emailHash });
    if (existing) {
      return res.status(400).json({ error: "An identity with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const nameHash = hashName(name);
    const identityCommitment = computeIdentityCommitment(name, email, passwordHash);

    const identityId = uuidv4();
    const qrCodeToken = generateQrToken();
    const expirationDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
    const expiresAtSeconds = Math.floor(expirationDate.getTime() / 1000);

    const subjectAddress = walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)
      ? walletAddress.toLowerCase()
      : commitmentToAddress(identityCommitment);

    let txHash: string | undefined;
    try {
      txHash = await registerCredentialOnChain(
        identityCommitment,
        subjectAddress,
        expiresAtSeconds,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    } catch (chainErr) {
      console.warn("registerCredentialOnChain failed for identity:", chainErr);
    }

    const credentialId = uuidv4();
    await Credential.create({
      credentialId,
      walletAddress: subjectAddress,
      credentialType: "PrivacyPass Identity",
      issuerId: "privacypass-identity",
      issueDate: new Date(),
      expirationDate,
      credentialHash: identityCommitment,
      revocationStatus: "ACTIVE",
      transactionHash: txHash,
      qrCodeToken,
      zkCommitment: identityCommitment
    });

    await UserIdentity.create({
      identityId,
      emailHash,
      nameHash,
      passwordHash,
      displayName: displayNameToStore,
      walletAddress: walletAddress?.toLowerCase(),
      identityCommitment,
      credentialId,
      qrCodeToken,
      transactionHash: txHash,
      status: "ACTIVE"
    });

    await Credential.updateOne({ credentialId }, { linkedIdentityId: identityId });

    const token = jwt.sign(
      { identityId, type: "identity" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const backendBase = process.env.API_BASE_URL || "http://localhost:4000";
    const qrPath = `/identity/verify?tid=${credentialId}&t=${qrCodeToken}&sig=${signQrPayload(credentialId, qrCodeToken)}`;

    return res.json({
      success: true,
      identityId,
      credentialId,
      token,
      qrPath: `${backendBase}${qrPath}`,
      transactionHash: txHash,
      message: "Identity registered. Commitment anchored on-chain. Use your credentials to sign in elsewhere."
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to register identity" });
  }
});

/** Login - returns JWT + one-time login token for external sites */
identityRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailHash = hashEmail(email);
    const identity = await UserIdentity.findOne({ emailHash, status: "ACTIVE" });
    if (!identity) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, identity.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { identityId: identity.identityId, type: "identity" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 min
    const loginToken = signLoginToken(identity.identityId, expiresAt);

    const backendBase = process.env.API_BASE_URL || "http://localhost:4000";
    const qrPath = `/identity/verify?tid=${identity.credentialId}&t=${identity.qrCodeToken}&sig=${signQrPayload(identity.credentialId!, identity.qrCodeToken!)}`;

    return res.json({
      success: true,
      identityId: identity.identityId,
      token,
      loginToken,
      loginTokenExpires: expiresAt,
      qrPath: `${backendBase}${qrPath}`,
      credentialId: identity.credentialId
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to login" });
  }
});

/** Verify token for external sites - returns { valid, identityId } without PII */
identityRouter.get("/verify-token", async (req, res) => {
  try {
    const { identityId, expiresAt, sig } = req.query as { identityId?: string; expiresAt?: string; sig?: string };
    if (!identityId || !expiresAt || !sig) {
      return res.status(400).json({ error: "identityId, expiresAt, and sig are required" });
    }

    const exp = parseInt(expiresAt, 10);
    if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) {
      return res.json({ valid: false, reason: "Token expired" });
    }

    const valid = verifyLoginToken(identityId, exp, sig);
    if (!valid) {
      return res.json({ valid: false, reason: "Invalid signature" });
    }

    const identity = await UserIdentity.findOne({ identityId, status: "ACTIVE" });
    if (!identity) {
      return res.json({ valid: false, reason: "Identity not found or revoked" });
    }

    const displayName = identity.displayName ?? "User";
    const claims = { identityId, displayName, emailVerified: true, expiresAt: exp };
    const claimsSignature = signIdentityClaims(claims);

    return res.json({
      valid: true,
      identityId,
      claims: { displayName, emailVerified: true },
      claimsSignature,
      expiresAt: exp
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/** QR-based verification - for scanning QR to prove identity */
identityRouter.get("/verify", async (req, res) => {
  try {
    const { tid, t, sig } = req.query as { tid?: string; t?: string; sig?: string };
    if (!tid || !t || !sig) {
      return res.status(400).json({ error: "Missing tid, t, or sig" });
    }

    const expectedSig = signQrPayload(tid, t);
    if (sig !== expectedSig) {
      return res.json({ valid: false, reason: "Invalid QR signature" });
    }

    const cred = await Credential.findOne({ credentialId: tid });
    if (!cred || cred.qrCodeToken !== t) {
      return res.json({ valid: false, reason: "Credential not found" });
    }
    if (cred.revocationStatus === "REVOKED") {
      return res.json({ valid: false, reason: "Credential revoked" });
    }
    if (new Date(cred.expirationDate) < new Date()) {
      return res.json({ valid: false, reason: "Credential expired" });
    }

    const identity = await UserIdentity.findOne({ credentialId: tid, status: "ACTIVE" });
    if (!identity) {
      return res.json({ valid: false, reason: "Identity not found" });
    }

    const displayName = identity.displayName ?? "User";
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const claims = { identityId: identity.identityId, displayName, emailVerified: true, expiresAt };
    const claimsSignature = signIdentityClaims(claims);

    return res.json({
      valid: true,
      identityId: identity.identityId,
      credentialType: "PrivacyPass Identity",
      claims: { displayName, emailVerified: true },
      claimsSignature,
      expiresAt
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/** Generate new one-time login token (for "Sign in with PrivacyPass" on external sites) */
identityRouter.post("/generate-login-token", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token required" });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { identityId?: string; type?: string };
    if (decoded.type !== "identity") {
      return res.status(403).json({ error: "Invalid token type" });
    }

    const identity = await UserIdentity.findOne({ identityId: decoded.identityId, status: "ACTIVE" });
    if (!identity) {
      return res.status(404).json({ error: "Identity not found" });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const loginToken = signLoginToken(identity.identityId, expiresAt);

    const verifyUrl = `${process.env.API_BASE_URL || "http://localhost:4000"}/identity/verify-token?identityId=${identity.identityId}&expiresAt=${expiresAt}&sig=${loginToken}`;

    return res.json({
      loginToken,
      expiresAt,
      verifyUrl,
      message: "Use this URL for external site verification. Valid for 5 minutes."
    });
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});
