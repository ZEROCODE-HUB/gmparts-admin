// Fase D3 — Operaciones de stock sobre Firestore + búsqueda Algolia (§0, §3.4 de BACKEND_SPEC.md).
// Reemplaza la capa localStorage de db.js para stock de artículos y escritura de documentos.

import { db, app } from "../lib/firebase";
import { searchArticlesIndex } from "../lib/algolia";
import { collection, doc, getDocs, getDoc, getDocFromServer, setDoc, addDoc, deleteDoc, runTransaction, increment, query, where } from "firebase/firestore";
import { mapDocKeyToCollection } from "./firestoreDb";

const OPERATION = {
  "va-factura": "Venta", "va-boleta": "Venta", "vs-factura": "Venta", "vs-boleta": "Venta",
  "al-notaventa": "Venta",
  "c-factura": "Compra", "c-boleta": "Compra", "c-notas": "Compra", "c-guia": "Compra", "c-orden": "Compra",
};

const DOC_TYPE = {
  "va-factura": "Factura", "va-boleta": "Boleta", "va-cotizacion": "Cotizacion",
  "va-guia": "Guia", "va-notacredito": "NotaCredito",
  "vs-factura": "Factura", "vs-boleta": "Boleta", "vs-cotizacion": "Cotizacion",
  "vs-orden": "OrdenTrabajo", "vs-notas": "Nota de venta",
  "c-factura": "Factura", "c-boleta": "Boleta", "c-notas": "NotaPedido",
  "c-guia": "Guia", "c-orden": "OrdenPago",
  "al-notaventa": "Nota de venta",
};

const TIPO_OPERACION = {
  "va-factura": "venta", "va-boleta": "venta", "va-cotizacion": "venta",
  "va-guia": "venta", "va-notacredito": "venta",
  "c-factura": "compra", "c-boleta": "compra", "c-notas": "compra",
  "c-guia": "compra", "c-orden": "compra",
  "al-notaventa": "venta",
};

// ── Búsqueda de artículos vía Algolia ──
export async function searchArticles(term, opts = {}) {
  if (!term || String(term).length < 2) return [];
  const hits = await searchArticlesIndex(term, { hitsPerPage: opts.limit || 20 });
  if (hits.length > 0) {
    console.log("[D3-ALGOLIA] sample hit keys:", Object.keys(hits[0]), "Codigo:", hits[0].Codigo, "codigo:", hits[0].codigo);
  }
  return hits.map((h) => ({
    id: h.objectID,
    Codigo: h.Codigo || h.codigo || "",
    Nombre_name: h.Nombre_name || h.nombre_name || h.descripcion || "",
    Stock: h.Stock ?? h.stock ?? 0,
    Precio_Venta_Sale_price: h.Precio_Venta_Sale_price ?? h.precio_venta_sale_price ?? 0,
    Precio_compra_Purchase_price: h.Precio_compra_Purchase_price ?? h.precio_compra_purchase_price ?? 0,
    Utilidad_Profit_Percentage: h.Utilidad_Profit_Percentage ?? h.utilidad_profit_percentage ?? 0,
    Marca_brand: h.Marca_brand || h.marca_brand || "",
    Unidad_de_medida_Measurement_unit: h.Unidad_de_medida_Measurement_unit || h.unidad_de_medida_measurement_unit || "",
    Product_type: h.Product_type || h.product_type || "",
  }));
}

