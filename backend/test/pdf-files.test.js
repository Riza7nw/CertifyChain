const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { PDFDocument } = require("pdf-lib");

// Isolated fixtures only: never use the developer's DB, wallet or storage.
Object.assign(process.env, {
  NODE_ENV: "test",
  RPC_URL: "http://127.0.0.1:1",
  PRIVATE_KEY: `0x${"1".repeat(64)}`,
  CONTRACT_ADDRESS: `0x${"2".repeat(40)}`,
  CHAIN_ID: "31337",
  JWT_SECRET: "pdf-regression-test-secret-not-for-production",
  ADMIN_USERNAME: "pdf-test",
  ADMIN_PASSWORD_HASH: "unused-test-password-hash",
  DB_DRIVER: "sqlite",
  DB_PATH: ":memory:",
  DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
  STORAGE_PROVIDER: "local",
  IPFS_GATEWAY_BASE: "/api/files",
  PUBLIC_BASE_URL: "http://localhost:5173",
  PDF_SIGN_ENABLED: "false",
  PDF_ASYNC_ENABLED: "false",
});

test("certificate PDF upload, verification and file delivery regression", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "certifychain-pdf-test-"));
  t.after(async () => {
    // Only delete individually enumerated fixture files in this allocated dir.
    for (const entry of await fs.readdir(dir)) await fs.unlink(path.join(dir, entry));
    await fs.rmdir(dir);
  });
  const config = require("../src/config");
  config.storage.localDir = dir;
  const db = require("../src/db");
  t.after(() => db.client.close());
  const storage = require("../src/storage");
  const blockchain = require("../src/services/blockchain.service");
  const service = require("../src/services/certificate.service");
  const { sendCertificateFile } = require("../src/services/fileDelivery");
  const { validateCertificatePdf, MAX_PDF_BYTES } = require("../src/utils/certificatePdf");
  const { keccak256Bytes } = require("../src/utils/hash");
  const { errorHandler } = require("../src/middlewares/errorHandler");
  const issue = t.mock.method(blockchain, "issueCertificate", async () => ({ txHash: `0x${"3".repeat(64)}`, blockNumber: 1 }));
  t.mock.method(require("../src/services/audit.service"), "record", () => {});
  const auth = require("../src/services/auth.service");
  const org = { id: 1, name: "Test organization", slug: "test", onchain_institution_id: 1 };
  // Prisma delegates are proxies (not ordinary method descriptors).
  const organizations = require("../src/db/prismaClient").organizations;
  const originalFindUnique = organizations.findUnique;
  organizations.findUnique = async () => org;
  t.after(() => { organizations.findUnique = originalFindUnique; });
  t.mock.method(auth, "getUserWithMemberships", async (id) => ({
    id, email: "test@example.test", role: "user", active: true,
    memberships: id === 1 ? [{ organization_id: 1, role: "Issuer", organization: org }] : [],
  }));
  const app = require("express")();
  app.use(require("helmet")());
  app.use("/api/v1", require("../src/routes/v1.org.routes"));
  app.use("/api/v1", require("../src/routes/v1.cert.routes"));
  app.use("/api", require("../src/routes/institution.routes"));
  app.use("/api", require("../src/routes/file.routes"));
  app.use("/api", require("../src/routes/certificate.routes"));
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = auth.signAccessToken({ id: 1, email: "issuer@example.test", role: "user" });
  const outsiderToken = auth.signAccessToken({ id: 2, email: "outsider@example.test", role: "user" });
  const legacyToken = require("jsonwebtoken").sign({ sub: "pdf-test", role: "admin" }, config.jwtSecret);
  const download = (id, accessToken = token) => fetch(`${base}/api/v1/certificates/${id}/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const doc = await PDFDocument.create();
  doc.addPage().drawText("ORIGINAL CERTIFICATE - byte preservation fixture");
  doc.setTitle("Original uploaded certificate");
  const original = Buffer.from(await doc.save());
  const upload = (bytes, filename = "original.pdf", type = "application/pdf", authorized = true, legacy = false) => {
    const form = new FormData();
    form.append("recipientName", "PDF Test Recipient");
    form.append("file", new Blob([bytes], { type }), filename);
    const endpoint = legacy ? "/api/institutions/1/certificates" : "/api/v1/orgs/1/certificates";
    return fetch(base + endpoint, {
      method: "POST", body: form,
      headers: authorized ? { Authorization: `Bearer ${legacy ? legacyToken : token}` } : {},
    });
  };
  let issued;

  await t.test("upload stores and anchors the exact original bytes", async () => {
    const response = await upload(original);
    assert.equal(response.status, 201);
    issued = (await response.json()).data;
    assert.equal(issued.artifactType, "uploaded");
    assert.equal(issued.fileCid, await storage.computeCid(original));
    assert.equal(issued.pdfHash, keccak256Bytes(original));
    assert.equal((await db.certificates.get(issued.certificateId)).pdf_hash, issued.pdfHash);
    assert.deepEqual(await fs.readFile(storage.getPath(issued.fileCid)), original);
    assert.equal(issue.mock.calls[0].arguments[3], issued.fileCid);
  });

  await t.test("public verification detail links to the on-chain file, then serves original PDF inline", async () => {
    t.mock.method(blockchain, "getCertificate", async () => ({ certificateId: issued.certificateId, fileCid: issued.fileCid }));
    t.mock.method(blockchain, "verifyCertificate", async () => true);
    const verification = await fetch(`${base}/api/verify-certificate/${issued.certificateId}`);
    assert.equal((await verification.json()).data.valid, true);
    const detail = await (await fetch(`${base}/api/certificate/${issued.certificateId}`)).json();
    assert.equal(detail.data.fileUrl, issued.fileUrl);
    const response = await fetch(base + detail.data.fileUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^application\/pdf/);
    assert.match(response.headers.get("content-disposition"), /^inline; filename=".*\.pdf"$/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
  });

  await t.test("PDF preview supports range and HEAD requests", async () => {
    const response = await fetch(base + issued.fileUrl, { headers: { Range: "bytes=0-7" } });
    assert.equal(response.status, 206);
    assert.match(response.headers.get("content-range"), /^bytes 0-7\//);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), original.subarray(0, 8));
    const head = await fetch(base + issued.fileUrl, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.match(head.headers.get("content-type"), /^application\/pdf/);
    assert.equal(head.headers.get("content-length"), String(original.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  });

  await t.test("explicit downloads retain original bytes and a .pdf filename", async () => {
    for (const response of [await fetch(base + issued.fileUrl + "?download=1"), await download(issued.certificateId)]) {
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /^application\/pdf/);
      assert.match(response.headers.get("content-disposition"), /^attachment; filename=".*\.pdf"$/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
    }
  });

  await t.test("images, spoofed extensions, malformed and oversized PDFs never reach storage/chain", async () => {
    const beforeCalls = issue.mock.callCount();
    const beforeFiles = await fs.readdir(dir);
    for (const [bytes, name, type, status] of [
      [Buffer.from("PNG bytes"), "image.png", "image/png", 400],
      [Buffer.from("<html>not a PDF</html>"), "fake.pdf", "application/pdf", 400],
      [Buffer.from("%PDF-1.7\nnot a valid document"), "broken.pdf", "application/pdf", 400],
      [original, "real.pdf", "image/png", 400],
      [Buffer.alloc(0), "empty.pdf", "application/pdf", 400],
      [Buffer.alloc(MAX_PDF_BYTES + 1), "large.pdf", "application/pdf", 413],
    ]) {
      const response = await upload(bytes, name, type);
      assert.equal(response.status, status, name);
      assert.equal((await response.json()).success, false);
    }
    assert.equal(issue.mock.callCount(), beforeCalls);
    assert.deepEqual(await fs.readdir(dir), beforeFiles);
  });

  await t.test("valid PDF with generic MIME is accepted without rewriting", async () => {
    const response = await upload(original, "original.PDF", "application/octet-stream");
    assert.equal(response.status, 201);
    assert.equal((await response.json()).data.fileCid, issued.fileCid);
  });

  await t.test("legacy issuing endpoint also enforces PDF-only uploads", async () => {
    const good = await upload(original, "original.pdf", "application/pdf", true, true);
    assert.equal(good.status, 201);
    assert.equal((await good.json()).data.fileCid, issued.fileCid);
    const bad = await upload(Buffer.from("image"), "image.png", "image/png", true, true);
    assert.equal(bad.status, 400);
  });

  await t.test("upload still requires authentication", async () => {
    const beforeCalls = issue.mock.callCount();
    const response = await upload(original, "original.pdf", "application/pdf", false);
    assert.equal(response.status, 401);
    assert.equal(issue.mock.callCount(), beforeCalls);
  });

  await t.test("shared service rejects invalid PDFs even without HTTP middleware", async () => {
    await assert.rejects(service.issueToInstitution({ fileBuffer: Buffer.from("not a PDF"), fileName: "fake.pdf", mimeType: "application/pdf" }), { code: "INVALID_PDF" });
    await assert.rejects(validateCertificatePdf(Buffer.alloc(MAX_PDF_BYTES + 1), "big.pdf", "application/pdf"), { code: "PDF_TOO_LARGE" });
  });

  await t.test("generated certificates still render successfully and stay private", async () => {
    const generated = await service.issueGenerated({ institutionId: 1, recipientName: "Generated Test", template: "classic" });
    assert.equal(generated.fileUrl, null);
    assert.equal(generated.fileAccess, "private");
    assert.notEqual(generated.fileCid, issued.fileCid);
    const response = await fetch(`${base}/api/files/${generated.fileCid}`);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "FILE_PRIVATE");
    const attachment = await download(generated.certificateId);
    assert.equal(attachment.status, 200);
    assert.match(attachment.headers.get("content-disposition"), /^attachment;.*\.pdf"$/);
    assert.equal(keccak256Bytes(Buffer.from(await attachment.arrayBuffer())), generated.pdfHash);
    assert.equal((await download(generated.certificateId, null)).status, 401);
    assert.equal((await download(generated.certificateId, outsiderToken)).status, 403);
  });

  await t.test("legacy non-PDF artifacts are not mislabeled or rendered as PDFs", async () => {
    const legacy = await storage.add(Buffer.from("legacy image bytes"), "legacy.png");
    const response = await fetch(`${base}/api/files/${legacy.cid}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/octet-stream");
    assert.match(response.headers.get("content-disposition"), /^attachment;/);
    assert.doesNotMatch(response.headers.get("content-disposition"), /\.pdf/);
  });

  await t.test("invalid CID and missing files return errors, not fallback HTML or redirects", async () => {
    const invalid = await fetch(`${base}/api/files/not-a-cid`);
    assert.equal(invalid.status, 400);
    const missing = await storage.computeCid(Buffer.from("missing-file"));
    const response = await fetch(`${base}/api/files/${missing}`, { redirect: "manual" });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "FILE_NOT_FOUND");
    await assert.rejects(sendCertificateFile({}, { file_cid: missing }), { code: "FILE_NOT_FOUND" });
  });
});
