// src/pdf/index.js
// Generator PDF sertifikat (Fase A). @react-pdf/renderer adalah ESM, backend CJS,
// jadi dimuat via dynamic import (di-cache). Render -> tanam QR -> metadata -> Buffer.

const { getTemplate, listTemplates, DEFAULT_TEMPLATE } = require("./templates/registry");
const { applyMetadata } = require("./postprocess");
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
async function generateCertificatePdf({ templateKey = DEFAULT_TEMPLATE, certificateId, recipientName, institutionName, issuedAt, body }) {
  const RP = await lib();
  const React = require("react");

  const verificationUrl = qrService.buildVerificationUrl(certificateId);
  const qrDataUrl = await qrService.generateQrDataUrl(verificationUrl);

  const tpl = getTemplate(templateKey);
  const element = tpl.build({
    RP,
    React,
    qrDataUrl,
    data: { recipientName, institutionName, issuedAt, certificateId, body, verificationUrl },
  });

  const rendered = await RP.renderToBuffer(element);
  const buffer = await applyMetadata(rendered, { recipientName, institutionName, certificateId, verificationUrl });

  return { buffer, templateKey, verificationUrl, qrDataUrl };
}

module.exports = { generateCertificatePdf, listTemplates };