// ── Stock ──
// Actualiza el Stock de un artículo atómicamente.
// Si articleId se provee, accede directo por ID (sin query). Si no, busca por Codigo.
export async function updateArticleStockByCode(codigo, delta, articleId) {
  console.log("[D3-STOCK] updateArticleStockByCode ENTER", { codigo, delta, articleId });
  if ((!codigo && !articleId) || delta === 0) { console.log("[D3-STOCK] skip"); return; }
  let ref;
  if (articleId) {
    ref = doc(db, "Articles", articleId);
    const snap = await getDoc(ref);
    if (!snap.exists()) { console.log("[D3-STOCK] articleId not found in Firestore", { articleId }); return; }
  } else {
    const q = query(collection(db, "Articles"), where("Codigo", "==", codigo));
    const snap = await getDocs(q);
    if (snap.empty) { console.log("[D3-STOCK] no article found by Codigo", { codigo }); return; }
    ref = doc(db, "Articles", snap.docs[0].id);
  }
  await runTransaction(db, async (tx) => {
    const snapTx = await tx.get(ref);
    if (!snapTx.exists()) { console.log("[D3-STOCK] TX: doc does not exist"); return; }
    const current = snapTx.data()?.Stock ?? 0;
    const nuevo = Math.max(0, current + delta);
    console.log("[D3-STOCK] TX: updating stock", { codigo, articleId, currentStock: current, delta, newStock: nuevo });
    tx.update(ref, { Stock: nuevo });
  });
  console.log("[D3-STOCK] transaction resolved", { codigo, articleId });
}

// Aplica efectos de stock a una lista de ítems de un documento.
// items: [{ codigo, descripcion, cant, tipo }]
// operation: "Venta" (resta stock) | "Compra" (suma stock)
export async function applyStockToItems(items, operation, actualizarStock = true) {
  console.log("[D3-STOCK] applyStockToItems ENTER", { itemsCount: items?.length, operation, actualizarStock });
  if (!actualizarStock) { console.log("[D3-STOCK] applyStockToItems: skipped (actualizarStock=false)"); return; }
  const isCompra = operation === "Compra";
  for (const it of items || []) {
    if (it.tipo && it.tipo !== "repuesto") { console.log("[D3-STOCK] skip item (tipo not repuesto)", { codigo: it.codigo, tipo: it.tipo }); continue; }
    const key = it.codigo || it.descripcion;
    if (!key) { console.log("[D3-STOCK] skip item (no key)"); continue; }
    const cant = Number(it.cant) || 0;
    if (cant <= 0) { console.log("[D3-STOCK] skip item (cant <= 0)", { key, cant }); continue; }
    const delta = isCompra ? cant : -cant;
    console.log("[D3-STOCK] processing item", { key, codigo: it.codigo, articleId: it.articleId, descripcion: it.descripcion, cant, delta, operation });
    await updateArticleStockByCode(key, delta, it.articleId);
    console.log("[D3-STOCK] item processed OK", { key });
  }
  console.log("[D3-STOCK] applyStockToItems DONE");
}

// ── Helpers ──
async function getArticleRefByCode(codigo, articleId) {
  if (articleId) return doc(db, "Articles", articleId);
  const q = query(collection(db, "Articles"), where("Codigo", "==", codigo));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return doc(db, "Articles", snap.docs[0].id);
}

// ── Kardex_element ──
// Crea entradas de Kardex_element por cada ítem de repuesto en el documento.
// §1.6 BACKEND_SPEC.md — colección `Kardex_element`.
async function createKardexEntries(doc, op, docId) {
  if (!doc.items || !op) return;
  const isCompra = op === "Compra";
  for (const it of doc.items) {
    if (it.tipo && it.tipo !== "repuesto") continue;
    const codigo = it.codigo || it.descripcion;
    if (!codigo) continue;
    const cant = Number(it.cant) || 0;
    if (cant <= 0) continue;
    const artRef = await getArticleRefByCode(codigo, it.articleId);
    await addDoc(collection(db, "Kardex_element"), {
      Article: artRef,
      Document_Type: isCompra ? "Ingreso" : "Salida",
      Date: doc.fecha || new Date().toISOString().split("T")[0],
      Client: isCompra ? "" : (doc.cliente || ""),
      Provider: isCompra ? (doc.proveedor || "") : "",
      Quantity: isCompra ? cant : -cant,
      Description: isCompra ? "Compra" : "Venta",
      Code_Id: codigo,
      Unit: it.unidad || "Unidad",
      PricePerUnit: isCompra ? (it.precioCompra || 0) : (it.pu || 0),
      Total_Price: isCompra ? (cant * (it.precioCompra || 0)) : (cant * (it.pu || 0)),
      Warehouse: doc.almacen || "",
      OEM: it.oem || "",
      type: isCompra ? "Compra" : "Venta",
      Document_Number: doc.numero || docId || 0,
    });
  }
}

