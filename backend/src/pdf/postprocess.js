// src/pdf/postprocess.js
// Pasca-render: tanam metadata (certId + verifyUrl) ke document info PDF via pdf-lib,
// supaya bisa diekstrak otomatis saat verifikasi-by-file (Fase B).
// CATATAN: dataHash/fileCid TIDAK ditanam (sirkular — keduanya bergantung byte final).

const { PDFDocument } = require("pdf-lib");

async function applyMetadata(buffer, { recipientName, institutionName, certificateId, verificationUrl }) {
  const doc = await PDFDocument.load(buffer);
  doc.setTitle(`Sertifikat - ${recipientName || certificateId}`);
  doc.setAuthor(institutionName || "CertifyChain");
  doc.setSubject(verificationUrl || "");
  doc.setKeywords([`certId:${certificateId}`, "certifychain"]);
  doc.setCreator("CertifyChain");
  doc.setProducer("CertifyChain PDF Certificate");
  const out = await doc.save();
  return Buffer.from(out);
}

module.exports = { applyMetadata };
