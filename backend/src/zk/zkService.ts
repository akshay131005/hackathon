import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const snarkjs = require("snarkjs");

function loadVKey(circuitType: string) {
  const envKey = `ZKP_${circuitType.toUpperCase()}_VKEY_PATH`;
  const p = process.env[envKey];
  if (!p) {
    throw new Error(`Missing env var ${envKey}`);
  }
  const resolved = path.resolve(p);
  const raw = fs.readFileSync(resolved, "utf-8");
  return JSON.parse(raw);
}

export async function verifyZkProof(params: {
  circuitType: string;
  proof: any;
  publicSignals: any[];
  expectedCommitment: string;
}) {
  const vKey = loadVKey(params.circuitType);
  const ok = await snarkjs.groth16.verify(vKey, params.publicSignals, params.proof);
  if (!ok) return false;
  const commitmentFromProof = params.publicSignals[0];
  return (
    typeof commitmentFromProof === "string" &&
    commitmentFromProof.toLowerCase() === params.expectedCommitment.toLowerCase()
  );
}

