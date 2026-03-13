import { keccak256, toUtf8Bytes } from "ethers";
import crypto from "crypto";

const QR_SIGNING_KEY = process.env.QR_SIGNING_KEY || "dev-qr-key";

export function computeCredentialHash(input: {
  walletAddress: string;
  credentialType: string;
  issuerId: string;
  expirationDate: string;
}) {
  const payload = `${input.walletAddress.toLowerCase()}|${input.credentialType}|${
    input.issuerId
  }|${input.expirationDate}`;
  return keccak256(toUtf8Bytes(payload));
}

export function generateQrToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function signQrPayload(credentialId: string, token: string) {
  const hmac = crypto.createHmac("sha256", QR_SIGNING_KEY);
  hmac.update(`${credentialId}|${token}`);
  return hmac.digest("hex");
}

/** Hash for identity lookup - we never store plaintext email */
export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

/** Hash for identity - we never store plaintext name */
export function hashName(name: string): string {
  return crypto.createHash("sha256").update(name.trim()).digest("hex");
}

/** Commitment anchored on-chain: keccak256(name|email|passwordHash) */
export function computeIdentityCommitment(name: string, email: string, passwordHash: string): string {
  const payload = `${name.trim()}|${email.toLowerCase().trim()}|${passwordHash}`;
  return keccak256(toUtf8Bytes(payload));
}

/** Sign a login token for external site verification */
export function signLoginToken(identityId: string, expiresAt: number): string {
  const hmac = crypto.createHmac("sha256", QR_SIGNING_KEY);
  hmac.update(`${identityId}|${expiresAt}`);
  return hmac.digest("hex");
}

/** Verify a login token */
export function verifyLoginToken(identityId: string, expiresAt: number, signature: string): boolean {
  const expected = signLoginToken(identityId, expiresAt);
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

/** Sign identity claims so external sites can trust displayName / emailVerified */
export function signIdentityClaims(payload: { identityId: string; displayName: string; emailVerified: boolean; expiresAt: number }): string {
  const hmac = crypto.createHmac("sha256", QR_SIGNING_KEY);
  hmac.update(JSON.stringify({ identityId: payload.identityId, displayName: payload.displayName, emailVerified: payload.emailVerified, expiresAt: payload.expiresAt }));
  return hmac.digest("hex");
}

/** Verify identity claims signature */
export function verifyIdentityClaims(payload: { identityId: string; displayName: string; emailVerified: boolean; expiresAt: number }, signature: string): boolean {
  const expected = signIdentityClaims(payload);
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

