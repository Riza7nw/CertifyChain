// src/pdf/index.js
// Generator PDF sertifikat (Fase A). @react-pdf/renderer adalah ESM, backend CJS,
// jadi dimuat via dynamic import (di-cache). Render -> tanam QR -> metadata -> Buffer.

const { getTemplate, listTemplates, DEFAULT_TEMPLATE } = require("./templates/registry");
const { applyMetadata } = require("./postprocess");
const sign = require("./sign");
const qrService = require("../services/qr.service");

let _rp; // cache modul react-pdf (ESM)
async function lib() {
  if (!_rp) _rp = await import("@react-pdf/renderer");
  return _rp;
}

/**
 * Render PDF sertifikat profesional.
 * @returns {Promise<{ buffer: Buffer, templateKey: string, verificationUrl: string, qrDataUrl: string }>}
 */
async function generateCertificatePdf({ templateKey = DEFAULT_TEMPLATE, accent, certificateId, recipientName, institutionName, issuedAt, body }) {
  const RP = await lib();
  const React = require("react");

  const verificationUrl = qrService.buildVerificationUrl(certificateId);
  const qrDataUrl = await qrService.generateQrDataUrl(verificationUrl);

  const tpl = getTemplate(templateKey);
  const element = tpl.build({
    RP,
    React,
    qrDataUrl,
    data: { recipientName, institutionName, issuedAt, certificateId, body, verificationUrl, accent },
  });

  const rendered = await RP.renderToBuffer(element);
  let buffer = await applyMetadata(rendered, { recipientName, institutionName, certificateId, verificationUrl });

  // Tanda tangan digital PAdES (opsional, Fase C2). Bila aktif, byte hasil tanda
  // tangan inilah yang di-pin & di-hash (jangkar anti-tamper tetap konsisten).
  let signed = false;
  const signedBuf = await sign.signPdf(buffer);
  if (signedBuf) {
    buffer = signedBuf;
    signed = true;
  }

  return { buffer, signed, templateKey, verificationUrl, qrDataUrl };
}

module.exports = { generateCertificatePdf, listTemplates };
