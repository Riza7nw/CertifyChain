// scripts/deployV2.js
// Deploy CertifyChainV2 (role-based). Jalankan:
//   npx hardhat run scripts/deployV2.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploy dengan akun:", deployer.address);

  // Admin awal = deployer (dapat DEFAULT_ADMIN_ROLE + ISSUER_ROLE).
  const Factory = await ethers.getContractFactory("CertifyChainV2");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CertifyChainV2 ter-deploy di:", address);
  console.log("Admin & issuer awal      :", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
