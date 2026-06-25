// src/storage/ipfsProvider.js
// Provider penyimpanan PRODUKSI: pin file ke IPFS.
//  - STORAGE_PROVIDER=ipfs   -> ke daemon IPFS (Kubo) lewat HTTP API /api/v0/add
//  - STORAGE_PROVIDER=pinata -> ke layanan pinning Pinata
// Memakai fetch + FormData/Blob bawaan Node (tanpa dependency tambahan).

const config = require("../config");

async function add(buffer, filename = "file") {
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);

  let url;
  const headers = {};

  if (config.storage.provider === "pinata") {
    if (!config.storage.pinataJwt) throw new Error("PINATA_JWT belum diset.");
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    headers.Authorization = `Bearer ${config.storage.pinataJwt}`;
  } else {
    // Kubo daemon
    url = `${config.storage.ipfsApiUrl.replace(/\/+$/, "")}/api/v0/add?cid-version=1&pin=true`;
  }

  const res = await fetch(url, { method: "POST", body: form, headers });
  if (!res.ok) {
    throw new Error(`IPFS add gagal (HTTP ${res.status}) via ${config.storage.provider}`);
  }
  const json = await res.json();
  // Pinata: { IpfsHash, PinSize } ; Kubo: { Hash, Size }
  const cid = json.IpfsHash || json.Hash;
  if (!cid) throw new Error("Respons IPFS tidak berisi CID.");
  return { cid, size: Number(json.PinSize || json.Size || buffer.length), filename };
}

function gatewayUrl(cid) {
  return `${config.storage.gatewayBase.replace(/\/+$/, "")}/${cid}`;
}

module.exports = { name: config.storage.provider, add, gatewayUrl };
