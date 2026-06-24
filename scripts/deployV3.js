// scripts/deployV3.js
// Deploy CertifyChainMultiInstitution (V3). Jalankan:
//   npx hardhat run scripts/deployV3.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploy dengan akun (platform admin):", deployer.address);

  const Factory = await ethers.getContractFactory("CertifyChainMultiInstitution");
  const contract = await Factory.deploy(deployer.address); // deployer = PLATFORM admin
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  // Ambil nomor blok deployment (untuk INDEXER_START_BLOCK).
  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;
  const blockNumber = receipt ? receipt.blockNumber : null;

  console.log("CertifyChainMultiInstitution ter-deploy di:", address);
  console.log("Platform admin:", deployer.address);
  // Baris parseable (dipakai otomatisasi):
  console.log(`DEPLOY_ADDRESS=${address}`);
  console.log(`DEPLOY_BLOCK=${blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
