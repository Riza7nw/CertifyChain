// src/indexer/index.js
// Layanan INDEXER: mendengarkan event smart contract dan memproyeksikannya ke DB
// (read-model). Inilah jantung "read path" yang scalable — dashboard & statistik
// query ke DB hasil indexing, BUKAN ke node RPC (yang lambat & mahal untuk query).
//
// Jalankan sebagai PROSES TERPISAH dari API:  node src/indexer/index.js
// (di produksi: container/worker sendiri, bisa di-scale independen dari API).
//
// Pola yang dipakai:
//  - simpan lastProcessedBlock di tabel meta -> tahan restart (resume).
//  - backfill saat start, lalu polling berkala (cocok untuk RPC tanpa websocket).
//  - upsert idempotent -> aman jika event diproses ulang.

const { contract, provider } = require("../services/blockchain.service");
const db = require("../db");
const config = require("../config");
const { describeError, hintFromError } = require("../utils/describeError");

const META_KEY = "indexer:lastBlock";

/** Jeda non-blocking (untuk throttle request agar ramah rate-limit). */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cetak error secara lengkap + tebakan penyebab. */
function logError(context, err) {
  console.error(`\n[indexer] ${context} - DETAIL ERROR:`);
  console.error(describeError(err));
  const hint = hintFromError(err);
  if (hint) console.error(`[indexer] >>> Kemungkinan penyebab: ${hint}`);
  // Fallback ringkas (jaga kompatibilitas dengan pesan lama)
  console.error(`[indexer] ringkas: ${err?.shortMessage || err?.message || err}\n`);
}

/**
 * Preflight: validasi format URL + cek koneksi RPC SEKALI saat start,
 * supaya penyebab (URL/jaringan/API key) langsung kelihatan jelas.
 * @returns {Promise<boolean>} true jika RPC sehat.
 */
async function preflight() {
  // 1) Validasi format URL
  try {
    const u = new URL(config.rpcUrl);
    if (!/^https?:$|^wss?:$/.test(u.protocol)) {
      console.error(`[indexer] RPC_URL protokol tidak didukung: "${u.protocol}" (harus http/https/ws/wss).`);
      return false;
    }
    console.log(`[indexer] RPC_URL format OK -> ${u.protocol}//${u.host}`);
  } catch (e) {
    console.error(`[indexer] RPC_URL BUKAN URL VALID: "${config.rpcUrl}"`);
    logError("validasi RPC_URL", e);
    return false;
  }

  // 2) Cek koneksi nyata ke node
  try {
    const network = await provider.getNetwork();
    const block = await provider.getBlockNumber();
    console.log(
      `[indexer] Koneksi RPC OK -> chainId=${network.chainId}, blok terbaru=${block}`
    );
    if (config.chainId && Number(network.chainId) !== config.chainId) {
      console.warn(
        `[indexer] PERINGATAN: CHAIN_ID di .env (${config.chainId}) != chainId RPC (${network.chainId}).`
      );
    }

    console.log(
      `[indexer] Plan: mulai blok ${config.indexerStartBlock}, chunk ${config.indexerMaxBlockRange} blok/req, ` +
        `maks ${config.indexerMaxChunksPerCycle} chunk/siklus, jeda ${config.indexerRequestDelayMs}ms/request.`
    );
    const lastSaved = parseInt((await db.meta.get(META_KEY)) || "0", 10);
    if (lastSaved === 0 && config.indexerStartBlock === 0 && block > 100000) {
      console.warn(
        `[indexer] PERINGATAN: INDEXER_START_BLOCK=0 sedangkan blok terbaru ${block}. ` +
          `Backfill dari 0 akan SANGAT lambat. Set INDEXER_START_BLOCK ke blok deployment kontrak di .env.`
      );
    }
    return true;
  } catch (err) {
    logError("preflight getNetwork/getBlockNumber GAGAL", err);
    return false;
  }
}

