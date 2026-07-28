// Capa de persistencia localStorage para documentos creados por el usuario.
// NOTA: Artículos maestro vienen de Algolia. Stock/kardex se maneja en firestoreStock.js.

const LS = { docs: "gmp_docs_v1" };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ---- Documentos ----
export function getDocuments(docKey) {
  return load(LS.docs, {})[docKey] || [];
}

export function getDocumentById(docKey, id) {
  return getDocuments(docKey).find((d) => d.id === id) || null;
}

export function saveDocument(docKey, doc) {
  const all = load(LS.docs, {});
  const stored = all[docKey] ? [...all[docKey]] : [];
  const i = stored.findIndex((d) => d.id === doc.id);
  if (i === -1) stored.push(doc); else stored[i] = doc;
  all[docKey] = stored;
  save(LS.docs, all);
}

export function deleteDocument(docKey, id) {
  const all = load(LS.docs, {});
  all[docKey] = (all[docKey] || []).filter((d) => d.id !== id);
  save(LS.docs, all);
}

export function setEstadoFactura(docKey, id, estado) {
  const all = load(LS.docs, {});
  const stored = all[docKey] ? [...all[docKey]] : [];
  const i = stored.findIndex((d) => d.id === id);
  if (i === -1) return;
  stored[i] = { ...stored[i], estadoFactura: estado };
  all[docKey] = stored;
  save(LS.docs, all);
}

export function nextDocId(docKey) {
  const docs = getDocuments(docKey);
  const prefix = docKey.replace(/-/g, "").slice(0, 4);
  let max = 0;
  docs.forEach((d) => {
    const m = String(d.id).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${prefix}${max + 1}`;
}

export function saveCuenta(cuenta) {
  saveDocument("cuentasPorCobrar", cuenta);
}
export function getCuentas() {
  return getDocuments("cuentasPorCobrar");
}

export function markRecepcionFacturada(otId) {
  const ot = getDocumentById("vs-orden", otId);
  if (!ot) return;
  saveDocument("vs-orden", { ...ot, facturado: true });
}

// Stubs para compatibilidad (artículos vía Algolia, stock vía Firestore)
export function getKardex() { return []; }
export function getOTFacturaItems() { return []; }
export function saveVale() {}
export function getArticulos() { return []; }
export function articuloEstado() { return "Disponible"; }
