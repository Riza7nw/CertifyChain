// src/server.js
// Titik masuk aplikasi: baca config, jalankan server.

const app = require("./app");
const config = require("./config");

const server = app.listen(config.port, () => {
  console.log("==================================================");
  console.log(" CertifyChain Backend API");
  console.log(`  > Berjalan di  : http://localhost:${config.port}`);
  console.log(`  > Kontrak      : ${config.contractAddress}`);
  console.log("  > Endpoint     :");
  console.log("      GET  /health");
  console.log("      POST /api/auth/login              (publik)");
  console.log("      POST /api/issue-certificate       (admin/JWT)");
  console.log("      GET  /api/verify-certificate/:id  (publik)");
  console.log("      GET  /api/certificate/:id         (publik)");
  console.log("      GET  /api/certificate/:id/qrcode  (publik)");
  console.log("      GET  /api/audit                   (admin/JWT)");
  console.log("==================================================");
});

// Tangani error yang tidak tertangkap agar proses tidak mati diam-diam.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM diterima, menutup server...");
  server.close(() => process.exit(0));
});
