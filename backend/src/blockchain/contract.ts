import { ethers } from "ethers";
import path from "path";
import fs from "fs";

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

if (!RPC_URL || !CONTRACT_ADDRESS) {
  // In dev this may be unset until configured.
  console.warn("RPC_URL or CONTRACT_ADDRESS not set; blockchain calls will fail.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : undefined;

// Try to load ABI from contracts artifacts if present
let abi: any[] = [];
try {
  const artifactPath = path.join(
    __dirname,
    "..",
    "..",
    "contracts-artifacts",
    "PrivacyPass.json"
  );
  if (fs.existsSync(artifactPath)) {
    const json = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    abi = json.abi;
  }
} catch {
  // ignore
}

const contract =
  abi.length && CONTRACT_ADDRESS && signer
    ? new ethers.Contract(CONTRACT_ADDRESS, abi, signer)
    : null;

export async function registerCredentialOnChain(
  credentialHash: string,
  subject: string,
  expiresAt: number,
  zkCommitment: string
): Promise<string> {
  if (!contract) {
    throw new Error("Contract not configured");
  }
  const tx = await contract.registerCredential(
    credentialHash,
    subject,
    expiresAt,
    zkCommitment
  );
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function revokeCredentialOnChain(
  credentialHash: string
): Promise<string> {
  if (!contract) {
    throw new Error("Contract not configured");
  }
  const tx = await contract.revokeCredential(credentialHash);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function verifyCredentialOnChain(credentialHash: string) {
  if (!contract) {
    throw new Error("Contract not configured");
  }
  const [valid, revoked, expiresAt, issuer, subject] =
    await contract.verifyCredential(credentialHash);
  return {
    valid: Boolean(valid),
    revoked: Boolean(revoked),
    expiresAt: Number(expiresAt),
    issuer,
    subject
  };
}

