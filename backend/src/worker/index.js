// src/worker/index.js
// Worker antrian render PDF (Fase C-scale). Proses TERPISAH dari API server:
//   npm run worker
// Loop: klaim job (FOR UPDATE SKIP LOCKED) -> render PDF + issue on-chain di latar ->
// update read-model + tandai job done/failed. Bisa dijalankan banyak instance paralel
// (SKIP LOCKED menjamin tiap job hanya diambil satu worker). Mengikuti pola indexer.

const config = require("../config");
const renderJobs = require("../db/renderJobs.repo");
const renderQueue = require("../services/renderQueue.service");

const WORKER_ID = `worker-${process.pid}`;
let running = true;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function processOne() {
  const job = await renderJobs.claimNext(WORKER_ID, { stuckMs: config.renderWorker.stuckMs });
  if (!job) return false;

  console.log(`[worker] job #${job.id} cert ${job.certificate_id} (attempt ${job.attempts}/${job.max_attempts})`);
  try {
    const result = await renderQueue.processJob(job);
    const txHash = result.transaction?.txHash || null;
    await renderJobs.markDone(job.id, {
      txHash,
      fileCid: result.fileCid || null,
      result: {
        certificateId: result.certificateId,
        verificationUrl: result.verificationUrl,
        fileCid: result.fileCid || null,
        fileAccess: result.fileAccess || "private",
        signed: !!result.signed,
        txHash,
      },
    });
    console.log(`[worker] job #${job.id} DONE${result.reused ? " (idempoten/reuse)" : ""} tx=${txHash || "-"}`);
  } catch (e) {
    const outcome = await renderJobs.markFailed(job.id, e.message || String(e), {
      maxAttempts: config.renderJob.maxAttempts,
      backoffMs: config.renderJob.backoffMs,
    });
    console.error(`[worker] job #${job.id} ${outcome.toUpperCase()} — ${e.message || e}`);
  }
  return true;
}

async function loop() {
  if (config.dbDriver !== "postgres") {
    console.error("[worker] DB_DRIVER bukan 'postgres' — antrian render butuh Postgres. Keluar.");
    process.exit(1);
  }
  await renderJobs.ensureTable();
  console.log(`[worker] mulai (${WORKER_ID}); poll ${config.renderWorker.pollMs}ms; maxAttempts ${config.renderJob.maxAttempts}`);

  while (running) {
    let didWork = false;
    try {
      didWork = await processOne();
    } catch (e) {
      console.error("[worker] error tak terduga di loop:", e.message || e);
    }
    // Bila ada job, langsung lanjut (drain antrian); bila kosong, tidur sejenak.
    if (!didWork) await sleep(config.renderWorker.pollMs);
  }
}

function shutdown(sig) {
  console.log(`\n[worker] ${sig} diterima — berhenti setelah job berjalan selesai...`);
  running = false;
  // Beri waktu loop keluar; paksa keluar bila menggantung.
  setTimeout(() => process.exit(0), 10000).unref();
}

// Auto-start hanya bila dijalankan langsung (npm run worker); saat di-require (test)
// cukup ekspor fungsi agar bisa diuji satu iterasi tanpa loop tak berujung.
if (require.main === module) {
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  loop().catch((e) => {
    console.error("[worker] fatal:", e);
    process.exit(1);
  });
}

module.exports = { processOne, loop };
