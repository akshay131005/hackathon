"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialsRouter = void 0;
const express_1 = require("express");
const Credential_1 = require("../models/Credential");
const ActivityTimeline_1 = require("../models/ActivityTimeline");
const VerificationLog_1 = require("../models/VerificationLog");
const Issuer_1 = require("../models/Issuer");
const auth_1 = require("../middleware/auth");
const crypto_1 = require("../utils/crypto");
const contract_1 = require("../blockchain/contract");
const uuid_1 = require("uuid");
const zkService_1 = require("../zk/zkService");
exports.credentialsRouter = (0, express_1.Router)();
exports.credentialsRouter.post("/issueCredential", auth_1.requireIssuerAuth, async (req, res) => {
    try {
        const { walletAddress, credentialType, issuerID, expirationDate, zkCommitment, zkCircuitType } = req.body;
        if (!walletAddress || !credentialType || !issuerID || !expirationDate) {
            return res.status(400).json({ error: "Missing fields" });
        }
        if (req.auth?.issuerId !== issuerID && req.auth?.role !== "admin") {
            return res.status(403).json({ error: "Issuer mismatch" });
        }
        const credentialId = (0, uuid_1.v4)();
        const credentialHash = (0, crypto_1.computeCredentialHash)({
            walletAddress,
            credentialType,
            issuerId: issuerID,
            expirationDate
        });
        const expiresAtSeconds = Math.floor(new Date(expirationDate).getTime() / 1000);
        const zkCommitmentHex = typeof zkCommitment === "string" && zkCommitment.length > 0
            ? zkCommitment
            : "0x0000000000000000000000000000000000000000000000000000000000000000";
        let txHash;
        try {
            txHash = await (0, contract_1.registerCredentialOnChain)(credentialHash, walletAddress, expiresAtSeconds, zkCommitmentHex);
        }
        catch (chainErr) {
            console.warn("registerCredentialOnChain failed, continuing without on-chain tx:", chainErr);
        }
        const qrCodeToken = (0, crypto_1.generateQrToken)();
        const now = new Date();
        const credential = await Credential_1.Credential.create({
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
        await ActivityTimeline_1.ActivityTimeline.create({
            eventType: "ISSUED",
            credentialId,
            walletAddress,
            issuerId: issuerID,
            timestamp: now,
            details: `Credential ${credentialType} issued`
        });
        return res.json(credential);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to issue credential" });
    }
});
exports.credentialsRouter.post("/verifyCredential", async (req, res) => {
    try {
        const { credentialID } = req.body;
        if (!credentialID) {
            return res.status(400).json({ error: "Missing credentialID" });
        }
        const cred = await Credential_1.Credential.findOne({ credentialId: credentialID });
        if (!cred) {
            return res.status(404).json({ error: "Credential not found" });
        }
        let onchain;
        try {
            const chain = await (0, contract_1.verifyCredentialOnChain)(cred.credentialHash);
            onchain = { valid: chain.valid, revoked: chain.revoked };
        }
        catch (chainErr) {
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
        await VerificationLog_1.VerificationLog.create({
            credentialId: cred.credentialId,
            walletAddress: cred.walletAddress,
            issuerId: cred.issuerId,
            timestamp: new Date(),
            result,
            reason,
            viaQr: false,
            txHash: cred.transactionHash
        });
        await ActivityTimeline_1.ActivityTimeline.create({
            eventType: "VERIFIED",
            credentialId: cred.credentialId,
            walletAddress: cred.walletAddress,
            issuerId: cred.issuerId,
            timestamp: new Date(),
            details: result === "SUCCESS" ? "Verification success" : `Verification failed: ${reason}`
        });
        return res.json({
            valid,
            revoked: onchain.revoked,
            expired: isExpired,
            txHash: cred.transactionHash,
            reason
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to verify credential" });
    }
});
exports.credentialsRouter.post("/verifyCredentialZkp", async (req, res) => {
    try {
        const { credentialID, proof, publicSignals } = req.body;
        if (!credentialID || !proof || !publicSignals) {
            return res.status(400).json({ error: "Missing fields" });
        }
        const cred = await Credential_1.Credential.findOne({ credentialId: credentialID });
        if (!cred || !cred.zkCommitment || !cred.zkCircuitType) {
            return res.status(400).json({ error: "Credential not ZK-enabled" });
        }
        let onchain;
        try {
            const chain = await (0, contract_1.verifyCredentialOnChain)(cred.credentialHash);
            onchain = { valid: chain.valid, revoked: chain.revoked };
        }
        catch (chainErr) {
            console.warn("verifyCredentialOnChain (ZK) failed, falling back to off-chain state:", chainErr);
            const revoked = cred.revocationStatus === "REVOKED";
            onchain = { valid: !revoked, revoked };
        }
        const now = Date.now();
        const isExpired = new Date(cred.expirationDate).getTime() <= now;
        const zkOk = await (0, zkService_1.verifyZkProof)({
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
        await VerificationLog_1.VerificationLog.create({
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
        await ActivityTimeline_1.ActivityTimeline.create({
            eventType: "VERIFIED",
            credentialId: cred.credentialId,
            walletAddress: cred.walletAddress,
            issuerId: cred.issuerId,
            timestamp: new Date(),
            details: valid ? "ZK verification success" : `ZK verification failed: ${reason}`
        });
        return res.json({
            valid,
            revoked: onchain.revoked,
            expired: isExpired,
            reason,
            txHash: cred.transactionHash
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed ZK verification" });
    }
});
exports.credentialsRouter.post("/revokeCredential", auth_1.requireIssuerAuth, async (req, res) => {
    try {
        const { credentialID } = req.body;
        if (!credentialID) {
            return res.status(400).json({ error: "Missing credentialID" });
        }
        const cred = await Credential_1.Credential.findOne({ credentialId: credentialID });
        if (!cred) {
            return res.status(404).json({ error: "Credential not found" });
        }
        if (req.auth?.issuerId !== cred.issuerId && req.auth?.role !== "admin") {
            return res.status(403).json({ error: "Not issuer of this credential" });
        }
        let txHash;
        try {
            txHash = await (0, contract_1.revokeCredentialOnChain)(cred.credentialHash);
        }
        catch (chainErr) {
            console.warn("revokeCredentialOnChain failed, marking as revoked off-chain:", chainErr);
        }
        cred.revocationStatus = "REVOKED";
        await cred.save();
        await ActivityTimeline_1.ActivityTimeline.create({
            eventType: "REVOKED",
            credentialId: cred.credentialId,
            walletAddress: cred.walletAddress,
            issuerId: cred.issuerId,
            timestamp: new Date(),
            details: "Credential revoked"
        });
        await VerificationLog_1.VerificationLog.create({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to revoke credential" });
    }
});
exports.credentialsRouter.get("/credentials", async (req, res) => {
    try {
        const { walletAddress, issuerId } = req.query;
        const filter = {};
        if (walletAddress) {
            filter.walletAddress = String(walletAddress).toLowerCase();
        }
        if (issuerId) {
            filter.issuerId = issuerId;
        }
        const creds = await Credential_1.Credential.find(filter).lean();
        const now = Date.now();
        const withStatus = creds.map((c) => {
            const isExpired = new Date(c.expirationDate).getTime() <= now;
            let status = c.revocationStatus;
            if (status === "ACTIVE" && isExpired) {
                status = "EXPIRED";
            }
            const qrPath = `/verify/qr?cid=${c.credentialId}&t=${c.qrCodeToken}&sig=${(0, crypto_1.signQrPayload)(c.credentialId, c.qrCodeToken)}`;
            return { ...c, status, qrPath };
        });
        return res.json(withStatus);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch credentials" });
    }
});
exports.credentialsRouter.get("/verificationLogs", async (req, res) => {
    try {
        const { credentialId, walletAddress, issuerId } = req.query;
        const filter = {};
        if (credentialId)
            filter.credentialId = credentialId;
        if (walletAddress)
            filter.walletAddress = String(walletAddress).toLowerCase();
        if (issuerId)
            filter.issuerId = issuerId;
        const logs = await VerificationLog_1.VerificationLog.find(filter).sort({ timestamp: -1 }).lean();
        return res.json(logs);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch logs" });
    }
});
exports.credentialsRouter.get("/activityTimeline", async (req, res) => {
    try {
        const { walletAddress, issuerId } = req.query;
        const filter = {};
        if (walletAddress)
            filter.walletAddress = String(walletAddress).toLowerCase();
        if (issuerId)
            filter.issuerId = issuerId;
        const events = await ActivityTimeline_1.ActivityTimeline.find(filter).sort({ timestamp: -1 }).lean();
        return res.json(events);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch activity" });
    }
});
exports.credentialsRouter.get("/issuer/securitySettings", auth_1.requireIssuerAuth, async (req, res) => {
    try {
        const issuerId = req.auth.issuerId;
        const issuer = await Issuer_1.Issuer.findOne({ issuerId }).lean();
        if (!issuer) {
            return res.status(404).json({ error: "Issuer not found" });
        }
        return res.json({
            enforceZkVerification: issuer.enforceZkVerification ?? false,
            allowQrVerification: issuer.allowQrVerification ?? true,
            sessionTimeoutMinutes: issuer.sessionTimeoutMinutes ?? 60
        });
    }
    catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ error: "Failed to fetch security settings" });
    }
});
exports.credentialsRouter.post("/issuer/securitySettings", auth_1.requireIssuerAuth, async (req, res) => {
    try {
        const issuerId = req.auth.issuerId;
        const { enforceZkVerification, allowQrVerification, sessionTimeoutMinutes } = req.body;
        const issuer = await Issuer_1.Issuer.findOne({ issuerId });
        if (!issuer) {
            return res.status(404).json({ error: "Issuer not found" });
        }
        if (typeof enforceZkVerification === "boolean") {
            issuer.enforceZkVerification = enforceZkVerification;
        }
        if (typeof allowQrVerification === "boolean") {
            issuer.allowQrVerification = allowQrVerification;
        }
        if (typeof sessionTimeoutMinutes === "number" &&
            Number.isFinite(sessionTimeoutMinutes) &&
            sessionTimeoutMinutes > 0) {
            issuer.sessionTimeoutMinutes = Math.min(sessionTimeoutMinutes, 24 * 60);
        }
        await issuer.save();
        return res.json({
            enforceZkVerification: issuer.enforceZkVerification ?? false,
            allowQrVerification: issuer.allowQrVerification ?? true,
            sessionTimeoutMinutes: issuer.sessionTimeoutMinutes ?? 60
        });
    }
    catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ error: "Failed to update security settings" });
    }
});
exports.credentialsRouter.get("/verify/qr", async (req, res) => {
    try {
        const { cid, t, sig } = req.query;
        if (!cid || !t || !sig) {
            return res.status(400).json({ error: "Missing QR parameters" });
        }
        const cred = await Credential_1.Credential.findOne({
            credentialId: cid,
            qrCodeToken: t
        });
        if (!cred) {
            return res.status(404).json({ error: "Credential not found" });
        }
        const expectedSig = (0, crypto_1.signQrPayload)(cred.credentialId, cred.qrCodeToken);
        if (expectedSig !== sig) {
            return res.status(400).json({ error: "Invalid QR signature" });
        }
        let onchain;
        try {
            const chain = await (0, contract_1.verifyCredentialOnChain)(cred.credentialHash);
            onchain = { valid: chain.valid, revoked: chain.revoked };
        }
        catch (chainErr) {
            console.warn("verifyCredentialOnChain (QR) failed, falling back to off-chain:", chainErr);
            const revoked = cred.revocationStatus === "REVOKED";
            onchain = { valid: !revoked, revoked };
        }
        const now = Date.now();
        const isExpired = new Date(cred.expirationDate).getTime() <= now;
        const valid = onchain.valid && !isExpired;
        await VerificationLog_1.VerificationLog.create({
            credentialId: cred.credentialId,
            walletAddress: cred.walletAddress,
            issuerId: cred.issuerId,
            timestamp: new Date(),
            result: valid ? "SUCCESS" : "FAILURE",
            reason: valid ? undefined : "Invalid via QR",
            viaQr: true,
            txHash: cred.transactionHash
        });
        return res.json({
            valid,
            credentialType: cred.credentialType,
            status: valid ? "ACTIVE" : isExpired ? "EXPIRED" : "REVOKED",
            walletMasked: cred.walletAddress.slice(0, 6) + "..." + cred.walletAddress.slice(-4)
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed QR verification" });
    }
});