// Elimina entradas de Kardex_element asociadas a un documento (usando el docId como referencia).
// Se usa en reversa junto con firestoreDeleteDocument.
async function deleteKardexEntries(docId) {
  if (!docId) return;
  // Buscar por Document_Number = docId (asumiendo que se guardó el id del documento)
  // Como alternativa más robusta: eliminamos todas las entradas cuyo Document_Number sea el id
  const q = query(collection(db, "Kardex_element"), where("Document_Number", "==", docId));
  const snap = await getDocs(q);
  const deletes = snap.docs.map((d) => deleteDoc(doc(db, "Kardex_element", d.id)));
  await Promise.all(deletes);
}

// ── Almacen_movement ──
// Crea entradas de Almacen_movement por cada ítem de repuesto.
// §1.19 BACKEND_SPEC.md — colección `Almacen_movement`.
async function createAlmacenMovements(doc, op) {
  if (!doc.items || !op) return;
  const isCompra = op === "Compra";
  for (const it of doc.items) {
    if (it.tipo && it.tipo !== "repuesto") continue;
    const codigo = it.codigo || it.descripcion;
    if (!codigo) continue;
    const cant = Number(it.cant) || 0;
    if (cant <= 0) continue;
    const artRef = await getArticleRefByCode(codigo, it.articleId);
    await addDoc(collection(db, "Almacen_movement"), {
      Article: artRef,
      Quantity: isCompra ? cant : -cant,
      Total_Price: isCompra ? (cant * (it.precioCompra || 0)) : (cant * (it.pu || 0)),
      Movement_type: isCompra ? "Ingreso" : "Salida",
    });
  }
}

async function deleteAlmacenMovements(docId) {
  if (!docId) return;
}

