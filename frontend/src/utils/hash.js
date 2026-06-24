// src/utils/hash.js
// Menghitung keccak256 dari data sertifikat di sisi client.
// Dipakai untuk fitur "cek keaslian data" di halaman verifikasi publik:
// verifier memasukkan data asli, lalu hash-nya dibandingkan dengan dataHash on-chain.
//
// Memakai "js-sha3" (ringan) — keccak256(string) memperlakukan input sebagai UTF-8,
// hasilnya identik dengan ethers.id() / computeHash() di smart contract.

import { keccak256 } from "js-sha3";

/**
 * @param {string|object} data
 * @returns {string} hash bytes32 (0x...)
 */
export function computeDataHash(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return "0x" + keccak256(str);
}
