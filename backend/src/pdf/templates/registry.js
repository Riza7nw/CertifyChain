// src/pdf/templates/registry.js
// Registry template PDF (Fase A: definisi di kode). Fase C: branding per-institusi via DB.
const classic = require("./classic");

const registry = {
  classic,
};

const DEFAULT_TEMPLATE = "classic";

function getTemplate(key) {
  return registry[key] || registry[DEFAULT_TEMPLATE];
}

function listTemplates() {
  return Object.entries(registry).map(([key, t]) => ({ key, name: t.name }));
}

module.exports = { registry, getTemplate, listTemplates, DEFAULT_TEMPLATE };
