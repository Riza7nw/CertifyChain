const API_BASE = import.meta.env?.VITE_API_BASE_URL || "/api";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

// Backend-local file links must follow the API host when the UI is on Vercel.
// External IPFS gateway URLs already name their host and stay unchanged.
export function resolveFileUrl(fileUrl, apiBase = API_BASE) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  if (!fileUrl.startsWith("/api/")) return null;
  return `${apiBase.replace(/\/+$/, "")}/${fileUrl.slice(5)}`;
}

export function validatePdfSelection(file) {
  if (!file) return "File PDF sertifikat wajib diunggah.";
  if (!/\.pdf$/i.test(file.name) || !["", "application/pdf", "application/octet-stream"].includes(file.type)) {
    return "Pilih file PDF (.pdf), bukan gambar atau file lain.";
  }
  if (!file.size) return "File PDF kosong.";
  if (file.size > MAX_PDF_BYTES) return "Ukuran PDF maksimal 10 MB.";
  return null;
}

export async function validatePdfHeader(file) {
  const header = new TextDecoder().decode(await file.slice(0, 8).arrayBuffer());
  return /^%PDF-\d\.\d/.test(header) ? null : "Isi file bukan PDF yang valid. Pilih PDF asli.";
}
