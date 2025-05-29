const hre = require("hardhat");

async function main() {
  const SacredFlame = await hre.ethers.getContractFactory("SacredFlame");
  const sacredFlame = await SacredFlame.deploy();

  await sacredFlame.waitForDeployment();

  console.log("🔥 Sacred Flame deployed to:", await sacredFlame.getAddress());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
