// src/storage/localProvider.js
// Provider penyimpanan DEV: simpan file di disk, tapi alamatkan dengan CID
// (content identifier) IPFS yang ASLI (CIDv1) -> konsep content-addressing sama
// dengan IPFS, tanpa perlu menjalankan node IPFS saat development.

const fs = require("fs");
const path = require("path");
const config = require("../config");

const DIR = config.storage.localDir;

// Hitung CIDv1 (raw codec, sha-256) memakai multiformats (ESM -> dynamic import).
async function computeCid(bytes) {
  const { CID } = await import("multiformats/cid");
  const raw = await import("multiformats/codecs/raw");
  const { sha256 } = await import("multiformats/hashes/sha2");
  const digest = await sha256.digest(bytes);
  return CID.create(1, raw.code, digest).toString(); // base32, mis. bafkrei...
}

async function add(buffer, filename = "file") {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const cid = await computeCid(bytes);
  const target = path.join(DIR, cid);
  if (!fs.existsSync(target)) fs.writeFileSync(target, buffer); // dedup by CID
  return { cid, size: buffer.length, filename };
}

function getPath(cid) {
  return path.join(DIR, cid);
}

function exists(cid) {
  return fs.existsSync(getPath(cid));
}

function gatewayUrl(cid) {
  return `${config.storage.gatewayBase}/${cid}`;
}

module.exports = { name: "local", add, getPath, exists, gatewayUrl, computeCid };
