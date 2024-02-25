//scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const SkiGuidePass = await ethers.getContractFactory("SkiGuidePass");
  
  const skiGuidePass = await SkiGuidePass.deploy();

  // Wait for the contract to be deployed
  await skiGuidePass.deployed();

  console.log(
    `SkiGuidePass deployed to ${skiGuidePass.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
