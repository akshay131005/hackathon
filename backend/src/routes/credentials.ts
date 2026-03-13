import { Router } from "express";
import { Credential } from "../models/Credential";
import { UserIdentity } from "../models/UserIdentity";
import { ActivityTimeline } from "../models/ActivityTimeline";
import { VerificationLog } from "../models/VerificationLog";
import { Issuer } from "../models/Issuer";
import { requireIssuerAuth, AuthenticatedRequest } from "../middleware/auth";
import {
  computeCredentialHash,
  generateQrToken,
  signQrPayload,
  signIdentityClaims
} from "../utils/crypto";
import {
  registerCredentialOnChain,
  revokeCredentialOnChain,
  verifyCredentialOnChain
} from "../blockchain/contract";
import { v4 as uuidv4 } from "uuid";
import { verifyZkProof } from "../zk/zkService";

export const credentialsRouter = Router();

credentialsRouter.post(
  "/issueCredential",
  requireIssuerAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        walletAddress,
        credentialType,
        issuerID,
        expirationDate,
        zkCommitment,
        zkCircuitType
      } = req.body;
      if (!walletAddress || !credentialType || !issuerID || !expirationDate) {
        return res.status(400).json({ error: "Missing fields" });
      }
      if (req.auth?.issuerId !== issuerID && req.auth?.role !== "admin") {
        return res.status(403).json({ error: "Issuer mismatch" });
      }

      const credentialId = uuidv4();
      const credentialHash = computeCredentialHash({
        walletAddress,
        credentialType,
        issuerId: issuerID,
        expirationDate
      });
      const expiresAtSeconds = Math.floor(new Date(expirationDate).getTime() / 1000);
      const zkCommitmentHex =
        typeof zkCommitment === "string" && zkCommitment.length > 0
          ? zkCommitment
          : "0x0000000000000000000000000000000000000000000000000000000000000000";
      let txHash: string | undefined;
      try {
        txHash = await registerCredentialOnChain(
          credentialHash,
          walletAddress,
          expiresAtSeconds,
          zkCommitmentHex
        );
      } catch (chainErr) {
        console.warn("registerCredentialOnChain failed, continuing without on-chain tx:", chainErr);
      }

      const qrCodeToken = generateQrToken();
      const now = new Date();

      const credential = await Credential.create({
        credentialId,
        walletAddress,
        credentialType,
        issuerId: issuerID,
        issueDate: now,
        expirationDate: new Date(expirationDate),
        credentialHash,
        revocationStatus: "ACTIVE",
        transactionHash: txHash,
        qrCodeToken,
        zkCommitment: zkCommitmentHex,
        zkCircuitType: zkCircuitType
      });

      await ActivityTimeline.create({
        eventType: "ISSUED",
        credentialId,
        walletAddress,
        issuerId: issuerID,
        timestamp: now,
        details: `Credential ${credentialType} issued`
      });

      const linkedIdentity = await UserIdentity.findOne({ walletAddress: walletAddress.toLowerCase(), status: "ACTIVE" });
      if (linkedIdentity) {
        credential.linkedIdentityId = linkedIdentity.identityId;
        await credential.save();
      }

      return res.json(credential);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Failed to issue credential" });
    }
  }
);

credentialsRouter.post("/verifyCredential", async (req, res) => {
  try {
    const { credentialID } = req.body;
    if (!credentialID) {
      return res.status(400).json({ error: "Missing credentialID" });
    }

    const cred = await Credential.findOne({ credentialId: credentialID });
    if (!cred) {
      return res.status(404).json({ error: "Credential not found" });
    }

    let onchain: { valid: boolean; revoked: boolean };
    try {
      const chain = await verifyCredentialOnChain(cred.credentialHash);
      onchain = { valid: chain.valid, revoked: chain.revoked };
    } catch (chainErr) {
      console.warn("verifyCredentialOnChain failed, falling back to off-chain state:", chainErr);
      const revoked = cred.revocationStatus === "REVOKED";
      onchain = { valid: !revoked, revoked };
    }
    const now = Date.now();
    const isExpired = new Date(cred.expirationDate).getTime() <= now;
    const valid = onchain.valid && !isExpired;

    const result = valid ? "SUCCESS" : "FAILURE";
    const reason = !onchain.valid
      ? "On-chain invalid or revoked"
      : isExpired
      ? "Expired"
      : undefined;

    await VerificationLog.create({
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      result,
      reason,
      viaQr: false,
      txHash: cred.transactionHash
    });

    await ActivityTimeline.create({
      eventType: "VERIFIED",
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      details: result === "SUCCESS" ? "Verification success" : `Verification failed: ${reason}`
    });

    const payload: any = {
      valid,
      revoked: onchain.revoked,
      expired: isExpired,
      txHash: cred.transactionHash,
      reason
    };

    const linkedId = (cred as any).linkedIdentityId;
    if (valid && linkedId) {
      const identity = await UserIdentity.findOne({ identityId: linkedId, status: "ACTIVE" }).lean();
      if (identity) {
        const displayName = identity.displayName ?? "User";
        const expiresAt = Math.floor(Date.now() / 1000) + 300;
        payload.identityId = linkedId;
        payload.claims = { displayName, emailVerified: true };
        payload.claimsSignature = signIdentityClaims({ identityId: linkedId, displayName, emailVerified: true, expiresAt });
        payload.expiresAt = expiresAt;
      }
    }

    return res.json(payload);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to verify credential" });
  }
});

