// scripts/gen-sign-cert.js
// Buat sertifikat self-signed (P12/PKCS#12) untuk tanda tangan digital PDF — DEV.
//   node scripts/gen-sign-cert.js   ->  secrets/pdf-signing.p12
//
// PRODUKSI: jangan pakai self-signed. Gunakan sertifikat dari CA terpercaya +
// simpan kunci di KMS/secret manager, jangan di disk repo.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const forge = require("node-forge");
const config = require("../src/config");

const OUT = config.pdfSign.p12Path;
const PASS = config.pdfSign.passphrase;

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = String(Date.now());
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
const attrs = [
  { name: "commonName", value: "CertifyChain Certificate Signing" },
  { name: "organizationName", value: "CertifyChain" },
  { name: "countryName", value: "ID" },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], PASS, { algorithm: "3des" });
const der = Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, der);
console.log("Sertifikat P12 dibuat:", OUT, `(${der.length} bytes)`);
console.log("Passphrase: dari PDF_SIGN_PASSPHRASE (default 'certifychain-dev').");
console.log("Aktifkan dgn PDF_SIGN_ENABLED=true di .env. SELF-SIGNED — dev only.");
