"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCredentialOnChain = registerCredentialOnChain;
exports.revokeCredentialOnChain = revokeCredentialOnChain;
exports.verifyCredentialOnChain = verifyCredentialOnChain;
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
if (!RPC_URL || !CONTRACT_ADDRESS) {
    // In dev this may be unset until configured.
    console.warn("RPC_URL or CONTRACT_ADDRESS not set; blockchain calls will fail.");
}
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
const signer = PRIVATE_KEY ? new ethers_1.ethers.Wallet(PRIVATE_KEY, provider) : undefined;
// Try to load ABI from contracts artifacts if present
let abi = [];
try {
    const artifactPath = path_1.default.join(__dirname, "..", "..", "contracts-artifacts", "PrivacyPass.json");
    if (fs_1.default.existsSync(artifactPath)) {
        const json = JSON.parse(fs_1.default.readFileSync(artifactPath, "utf-8"));
        abi = json.abi;
    }
}
catch {
    // ignore
}
const contract = abi.length && CONTRACT_ADDRESS && signer
    ? new ethers_1.ethers.Contract(CONTRACT_ADDRESS, abi, signer)
    : null;
async function registerCredentialOnChain(credentialHash, subject, expiresAt, zkCommitment) {
    if (!contract) {
        throw new Error("Contract not configured");
    }
    const tx = await contract.registerCredential(credentialHash, subject, expiresAt, zkCommitment);
    const receipt = await tx.wait();
    return receipt.hash;
}
async function revokeCredentialOnChain(credentialHash) {
    if (!contract) {
        throw new Error("Contract not configured");
    }
    const tx = await contract.revokeCredential(credentialHash);
    const receipt = await tx.wait();
    return receipt.hash;
}
async function verifyCredentialOnChain(credentialHash) {
    if (!contract) {
        throw new Error("Contract not configured");
    }
    const [valid, revoked, expiresAt, issuer, subject] = await contract.verifyCredential(credentialHash);
    return {
        valid: Boolean(valid),
        revoked: Boolean(revoked),
        expiresAt: Number(expiresAt),
        issuer,
        subject
    };
}