credentialsRouter.post("/verifyCredentialZkp", async (req, res) => {
  try {
    const { credentialID, proof, publicSignals } = req.body;
    if (!credentialID || !proof || !publicSignals) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const cred = await Credential.findOne({ credentialId: credentialID });
    if (!cred || !cred.zkCommitment || !cred.zkCircuitType) {
      return res.status(400).json({ error: "Credential not ZK-enabled" });
    }

    let onchain: { valid: boolean; revoked: boolean };
    try {
      const chain = await verifyCredentialOnChain(cred.credentialHash);
      onchain = { valid: chain.valid, revoked: chain.revoked };
    } catch (chainErr) {
      console.warn(
        "verifyCredentialOnChain (ZK) failed, falling back to off-chain state:",
        chainErr
      );
      const revoked = cred.revocationStatus === "REVOKED";
      onchain = { valid: !revoked, revoked };
    }
    const now = Date.now();
    const isExpired = new Date(cred.expirationDate).getTime() <= now;

    const zkOk = await verifyZkProof({
      circuitType: cred.zkCircuitType,
      proof,
      publicSignals,
      expectedCommitment: cred.zkCommitment
    });

    const valid = onchain.valid && !isExpired && zkOk;

    const reason = !zkOk
      ? "ZK proof invalid"
      : !onchain.valid
      ? "On-chain invalid or revoked"
      : isExpired
      ? "Expired"
      : undefined;

    await VerificationLog.create({
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      result: valid ? "SUCCESS" : "FAILURE",
      reason,
      viaQr: false,
      txHash: cred.transactionHash,
      usedZkp: true
    });

    await ActivityTimeline.create({
      eventType: "VERIFIED",
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      details: valid ? "ZK verification success" : `ZK verification failed: ${reason}`
    });

    const zkPayload: any = {
      valid,
      revoked: onchain.revoked,
      expired: isExpired,
      reason,
      txHash: cred.transactionHash
    };
    const linkedId = (cred as any).linkedIdentityId;
    if (valid && linkedId) {
      const identity = await UserIdentity.findOne({ identityId: linkedId, status: "ACTIVE" }).lean();
      if (identity) {
        const displayName = identity.displayName ?? "User";
        const expiresAt = Math.floor(Date.now() / 1000) + 300;
        zkPayload.identityId = linkedId;
        zkPayload.claims = { displayName, emailVerified: true };
        zkPayload.claimsSignature = signIdentityClaims({ identityId: linkedId, displayName, emailVerified: true, expiresAt });
        zkPayload.expiresAt = expiresAt;
      }
    }
    return res.json(zkPayload);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed ZK verification" });
  }
});

credentialsRouter.post(
  "/revokeCredential",
  requireIssuerAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { credentialID } = req.body;
      if (!credentialID) {
        return res.status(400).json({ error: "Missing credentialID" });
      }

      const cred = await Credential.findOne({ credentialId: credentialID });
      if (!cred) {
        return res.status(404).json({ error: "Credential not found" });
      }

      if (req.auth?.issuerId !== cred.issuerId && req.auth?.role !== "admin") {
        return res.status(403).json({ error: "Not issuer of this credential" });
      }

      let txHash: string | undefined;
      try {
        txHash = await revokeCredentialOnChain(cred.credentialHash);
      } catch (chainErr) {
        console.warn("revokeCredentialOnChain failed, marking as revoked off-chain:", chainErr);
      }
      cred.revocationStatus = "REVOKED";
      await cred.save();

      await ActivityTimeline.create({
        eventType: "REVOKED",
        credentialId: cred.credentialId,
        walletAddress: cred.walletAddress,
        issuerId: cred.issuerId,
        timestamp: new Date(),
        details: "Credential revoked"
      });

      await VerificationLog.create({
        credentialId: cred.credentialId,
        walletAddress: cred.walletAddress,
        issuerId: cred.issuerId,
        timestamp: new Date(),
        result: "SUCCESS",
        reason: "Revoked",
        viaQr: false,
        txHash
      });

      return res.json({ ...cred.toObject(), transactionHash: txHash });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Failed to revoke credential" });
    }
  }
);

