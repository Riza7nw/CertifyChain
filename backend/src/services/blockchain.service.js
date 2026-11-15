// src/services/blockchain.service.js
// Lapisan yang berbicara langsung dengan smart contract (V3 multi-institusi) via ethers v6.

const { ethers } = require("ethers");
const path = require("path");
const config = require("../config");
const AppError = require("../utils/AppError");

const abi = require(path.join(__dirname, "..", "abi", "CertifyChainMultiInstitution.json"));

// --- Inisialisasi koneksi (sekali saat modul dimuat) ---
// pollingInterval: seberapa sering ethers mengecek receipt saat `tx.wait()`.
// Bawaan ethers 4000 ms -> di L2 (blok <1 detik) tiap penerbitan jadi menunggu
// ~4 detik tanpa perlu. 500 ms membuat konfirmasi terasa instan.
// staticNetwork: jaringan sudah pasti (CHAIN_ID), jadi ethers tidak perlu memanggil
// eth_chainId berulang -> hemat satu round-trip RPC per transaksi.
const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, {
  pollingInterval: parseInt(process.env.RPC_POLLING_INTERVAL_MS || "500", 10),
  ...(config.chainId ? { staticNetwork: ethers.Network.from(config.chainId) } : {}),
});
const wallet = new ethers.Wallet(config.privateKey, provider);
const contract = new ethers.Contract(config.contractAddress, abi, wallet);

/** Menerjemahkan error kontrak/ethers menjadi AppError yang ramah client. */
/**
 * Nama custom error kontrak dari sebuah error ethers.
 * Untuk transaksi TULIS, revert terjadi saat estimateGas dan ethers tidak
 * men-decode-nya (`err.revert` kosong -> "unknown custom error"); data mentahnya
 * tetap ada di `err.data`, jadi di-decode sendiri dengan ABI kontrak.
 */
function revertNameOf(err) {
  if (err?.revert?.name) return err.revert.name;
  const data = err?.data ?? err?.info?.error?.data;
  if (typeof data === "string" && data.length >= 10) {
    try {
      return contract.interface.parseError(data)?.name || null;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeBlockchainError(err) {
  const revertName = revertNameOf(err);
  switch (revertName) {
    case "CertificateNotFound":
      return new AppError("Sertifikat tidak ditemukan di blockchain.", 404, "CERT_NOT_FOUND");
    case "CertificateAlreadyExists":
      return new AppError("certificateId sudah pernah diterbitkan.", 409, "CERT_EXISTS");
    case "InstitutionNotFound":
      return new AppError(
        "Institusi organisasi ini belum terdaftar di jaringan blockchain yang aktif. Minta admin platform melakukan provision ulang.",
        404,
        "INSTITUTION_NOT_FOUND"
      );
    case "InstitutionInactive":
      return new AppError("Institusi sedang nonaktif/di-suspend.", 403, "INSTITUTION_INACTIVE");
    case "NotIssuer":
      return new AppError(
        "Wallet backend bukan issuer institusi ini di jaringan blockchain yang aktif. Organisasi perlu di-provision ulang.",
        403,
        "NOT_ISSUER"
      );
    case "AccessControlUnauthorizedAccount":
      return new AppError("Akun tidak memiliki role yang dibutuhkan di kontrak.", 403, "FORBIDDEN_ONCHAIN");
    case "EnforcedPause":
      return new AppError("Penerbitan dihentikan sementara (kontrak di-pause).", 503, "CONTRACT_PAUSED");
    case "EmptyName":
    case "EmptyFileCid":
    case "InvalidDataHash":
    case "InvalidCertificateId":
      return new AppError(`Input ditolak kontrak: ${revertName}`, 400, "INVALID_INPUT");
    default:
      break;
  }

  if (err?.code === "NETWORK_ERROR" || err?.code === "SERVER_ERROR") {
    return new AppError("Gagal terhubung ke node blockchain (RPC).", 502, "RPC_ERROR");
  }
  if (err?.code === "INSUFFICIENT_FUNDS") {
    return new AppError("Saldo wallet tidak cukup untuk membayar gas.", 402, "INSUFFICIENT_FUNDS");
  }
  if (err?.code === "INVALID_ARGUMENT") {
    return new AppError("Argumen tidak valid saat memanggil kontrak.", 400, "INVALID_ARGUMENT");
  }

  return new AppError(
    `Kesalahan blockchain: ${err?.shortMessage || err?.message || "unknown"}`,
    500,
    "BLOCKCHAIN_ERROR"
  );
}

/**
 * Mendaftarkan institusi (write). Mengembalikan institutionId dari event.
 */
async function registerInstitution(adminAddress, name, metadataCid = "") {
  try {
    const tx = await contract.registerInstitution(adminAddress, name, metadataCid);
    const receipt = await tx.wait();

    // Ambil institutionId dari event InstitutionRegistered.
    let institutionId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "InstitutionRegistered") {
          institutionId = Number(parsed.args.institutionId);
          break;
        }
      } catch {
        /* log dari kontrak lain */
      }
    }
    return { institutionId, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (err) {
    throw normalizeBlockchainError(err);
  }
}

/**
 * Menerbitkan sertifikat (write) atas nama sebuah institusi.
 */
async function issueCertificate(institutionId, certificateId, dataHash, fileCid) {
  try {
    const tx = await contract.issueCertificate(institutionId, certificateId, dataHash, fileCid);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err) {
    throw normalizeBlockchainError(err);
  }
}

/** Verifikasi sertifikat (read). */
async function verifyCertificate(certificateId) {
  try {
    return await contract.verifyCertificate(certificateId);
  } catch (err) {
    throw normalizeBlockchainError(err);
  }
}

/** Ambil detail sertifikat dari chain (sumber kebenaran). */
async function getCertificate(certificateId) {
  try {
    const r = await contract.getCertificate(certificateId);
    return {
      certificateId,
      institutionId: Number(r.institutionId),
      dataHash: r.dataHash,
      fileCid: r.fileCid,
      timestamp: Number(r.timestamp),
      issuedAt: new Date(Number(r.timestamp) * 1000).toISOString(),
      issuedBy: r.issuedBy,
      isValid: r.isValid,
    };
  } catch (err) {
    throw normalizeBlockchainError(err);
  }
}

/** Ambil detail institusi dari chain. */
async function getInstitution(institutionId) {
  try {
    const r = await contract.getInstitution(institutionId);
    return {
      institutionId: Number(institutionId),
      name: r.name,
      metadataCid: r.metadataCid,
      admin: r.admin,
      active: r.active,
    };
  } catch (err) {
    throw normalizeBlockchainError(err);
  }
}

/** Status koneksi (untuk /health). */
async function getStatus() {
  const [network, blockNumber, institutionCount, totalCertificates, paused] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    contract.institutionCount(),
    contract.totalCertificates(),
    contract.paused(),
  ]);
  return {
    chainId: Number(network.chainId),
    blockNumber,
    contractAddress: config.contractAddress,
    backendWallet: wallet.address,
    institutionCount: Number(institutionCount),
    totalCertificates: Number(totalCertificates),
    paused,
  };
}

module.exports = {
  contract, // diekspor untuk indexer (read-only event)
  provider,
  walletAddress: wallet.address, // alamat signer backend (custodial)
  registerInstitution,
  issueCertificate,
  verifyCertificate,
  getCertificate,
  getInstitution,
  getStatus,
};