async function handleEvent(ev) {
  const name = ev.fragment?.name;
  const a = ev.args;
  if (!name || !a) return;

  switch (name) {
    case "InstitutionRegistered":
      await db.institutions.upsert({
        id: Number(a.institutionId),
        name: a.name,
        metadataCid: a.metadataCid || null,
        adminAddress: a.admin,
        active: true,
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
      });
      break;

    case "InstitutionStatusChanged":
      await db.institutions.setActive(Number(a.institutionId), a.active);
      break;

    case "CertificateIssued":
      // recipient_name TIDAK ada di event (PII off-chain) -> upsert COALESCE
      // menjaga nilai yang sudah ditulis API. Indexer mengisi fakta on-chain.
      await db.certificates.upsert({
        certificateId: a.certificateId,
        institutionId: Number(a.institutionId),
        fileCid: a.fileCid,
        dataHash: a.dataHash,
        issuedBy: a.issuedBy,
        status: "valid",
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
        issuedAt: new Date(Number(a.timestamp) * 1000).toISOString(),
      });
      break;

    case "CertificateRevoked":
      await db.certificates.setStatus(a.certificateId, "revoked");
      break;

    default:
      break;
  }
}

const FILTERS = [
  "InstitutionRegistered",
  "InstitutionStatusChanged",
  "CertificateIssued",
  "CertificateRevoked",
];

/**
 * Ambil & proses event pada SATU rentang blok kecil [from, to].
 * Setiap filter = 1 request getLogs; beri jeda setelah tiap request agar
 * tidak menembak RPC terlalu cepat (hindari error 429 rate limit).
 */
async function syncRange(from, to) {
  let events = [];
  try {
    for (const name of FILTERS) {
      events = events.concat(await contract.queryFilter(contract.filters[name](), from, to));
      // Throttle: jeda setelah setiap request getLogs.
      if (config.indexerRequestDelayMs > 0) await sleep(config.indexerRequestDelayMs);
    }
  } catch (err) {
    logError(`queryFilter/getLogs (blok ${from}->${to}) GAGAL`, err);
    throw err;
  }
  events.sort((x, y) => x.blockNumber - y.blockNumber || x.index - y.index);
  for (const ev of events) await handleEvent(ev);
  return events.length;
}

async function sync() {
  let latest;
  try {
    latest = await provider.getBlockNumber();
  } catch (err) {
    logError("getBlockNumber (ambil blok terbaru) GAGAL", err);
    throw err;
  }

  const last = parseInt((await db.meta.get(META_KEY)) || "0", 10);
  // Mulai dari lastProcessed+1, atau dari blok deployment (indexerStartBlock).
  let cursor = last > 0 ? last + 1 : config.indexerStartBlock;
  if (cursor > latest) return;

  // eth_getLogs sering dibatasi RPC (mis. Alchemy free = 10 blok) -> CHUNKING.
  const range = Math.max(1, config.indexerMaxBlockRange);
  let chunks = 0;
  let totalEvents = 0;

  while (cursor <= latest && chunks < config.indexerMaxChunksPerCycle) {
    const end = Math.min(cursor + range - 1, latest);
    totalEvents += await syncRange(cursor, end);
    await db.meta.set(META_KEY, end); // simpan progres tiap chunk -> resume-safe
    cursor = end + 1;
    chunks += 1;
  }

  if (totalEvents > 0 || chunks > 0) {
    const done = cursor - 1;
    const behind = latest - done;
    console.log(
      `[indexer] diproses s/d blok ${done} (${totalEvents} event, ${chunks} chunk)` +
        (behind > 0 ? ` - masih tertinggal ${behind} blok, lanjut siklus berikutnya.` : " - sinkron.")
    );
  }
}

async function main() {
  console.log(`[indexer] mulai. Kontrak ${config.contractAddress}, polling ${config.indexerPollMs}ms`);

  // Diagnosis koneksi RPC sekali di awal -> penyebab langsung terlihat.
  const healthy = await preflight();
  if (!healthy) {
    console.error(
      "\n[indexer] Preflight RPC GAGAL. Perbaiki RPC_URL/jaringan/API key di backend/.env lalu jalankan ulang.\n"
    );
    process.exit(1); // berhenti dengan jelas daripada spam loop error
  }

  // Loop polling. (Alternatif produksi: contract.on(event, ...) via websocket provider.)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await sync();
    } catch (err) {
      // Detail sudah dicetak di dalam sync(); di sini cukup penanda siklus.
      console.error(`[indexer] siklus sync gagal, coba lagi dalam ${config.indexerPollMs}ms.`);
    }
    await new Promise((r) => setTimeout(r, config.indexerPollMs));
  }
}

if (require.main === module) {
  main();
}

module.exports = { sync, handleEvent };
