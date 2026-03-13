"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCredentialHash = computeCredentialHash;
exports.generateQrToken = generateQrToken;
exports.signQrPayload = signQrPayload;
const ethers_1 = require("ethers");
const crypto_1 = __importDefault(require("crypto"));
const QR_SIGNING_KEY = process.env.QR_SIGNING_KEY || "dev-qr-key";
function computeCredentialHash(input) {
    const payload = `${input.walletAddress.toLowerCase()}|${input.credentialType}|${input.issuerId}|${input.expirationDate}`;
    return (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(payload));
}
function generateQrToken() {
    return crypto_1.default.randomBytes(16).toString("hex");
}
function signQrPayload(credentialId, token) {
    const hmac = crypto_1.default.createHmac("sha256", QR_SIGNING_KEY);
    hmac.update(`${credentialId}|${token}`);
    return hmac.digest("hex");
}
