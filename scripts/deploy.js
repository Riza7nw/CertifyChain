// scripts/deploy.js
// Script deploy untuk Hardhat. Jalankan:
//   - Lokal       : npx hardhat run scripts/deploy.js
//   - Testnet     : npx hardhat run scripts/deploy.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploy dengan akun:", deployer.address);

  const CertifyChain = await ethers.getContractFactory("CertifyChain");
  const certifyChain = await CertifyChain.deploy();
  await certifyChain.waitForDeployment();

  const address = await certifyChain.getAddress();
  console.log("CertifyChain ter-deploy di:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
