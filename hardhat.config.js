require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;
// RPC Arbitrum Sepolia; default = endpoint publik resmi (tanpa API key).
const ARBITRUM_SEPOLIA_RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

// Hardhat butuh private key ber-prefix 0x; backend/.env menyimpannya tanpa prefix.
const RAW_KEY = (process.env.PRIVATE_KEY || "").trim();
const PRIVATE_KEY = RAW_KEY && !RAW_KEY.startsWith("0x") ? `0x${RAW_KEY}` : RAW_KEY;

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

  // Network hanya didaftarkan bila PRIVATE_KEY tersedia, agar `hardhat test`/`compile`
  // tetap jalan tanpa .env (mis. di CI). Lihat .env.example.
  //  - arbitrumSepolia : jaringan AKTIF (L2, konfirmasi <1 detik).
  //  - sepolia         : jaringan lama (L1, blok ~12 detik); butuh RPC_URL.
  networks: {
    ...(PRIVATE_KEY
      ? {
          arbitrumSepolia: {
            url: ARBITRUM_SEPOLIA_RPC_URL,
            chainId: 421614,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
    ...(RPC_URL && PRIVATE_KEY
      ? { sepolia: { url: RPC_URL, chainId: 11155111, accounts: [PRIVATE_KEY] } }
      : {}),
  },
};
