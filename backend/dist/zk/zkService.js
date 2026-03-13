"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyZkProof = verifyZkProof;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const snarkjs = require("snarkjs");
function loadVKey(circuitType) {
    const envKey = `ZKP_${circuitType.toUpperCase()}_VKEY_PATH`;
    const p = process.env[envKey];
    if (!p) {
        throw new Error(`Missing env var ${envKey}`);
    }
    const resolved = path_1.default.resolve(p);
    const raw = fs_1.default.readFileSync(resolved, "utf-8");
    return JSON.parse(raw);
}
async function verifyZkProof(params) {
    const vKey = loadVKey(params.circuitType);
    const ok = await snarkjs.groth16.verify(vKey, params.publicSignals, params.proof);
    if (!ok)
        return false;
    const commitmentFromProof = params.publicSignals[0];
    return (typeof commitmentFromProof === "string" &&
        commitmentFromProof.toLowerCase() === params.expectedCommitment.toLowerCase());
}
