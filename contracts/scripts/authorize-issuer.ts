import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x839E3276a6d830859d2F2E9d7f0f5E5cf9AA09f7";

  const signers = await ethers.getSigners();
  const [deployer] = signers;
  if (!deployer) {
    throw new Error("No deployer account available.");
  }

  console.log("Using deployer:", deployer.address);

  const PrivacyPass = await ethers.getContractAt("PrivacyPass", contractAddress);

  const isAlready = await PrivacyPass.authorizedIssuers(deployer.address);
  if (isAlready) {
    console.log("Deployer is already authorized as issuer.");
    return;
  }

  console.log("Authorizing deployer as issuer...");
  const tx = await PrivacyPass.authorizeIssuer(deployer.address, true);
  const receipt = await tx.wait();
  console.log("Authorized! Tx hash:", receipt?.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
