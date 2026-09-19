const { PDFDocument } = require("pdf-lib");
const AppError = require("./AppError");

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function hasPdfHeader(buffer) {
  return buffer.length >= 8 && /^%PDF-\d\.\d/.test(buffer.subarray(0, 8).toString("ascii"));
}

// Validate without saving/re-rendering: uploaded bytes (including signatures)
// must be exactly the bytes stored and anchored on-chain.
async function validateCertificatePdf(buffer, filename, mimeType) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new AppError("File PDF sertifikat wajib diunggah.", 400, "INVALID_PDF");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new AppError("Ukuran PDF maksimal 10 MB.", 413, "PDF_TOO_LARGE");
  }
  const type = (mimeType || "").toLowerCase();
  if (typeof filename !== "string" || !/\.pdf$/i.test(filename) ||
      !["", "application/pdf", "application/octet-stream"].includes(type) || !hasPdfHeader(buffer)) {
    throw new AppError("Sertifikat harus berupa file PDF (.pdf), bukan gambar atau file lain.", 400, "INVALID_PDF");
  }
  try {
    const doc = await PDFDocument.load(buffer, { updateMetadata: false, throwOnInvalidObject: true });
    if (!doc.getPageCount()) throw new Error("Empty PDF");
  } catch {
    throw new AppError("PDF tidak dapat dibaca. Gunakan PDF yang valid dan tidak dilindungi password.", 400, "INVALID_PDF");
  }
}

module.exports = { hasPdfHeader, validateCertificatePdf, MAX_PDF_BYTES };
