// src/services/fileDelivery.js
// Pengiriman file sertifikat untuk endpoint UNDUHAN akses-terkontrol (Fase C3).
// Dipakai bersama oleh /api/v1/me/.../download (penerima) dan
// /api/v1/certificates/:id/download (staf) agar logikanya tidak terduplikasi.
//
//   - provider lokal: PDF inline untuk pratinjau, attachment untuk unduhan.
//   - provider IPFS/Pinata: tak ada file lokal -> arahkan ke gateway.

const storage = require("../storage");
const fs = require("fs/promises");
const AppError = require("../utils/AppError");
const { hasPdfHeader } = require("../utils/certificatePdf");

async function validateCid(cid) {
  try {
    const { CID } = await import("multiformats/cid");
    CID.parse(cid);
  } catch {
    throw new AppError("CID file tidak valid.", 400, "INVALID_CID");
  }
}

async function sendStoredFile(res, cid, { download = false, certificateId } = {}) {
  await validateCid(cid);
  if (typeof storage.getPath === "function") {
    const filePath = storage.getPath(cid);
    let handle;
    let isPdf;
    try {
      handle = await fs.open(filePath, "r");
      const header = Buffer.alloc(8);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      isPdf = hasPdfHeader(header.subarray(0, bytesRead));
    } catch (err) {
      if (err.code === "ENOENT" || err.code === "EISDIR") {
        throw new AppError("File tidak tersedia di node ini.", 404, "FILE_NOT_FOUND");
      }
      throw err;
    } finally {
      await handle?.close();
    }

    const identifier = /^0x[\da-f]{64}$/i.test(certificateId || "") ? certificateId : cid;
    const filename = `certificate-${identifier}${isPdf ? ".pdf" : ""}`;
    // CID paths have no extension: Express otherwise guesses octet-stream.
    // Legacy non-PDF artifacts remain downloads, not mislabeled PDF documents.
    const disposition = download || !isPdf ? "attachment" : "inline";
    return new Promise((resolve, reject) => {
      res.sendFile(filePath, {
        headers: {
          "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
          "Content-Disposition": `${disposition}; filename="${filename}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      }, (err) => err ? reject(err) : resolve());
    });
  }
  const gateway = new URL(storage.gatewayUrl(cid));
  gateway.searchParams.set("download", String(download));
  return res.redirect(gateway.toString());
}

function sendCertificateFile(res, cert) {
  return sendStoredFile(res, cert.file_cid, { download: true, certificateId: cert.certificate_id });
}

module.exports = { sendCertificateFile, sendStoredFile, validateCid };
