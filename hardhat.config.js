require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  // Network sepolia hanya didaftarkan bila RPC_URL & PRIVATE_KEY tersedia,
  // agar `hardhat test`/`compile` tetap jalan tanpa .env (mis. di CI).
  // Untuk deploy: sediakan kedua env (root .env atau inline), lihat .env.example.
  networks: {
    ...(RPC_URL && PRIVATE_KEY
      ? { sepolia: { url: RPC_URL, accounts: [PRIVATE_KEY] } }
      : {}),
  },
};