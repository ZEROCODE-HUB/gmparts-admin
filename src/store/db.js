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

// Movidos a Firestore (store/firestoreStock.js), ya no viven aquí:
//   getOTFacturaItems   → ítems de factura a partir de los diagnósticos de la recepción
//   markRecepcionFacturada → marcarRecepcionFacturada, escribe en `recepciones`
//   saveCuenta / getCuentas → cuentasPorCobrar + subcolección pagos_CporCobrar
// Eran stubs que devolvían [] o escribían en localStorage, y hacían que el flujo de
// facturación de órdenes de trabajo y el registro de pagos no llegaran nunca a la base.

// Stubs restantes para compatibilidad (artículos vía Algolia, stock vía Firestore)
export function getKardex() { return []; }
export function saveVale() {}
export function getArticulos() { return []; }
export function articuloEstado() { return "Disponible"; }