credentialsRouter.post("/revokeCredentialByHolder", async (req, res) => {
  try {
    const { credentialID, walletAddress } = req.body;
    if (!credentialID || !walletAddress) {
      return res.status(400).json({ error: "Missing credentialID or walletAddress" });
    }

    const cred = await Credential.findOne({ credentialId: credentialID });
    if (!cred) {
      return res.status(404).json({ error: "Credential not found" });
    }

    if (cred.walletAddress?.toLowerCase() !== String(walletAddress).toLowerCase()) {
      return res.status(403).json({ error: "Wallet address does not own this credential" });
    }

    if (cred.revocationStatus === "REVOKED") {
      return res.status(400).json({ error: "Credential is already revoked" });
    }

    let txHash: string | undefined;
    try {
      txHash = await revokeCredentialOnChain(cred.credentialHash);
    } catch (chainErr) {
      console.warn("revokeCredentialOnChain failed, marking as revoked off-chain:", chainErr);
    }
    cred.revocationStatus = "REVOKED";
    await cred.save();

    await ActivityTimeline.create({
      eventType: "REVOKED",
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      details: "Credential revoked by holder"
    });

    await VerificationLog.create({
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      result: "SUCCESS",
      reason: "Revoked by holder",
      viaQr: false,
      txHash
    });

    return res.json({ ...cred.toObject(), transactionHash: txHash });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to revoke credential" });
  }
});

