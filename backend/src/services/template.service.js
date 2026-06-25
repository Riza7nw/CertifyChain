// src/services/template.service.js
// Sistem template PDF (Fase C1). Template = pilihan base renderer ('classic'/'modern')
// + branding (warna aksen). Base templates ada di kode; template ber-branding per-org
// disimpan di Postgres (certificate_templates). Org/template = identity store (Postgres-only).

const prisma = require("../db/prismaClient");

// Base templates bawaan (selalu tersedia, tanpa baris DB).
const BASE_TEMPLATES = [
  { id: "classic", key: "classic", name: "Classic", accent: "#5E4FDB", scope: "base" },
  { id: "modern", key: "modern", name: "Modern", accent: "#0F766E", scope: "base" },
];
const RENDERER_KEYS = ["classic", "modern"];
const DEFAULT_ACCENT = "#5E4FDB";

function rowToItem(r) {
  return { id: String(r.id), key: r.key, name: r.name, accent: r.accent, logoCid: r.logo_cid, scope: r.organization_id ? "org" : "global" };
}

// Daftar template untuk sebuah org: base + global DB + milik org.
async function listForOrg(orgId) {
  const rows = await prisma.certificate_templates.findMany({
    where: { active: true, OR: [{ organization_id: null }, { organization_id: orgId }] },
    orderBy: { id: "asc" },
  });
  return [...BASE_TEMPLATES, ...rows.map(rowToItem)];
}

// Resolusi sebuah ref ('classic'|'modern'|'<id>') -> { key, name, accent, logoCid }.
async function resolve(ref, orgId) {
  const base = BASE_TEMPLATES.find((b) => b.id === ref || b.key === ref);
  if (base) return { key: base.key, name: base.name, accent: base.accent, logoCid: null };

  const id = Number(ref);
  if (Number.isInteger(id)) {
    const row = await prisma.certificate_templates.findUnique({ where: { id } });
    if (row && (row.organization_id == null || row.organization_id === orgId)) {
      return { key: RENDERER_KEYS.includes(row.key) ? row.key : "classic", name: row.name, accent: row.accent || DEFAULT_ACCENT, logoCid: row.logo_cid };
    }
  }
  return { key: "classic", name: "Classic", accent: DEFAULT_ACCENT, logoCid: null };
}

async function create(orgId, { name, key, accent }) {
  return rowToItem(
    await prisma.certificate_templates.create({
      data: {
        organization_id: orgId,
        name: String(name || "").trim() || "Template",
        key: RENDERER_KEYS.includes(key) ? key : "classic",
        accent: accent || null,
      },
    })
  );
}

async function remove(orgId, id) {
  const row = await prisma.certificate_templates.findUnique({ where: { id: Number(id) } });
  if (!row || row.organization_id !== orgId) return false;
  await prisma.certificate_templates.delete({ where: { id: Number(id) } });
  return true;
}

module.exports = { listForOrg, resolve, create, remove, BASE_TEMPLATES, RENDERER_KEYS };
