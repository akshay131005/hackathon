import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const [deployer] = signers;
  if (!deployer) {
    throw new Error("No deployer account available for deployment.");
  }

  console.log("Deploying PrivacyPass with account:", deployer.address);

  const PrivacyPass = await ethers.getContractFactory("PrivacyPass");
  const contract = await PrivacyPass.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  const network = await ethers.provider.getNetwork();

  console.log("PrivacyPass deployed to:", contractAddress);

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const deployment = {
    address: contractAddress,
    network: network.name,
    chainId: network.chainId.toString()
  };

  fs.writeFileSync(
    path.join(outDir, "PrivacyPass.json"),
    JSON.stringify(deployment, null, 2),
    { encoding: "utf-8" }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

