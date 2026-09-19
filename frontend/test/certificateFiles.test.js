import test from "node:test";
import assert from "node:assert/strict";
import { resolveFileUrl, validatePdfSelection, validatePdfHeader } from "../src/utils/certificateFiles.js";

test("local file URLs follow the configured backend, including separate deployments", () => {
  const path = "/api/files/bafkrei-example";
  assert.equal(resolveFileUrl(path, "/api"), path);
  assert.equal(resolveFileUrl(path, "https://api.example.test/api/"), "https://api.example.test/api/files/bafkrei-example");
  assert.equal(resolveFileUrl(path, "https://api.example.test/service/api"), "https://api.example.test/service/api/files/bafkrei-example");
  assert.equal(resolveFileUrl("https://ipfs.example.test/ipfs/cid", "/api"), "https://ipfs.example.test/ipfs/cid");
  for (const value of [null, "", "javascript:alert(1)", "//other.test/file", "/unrelated"]) {
    assert.equal(resolveFileUrl(value), null);
  }
});

test("PDF selection requires .pdf, acceptable MIME, nonempty content and at most 10 MB", () => {
  const file = { name: "certificate.PDF", type: "application/pdf", size: 1024 };
  assert.equal(validatePdfSelection(file), null);
  assert.equal(validatePdfSelection({ ...file, type: "" }), null);
  assert.equal(validatePdfSelection({ ...file, type: "application/octet-stream" }), null);
  assert.equal(validatePdfSelection({ ...file, size: 10 * 1024 * 1024 }), null);
  for (const invalid of [null, { ...file, name: "image.png" }, { ...file, type: "image/png" }, { ...file, size: 0 }, { ...file, size: 10 * 1024 * 1024 + 1 }]) {
    assert.equal(typeof validatePdfSelection(invalid), "string");
  }
});

test("frontend checks PDF magic bytes instead of trusting the file extension", async () => {
  assert.equal(await validatePdfHeader(new Blob(["%PDF-1.7\ncontent"])), null);
  assert.equal(typeof await validatePdfHeader(new Blob(["<html>not a PDF</html>"])), "string");
});
