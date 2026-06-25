// src/utils/hash.js
// Helper untuk membuat hash & ID sertifikat memakai util ethers.

const { ethers } = require("ethers");

/**
 * Menghasilkan dataHash (bytes32) dari data sertifikat.
 * Memakai keccak256 — sama dengan yang dipakai kontrak (computeHash).
 * @param {string|object} data  String atau objek (akan di-JSON.stringify).
 * @returns {string} hash bytes32 (0x...)
 */
function generateDataHash(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return ethers.id(str); // ethers.id(x) = keccak256(toUtf8Bytes(x))
}

/**
 * Menghasilkan certificateId unik (bytes32) secara acak.
 * 32 byte acak -> peluang tabrakan praktis nol.
 * @returns {string} bytes32 (0x...)
 */
function generateCertificateId() {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Validasi bahwa sebuah string adalah bytes32 hex yang valid (0x + 64 hex).
 * @param {string} value
 * @returns {boolean}
 */
function isValidBytes32(value) {
  return typeof value === "string" && ethers.isHexString(value, 32);
}

/**
 * keccak256 atas BYTE mentah (mis. byte PDF) -> bytes32 hex.
 * Beda dengan generateDataHash yang meng-hash string/JSON.
 * @param {Buffer|Uint8Array} bytes
 * @returns {string} bytes32 (0x...)
 */
function keccak256Bytes(bytes) {
  return ethers.keccak256(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

module.exports = { generateDataHash, generateCertificateId, isValidBytes32, keccak256Bytes };