// ── Documentos ──
export async function firestoreSaveDocument(docKey, payload) {
  console.log("[D4-DOC] ENTER firestoreSaveDocument", { docKey, projectId: app?.options?.projectId, isEdit: !!payload.id });

  const op = OPERATION[docKey];
  const isCompra = op === "Compra";
  const actualizarStock = payload.actualizarStock !== false;

  const colName = mapDocKeyToCollection(docKey);

  // Aplanar repuestos de OT
  let itemsToProcess = payload.items;
  if (!itemsToProcess && payload.diagnosticos) {
    itemsToProcess = payload.diagnosticos.flatMap((d) => (d.repuestos || []).map((r) => ({
      ...r, cant: r.cantidad, articleId: r.articleId, codigo: r.codigo, tipo: "repuesto",
    })));
    console.log("[D4-DOC] flattened OT repuestos", { count: itemsToProcess.length });
  }

  // ── Reconciliación de stock en edición (Sección 3.4) ──
  if (payload.id && actualizarStock && op) {
    console.log("[D4-DOC] edit mode: reversing old stock effects");
    const oldRef = doc(db, colName, payload.id);
    const oldSnap = await getDoc(oldRef);
    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      const oldItems = oldData.items || [];
      // Reverse: opposite delta of old items
      for (const it of oldItems) {
        if (it.tipo && it.tipo !== "repuesto") continue;
        const key = it.codigo || it.descripcion;
        if (!key) continue;
        const cant = Number(it.cant) || 0;
        if (cant <= 0) continue;
        const delta = isCompra ? -cant : cant; // reverse
        await updateArticleStockByCode(key, delta, it.articleId);
      }
      // Delete old Kardex/Almacen entries
      await deleteKardexEntries(payload.id);
      await deleteAlmacenMovements(payload.id);
      console.log("[D4-DOC] old stock reversed, old entries deleted");
    }
  }

  // ── Generar correlativo si no tiene número ──
  if (!payload.numero) {
    const nextNum = await getNextCorrelative(docKey, payload.serie || "");
    payload.numero = String(nextNum).padStart(6, "0");
    console.log("[D4-DOC] generated correlativo", { nextNum, numero: payload.numero });
  }

  // ── Aplicar stock NUEVO ──
  try {
    await applyStockToItems(itemsToProcess, op, actualizarStock);
    console.log("[D4-DOC] applyStockToItems OK");
  } catch (stockErr) {
    console.error("[D4-DOC] applyStockToItems ERROR:", stockErr);
    throw stockErr;
  }

  // ── Guardar documento ──
  const clean = { ...payload };
  delete clean.id;
  clean.tipofactura = DOC_TYPE[docKey] || docKey;
  clean.TipoOperacion = TIPO_OPERACION[docKey] || "";

  // Normalizar nombres de campo al esquema legacy (§1.24 BACKEND_SPEC.md)
  // La colección Facturas usa razonSNombre, nserie, FPago, Estado, Fecha, NumCotizacion
  if (colName === "Facturas") {
    if (payload.cliente) { clean.razonSNombre = payload.cliente; delete clean.cliente; }
    if (payload.serie)   { clean.nserie = payload.serie; delete clean.serie; }
    if (payload.formaPago) { clean.FPago = payload.formaPago; delete clean.formaPago; }
    if (payload.estado)  { clean.Estado = payload.estado; delete clean.estado; }
    if (payload.fecha)   { clean.Fecha = payload.fecha; delete clean.fecha; }
    if (payload.numCotizacion) { clean.NumCotizacion = payload.numCotizacion; delete clean.numCotizacion; }
  }
  let docId;
  try {
    if (payload.id) {
      const ref = doc(db, colName, payload.id);
      console.log("[D4-DOC] calling setDoc on", { colName, refPath: ref.path });
      await setDoc(ref, clean, { merge: true });
      docId = payload.id;
    } else {
      const ref = await addDoc(collection(db, colName), clean);
      docId = ref.id;
      console.log("[D4-DOC] addDoc returned ref.id:", docId);
    }
    console.log("[D4-DOC] write resolved");
  } catch (writeErr) {
    console.error("[D4-DOC] FIRESTORE WRITE ERROR:", writeErr);
    throw writeErr;
  }

  // ── Verificación ──
  try {
    const verifyRef = doc(db, colName, docId);
    const verifySnap = await getDocFromServer(verifyRef);
    console.log("[D4-DOC] getDocFromServer verification — exists:", verifySnap.exists());
  } catch (verifyErr) {
    console.warn("[D4-DOC] verification FAILED:", verifyErr.message);
  }

  // ── Kardex_element y Almacen_movement ──
  if (actualizarStock && op) {
    await createKardexEntries(payload, op, docId);
    await createAlmacenMovements(payload, op);
  }

  // ── Cuenta por Crédito ──
  if (payload.formaPago === "Credito") {
    await createOrUpdateCreditAccount(payload, docId, docKey);
    console.log("[D4-DOC] credit account created/updated");
  }

  // ── Recepciones + subcolección diagnosticos ──
  if (docKey === "vs-orden" && payload.diagnosticos && payload.diagnosticos.length > 0) {
    const recepcionRef = doc(db, colName, docId);
    for (const d of payload.diagnosticos) {
      const diagId = d.id || `d${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const diagData = {
        Nombre_falla: d.nombreFalla || "",
        Solucion: d.solucion || "",
        Horas_trabajo: d.horasTrabajo || 0,
        Mano_de_obra: d.manoDeObra || 0,
        Repuestos: (d.repuestos || []).map((r) => ({
          descripcion: r.descripcion || "",
          codigo: r.codigo || "",
          cantidad: r.cantidad || 0,
          articleId: r.articleId || "",
        })),
        fecha: doc.fecha || payload.fecha || new Date().toISOString().split("T")[0],
      };
      await setDoc(doc(db, colName, docId, "diagnosticos", diagId), diagData, { merge: true });
    }
    console.log("[D4-DOC] diagnosticos subcollection written", { count: payload.diagnosticos.length });
  }

  console.log("[D4-DOC] RETURN docId:", docId);
  return docId;
}

// Reversa el efecto de stock de un documento existente y luego lo elimina.
export async function firestoreDeleteDocument(docKey, id) {
  const op = OPERATION[docKey];
  if (!op || !id) return;

  const colName = mapDocKeyToCollection(docKey);
  const ref = doc(db, colName, id);
  let docData;
  await runTransaction(db, async (tx) => {
    const snapTx = await tx.get(ref);
    if (!snapTx.exists()) return;
    docData = snapTx.data();
  });
  if (!docData) return;

  const isCompra = op === "Compra";
  const actualizarStock = docData.actualizarStock !== false;
  for (const it of docData.items || []) {
    if (it.tipo && it.tipo !== "repuesto") continue;
    const key = it.codigo || it.descripcion;
    if (!key) continue;
    const cant = Number(it.cant) || 0;
    if (cant <= 0) continue;
    const delta = isCompra ? -cant : cant;
    await updateArticleStockByCode(key, delta, it.articleId);
  }

  await deleteKardexEntries(id);
  await deleteAlmacenMovements(id);

  // Eliminar cuenta por cobrar si existe y no está pagada
  const cuentaRef = doc(db, "cuentasPorCobrar", id);
  const cuentaSnap = await getDoc(cuentaRef);
  if (cuentaSnap.exists() && cuentaSnap.data().estado !== "Pagado") {
    await deleteDoc(cuentaRef);
  }

  await deleteDoc(ref);
}

// ── LastCode (correlativos atómicos) ──
// Obtiene el siguiente número correlativo para un docKey+serie usando increment() atómico.
// Almacena en colección "LastCode" con doc ID = docKey.
export async function getNextCorrelative(docKey, serie) {
  const ref = doc(db, "LastCode", docKey);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().numero || 0) : 0;
    const next = current + 1;
    tx.set(ref, { numero: increment(1), serie: serie || "", updatedAt: new Date().toISOString() }, { merge: true });
    return next;
  });
}

// ── Cuentas por Cobrar/Pagar ──
// Crea o actualiza un registro en cuentasPorCobrar cuando formaPago === "Credito".
export async function createOrUpdateCreditAccount(doc, docId, docKey) {
  if (!docId) return;
  const esCredito = (doc.formaPago || "").toLowerCase() === "credito";
  const cuentaRef = doc(db, "cuentasPorCobrar", docId);
  if (esCredito) {
    const op = OPERATION[docKey];
    const total = Number(doc.total) || 0;
    await setDoc(cuentaRef, {
      tipoDocumento: docKey,
      numeroCotizacion: `${doc.serie || ""}-${doc.numero || docId}`,
      clientenombre: doc.cliente || doc.proveedor || "",
      montoTotal: total,
      pagoTotalActual: 0,
      saldoPendiente: total,
      estado: "Pendiente",
      tipoCuenta: op === "Compra" ? "Pagar" : "Cobrar",
      fecha: doc.fecha || new Date().toISOString().split("T")[0],
      tipofactura: "cuentasPorCobrar",
      createdAt: new Date().toISOString(),
    }, { merge: true });
    // Subcolección pagos_CporCobrar (inicialmente vacía — se agregan desde CuentasCobrar.jsx)
  } else {
    // Si no es crédito, eliminar la cuenta si existe (salvo que ya esté Pagada)
    try {
      const snap = await getDoc(cuentaRef);
      if (snap.exists() && snap.data().estado !== "Pagado") {
        await deleteDoc(cuentaRef);
      }
    } catch { /* ignore */ }
  }
}