credentialsRouter.get("/credentials", async (req, res) => {
  try {
    const { walletAddress, issuerId } = req.query as {
      walletAddress?: string;
      issuerId?: string;
    };

    const filter: any = {};
    if (walletAddress) {
      filter.walletAddress = String(walletAddress).toLowerCase();
    }
    if (issuerId) {
      filter.issuerId = issuerId;
    }

    const creds = await Credential.find(filter).lean();
    const now = Date.now();
    const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";
    const withStatus = creds.map((c) => {
      const isExpired = new Date(c.expirationDate).getTime() <= now;
      let status = c.revocationStatus;
      if (status === "ACTIVE" && isExpired) {
        status = "EXPIRED";
      }
      const qrPath = `/verify/qr?cid=${c.credentialId}&t=${c.qrCodeToken}&sig=${signQrPayload(
        c.credentialId,
        c.qrCodeToken
      )}`;
      const verifyUrl = `${baseUrl}${qrPath}`;
      return { ...c, status, qrPath, verifyUrl };
    });

    return res.json(withStatus);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

credentialsRouter.get("/verificationLogs", async (req, res) => {
  try {
    const { credentialId, walletAddress, issuerId } = req.query as any;
    const filter: any = {};
    if (credentialId) filter.credentialId = credentialId;
    if (walletAddress) filter.walletAddress = String(walletAddress).toLowerCase();
    if (issuerId) filter.issuerId = issuerId;
    const logs = await VerificationLog.find(filter).sort({ timestamp: -1 }).lean();
    return res.json(logs);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

credentialsRouter.get("/activityTimeline", async (req, res) => {
  try {
    const { walletAddress, issuerId } = req.query as any;
    const filter: any = {};
    if (walletAddress) filter.walletAddress = String(walletAddress).toLowerCase();
    if (issuerId) filter.issuerId = issuerId;
    const events = await ActivityTimeline.find(filter).sort({ timestamp: -1 }).lean();
    return res.json(events);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch activity" });
  }
});

credentialsRouter.get(
  "/issuer/securitySettings",
  requireIssuerAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const issuerId = req.auth!.issuerId;
      const issuer = await Issuer.findOne({ issuerId }).lean();
      if (!issuer) {
        return res.status(404).json({ error: "Issuer not found" });
      }
      return res.json({
        enforceZkVerification: issuer.enforceZkVerification ?? false,
        allowQrVerification: issuer.allowQrVerification ?? true,
        sessionTimeoutMinutes: issuer.sessionTimeoutMinutes ?? 60,
        autoRevokeExpired: issuer.autoRevokeExpired ?? true,
        rateLimitPerMinute: issuer.rateLimitPerMinute ?? 30,
        auditRetentionDays: issuer.auditRetentionDays ?? 90
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Failed to fetch security settings" });
    }
  }
);

credentialsRouter.post(
  "/issuer/securitySettings",
  requireIssuerAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const issuerId = req.auth!.issuerId;
      const {
        enforceZkVerification,
        allowQrVerification,
        sessionTimeoutMinutes,
        autoRevokeExpired,
        rateLimitPerMinute,
        auditRetentionDays
      } = req.body as {
        enforceZkVerification?: boolean;
        allowQrVerification?: boolean;
        sessionTimeoutMinutes?: number;
        autoRevokeExpired?: boolean;
        rateLimitPerMinute?: number;
        auditRetentionDays?: number;
      };

      const issuer = await Issuer.findOne({ issuerId });
      if (!issuer) {
        return res.status(404).json({ error: "Issuer not found" });
      }

      if (typeof enforceZkVerification === "boolean") {
        issuer.enforceZkVerification = enforceZkVerification;
      }
      if (typeof allowQrVerification === "boolean") {
        issuer.allowQrVerification = allowQrVerification;
      }
      if (
        typeof sessionTimeoutMinutes === "number" &&
        Number.isFinite(sessionTimeoutMinutes) &&
        sessionTimeoutMinutes > 0
      ) {
        issuer.sessionTimeoutMinutes = Math.min(sessionTimeoutMinutes, 24 * 60);
      }
      if (typeof autoRevokeExpired === "boolean") {
        issuer.autoRevokeExpired = autoRevokeExpired;
      }
      if (
        typeof rateLimitPerMinute === "number" &&
        Number.isFinite(rateLimitPerMinute) &&
        rateLimitPerMinute >= 1
      ) {
        issuer.rateLimitPerMinute = Math.min(rateLimitPerMinute, 300);
      }
      if (
        typeof auditRetentionDays === "number" &&
        Number.isFinite(auditRetentionDays) &&
        auditRetentionDays >= 1
      ) {
        issuer.auditRetentionDays = Math.min(auditRetentionDays, 365);
      }

      await issuer.save();

      return res.json({
        enforceZkVerification: issuer.enforceZkVerification ?? false,
        allowQrVerification: issuer.allowQrVerification ?? true,
        sessionTimeoutMinutes: issuer.sessionTimeoutMinutes ?? 60,
        autoRevokeExpired: issuer.autoRevokeExpired ?? true,
        rateLimitPerMinute: issuer.rateLimitPerMinute ?? 30,
        auditRetentionDays: issuer.auditRetentionDays ?? 90
      });
    } catch (err: any) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Failed to update security settings" });
    }
  }
);

credentialsRouter.get("/verify/qr", async (req, res) => {
  try {
    const { cid, t, sig } = req.query as {
      cid?: string;
      t?: string;
      sig?: string;
    };
    if (!cid || !t || !sig) {
      return res.status(400).json({ error: "Missing QR parameters" });
    }

    const cred = await Credential.findOne({
      credentialId: cid,
      qrCodeToken: t
    });
    if (!cred) {
      return res.status(404).json({ error: "Credential not found" });
    }

    const expectedSig = signQrPayload(cred.credentialId, cred.qrCodeToken);
    if (expectedSig !== sig) {
      return res.status(400).json({ error: "Invalid QR signature" });
    }

    let onchain: { valid: boolean; revoked: boolean };
    try {
      const chain = await verifyCredentialOnChain(cred.credentialHash);
      onchain = { valid: chain.valid, revoked: chain.revoked };
    } catch (chainErr) {
      console.warn("verifyCredentialOnChain (QR) failed, falling back to off-chain:", chainErr);
      const revoked = cred.revocationStatus === "REVOKED";
      onchain = { valid: !revoked, revoked };
    }
    const now = Date.now();
    const isExpired = new Date(cred.expirationDate).getTime() <= now;
    const valid = onchain.valid && !isExpired;

    await VerificationLog.create({
      credentialId: cred.credentialId,
      walletAddress: cred.walletAddress,
      issuerId: cred.issuerId,
      timestamp: new Date(),
      result: valid ? "SUCCESS" : "FAILURE",
      reason: valid ? undefined : "Invalid via QR",
      viaQr: true,
      txHash: cred.transactionHash
    });

    const payload: any = {
      valid,
      credentialType: cred.credentialType,
      status: valid ? "ACTIVE" : isExpired ? "EXPIRED" : "REVOKED",
      walletMasked: cred.walletAddress.slice(0, 6) + "..." + cred.walletAddress.slice(-4)
    };

    const linkedId = (cred as any).linkedIdentityId;
    if (valid && linkedId) {
      const identity = await UserIdentity.findOne({ identityId: linkedId, status: "ACTIVE" }).lean();
      if (identity) {
        const displayName = identity.displayName ?? "User";
        const expiresAt = Math.floor(Date.now() / 1000) + 300;
        payload.identityId = linkedId;
        payload.claims = { displayName, emailVerified: true };
        payload.claimsSignature = signIdentityClaims({ identityId: linkedId, displayName, emailVerified: true, expiresAt });
        payload.expiresAt = expiresAt;
      }
    }

    return res.json(payload);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed QR verification" });
  }
});

