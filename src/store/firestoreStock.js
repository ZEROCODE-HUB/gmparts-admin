// Fase D3 — Operaciones de stock sobre Firestore + búsqueda Algolia (§0, §3.4 de BACKEND_SPEC.md).
// Reemplaza la capa localStorage de db.js para stock de artículos y escritura de documentos.

import { db, app } from "../lib/firebase";
import { searchArticlesIndex } from "../lib/algolia";
import { collection, doc, getDocs, getDoc, getDocFromServer, setDoc, addDoc, deleteDoc, runTransaction, increment, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { mapDocKeyToCollection } from "./firestoreDb";
// Faltaba este import y `getNextCorrelative` lanzaba «claveCorrelativo is not defined» en
// cuanto se intentaba guardar cualquier documento nuevo — cotización de servicio, orden,
// factura: todo. El build no se queja de una variable global no declarada, así que el fallo
// solo aparecía al pulsar «Generar documento» en producción.
import { claveCorrelativo } from "../lib/series";

// Normaliza una forma de pago para compararla sin depender de tildes ni mayúsculas.
// En Firestore conviven "Contado", "CONTADO" y "Crédito" (unos los escribe la app
// Flutter y otros el admin): comparar el literal exacto hacía que la rama de crédito
// no se ejecutara nunca y ninguna venta a crédito generara su cuenta por cobrar.
export function normalizaFormaPago(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function esCredito(valor) {
  return normalizaFormaPago(valor) === "credito";
}

// Traduce la Orden de Trabajo del admin al esquema real de `recepciones`, que es el que
// lee la app móvil (BACKEND_SPEC.md §1.11). Sin esto, el admin escribía `cliente`/`estado`
// donde la app espera `nombre_cliente`/`status` y la orden quedaba invisible.
/**
 * Convierte a Timestamp lo que llegue: una fecha «YYYY-MM-DD» del formulario, un Date, o
 * nada. Firestore y la app móvil trabajan con Timestamp; el panel maneja cadenas.
 */
function fechaComoTimestamp(valor) {
  if (!valor) return Timestamp.fromDate(new Date());
  if (valor instanceof Date) return Timestamp.fromDate(valor);
  if (typeof valor?.toDate === "function") return valor;   // ya es Timestamp
  const texto = String(valor);
  const d = new Date(texto.length === 10 ? texto + "T00:00:00" : texto);
  return isNaN(d.getTime()) ? Timestamp.fromDate(new Date()) : Timestamp.fromDate(d);
}

function toRecepcionSchema(payload) {
  const docNum = String(payload.clienteDoc || "").replace(/\D/g, "");
  const esRuc = docNum.length === 11;
  const out = {
    numeroorden: Number(payload.numeroorden) || payload.numeroorden || 0,
    nombre_cliente: payload.cliente || payload.nombre_cliente || "",
    placa: payload.placa || "",
    marca: payload.marca || "",
    modelo: payload.modelo || "",
    km_ingreso: String(payload.km_ingreso ?? ""),
    tecnico_servicio: payload.tecnico_servicio || "",
    tipo_servicio: payload.tipoServicio || payload.tipo_servicio || "",
    motivo_ingreso: payload.motivo_ingreso || "",
    Observaciones_adicionales: payload.observaciones || payload.Observaciones_adicionales || "",
    status: payload.estado || payload.status || "Recepción",
    tipo_documento: esRuc ? "RUC" : "DNI",
    tipo_persona: esRuc ? "Jurídica" : "Natural",
  };
  // La referencia al técnico se conserva tal cual. `toRecepcionSchema` construye una lista
  // blanca de campos y descartaba todo lo demás, así que `tecnicoservicioRef` se calculaba
  // en el editor y se perdía aquí sin dejar rastro: 0 de 48 recepciones lo tenían.
  if (payload.tecnicoservicioRef) out.tecnicoservicioRef = payload.tecnicoservicioRef;
  if (payload.codeCT) out.codeCT = payload.codeCT;

  if (docNum) out[esRuc ? "RUCempresa" : "DNI"] = docNum;
  if (esRuc && payload.cliente) out.Razon_social = payload.cliente;
  if (payload.telefono) out.telefono = payload.telefono;
  if (payload.correo || payload.Correo_electronico) {
    out.Correo_electronico = payload.correo || payload.Correo_electronico;
  }
  const fc = payload.fecha_creacion;
  if (fc) {
    const d = typeof fc === "string" ? new Date(fc.length === 10 ? fc + "T00:00:00" : fc) : fc;
    if (d instanceof Date && !isNaN(d.getTime())) out.fecha_creacion = Timestamp.fromDate(d);
  }
  return out;
}

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
// Se exporta para poder construir escrituras por lotes desde las pantallas: hace falta
// tener la referencia ANTES de abrir el lote.
export async function getArticleRefByCode(codigo, articleId) {
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
async function createAlmacenMovements(documento, op, docId) {
  if (!documento.items || !op) return;
  const isCompra = op === "Compra";
  for (const it of documento.items) {
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
      // Vínculo con el documento que originó el movimiento: sin él no se podían
      // borrar al anular o editar, y el kárdex acumulaba movimientos huérfanos.
      Document_Id: docId || "",
    });
  }
}

// Borra los movimientos de almacén generados por un documento. Antes era un cuerpo
// vacío: el stock se revertía pero los movimientos quedaban para siempre.
async function deleteAlmacenMovements(docId) {
  if (!docId) return;
  const q = query(collection(db, "Almacen_movement"), where("Document_Id", "==", docId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "Almacen_movement", d.id))));
}

// ── Orden de Trabajo → ítems de factura ──
// Convierte los diagnósticos de una recepción en las líneas del documento de venta:
// una línea de mano de obra por diagnóstico y una línea por repuesto.
//
// Acepta las dos formas en que existen los diagnósticos: el array embebido que escribe
// el admin (camelCase) y la subcolección `recepciones/{id}/diagnosticos` que escribe la
// app Flutter (PascalCase con guiones bajos). Si no vienen embebidos, los lee de la
// subcolección — que es el caso normal para una orden creada en el taller.
/**
 * Precio de venta de un artículo, por id o por código.
 *
 * Hace falta porque hay repuestos guardados sin precio: hasta hoy ni el editor de la orden
 * ni la subcolección `diagnosticos` lo escribían, así que las 48 recepciones que ya existen
 * tienen sus repuestos a cero. Facturarlas tal cual significaría cobrar solo la mano de obra.
 * Al abrir la orden se rellena el hueco desde el maestro de artículos.
 */
export async function precioDeArticulo({ articleId, codigo }) {
  try {
    if (articleId) {
      const snap = await getDoc(doc(db, "Articles", articleId));
      if (snap.exists()) return Number(snap.data().Precio_Venta_Sale_price) || 0;
    }
    if (codigo) {
      const q = query(collection(db, "Articles"), where("Codigo", "==", codigo));
      const snap = await getDocs(q);
      if (!snap.empty) return Number(snap.docs[0].data().Precio_Venta_Sale_price) || 0;
    }
  } catch {
    /* sin conexión o sin permisos: se deja el precio como estaba */
  }
  return 0;
}

export async function getOTFacturaItems(ot) {
  if (!ot) return [];
  let diags = Array.isArray(ot.diagnosticos) ? ot.diagnosticos : null;

  if ((!diags || diags.length === 0) && ot.id) {
    try {
      const snap = await getDocs(collection(db, "recepciones", ot.id, "diagnosticos"));
      diags = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      diags = [];
    }
  }
  if (!diags || diags.length === 0) return [];

  const num = (v) => Number(v) || 0;
  const items = [];

  for (const d of diags) {
    const falla = d.nombreFalla ?? d.Nombre_falla ?? "";
    const solucion = d.solucion ?? d.Solucion ?? "";
    const horas = num(d.horasTrabajo ?? d.Horas_trabajo) || 1;
    const manoObra = num(d.manoDeObra ?? d.Mano_de_obra ?? d.precioservicio);

    if (manoObra > 0) {
      // `Mano_de_obra` es un IMPORTE en soles, no una tarifa por hora: así lo etiqueta el
      // editor de la orden («Mano de obra (S/)»), así lo escribe la app móvil y así se lo
      // enseña el micrositio al cliente, en una sola línea sin horas.
      //
      // Aquí se multiplicaba por las horas, y el resultado era que el cliente aprobaba una
      // cotización y recibía una factura por otra cantidad. Comprobado de punta a punta:
      // aprobó S/ 153.33 y la boleta salía por S/ 273.33, un 78 % más, porque la mano de
      // obra de S/ 120 se cobraba como 2 × 120. Las horas se conservan en la descripción,
      // que es información útil, pero no multiplican el importe.
      items.push({
        tipo: "mano_obra",
        codigo: "",
        descripcion: `Mano de obra${horas > 1 ? ` (${horas} h)` : ""}: ${falla || solucion || "Servicio"}`,
        cant: 1,
        pu: round2(manoObra),
        total: round2(manoObra),
        moneda: "PEN",
      });
    }

    for (const r of d.repuestos ?? d.Repuestos ?? []) {
      const cantidad = num(r.cantidad ?? r.cant) || 1;
      const precio = num(r.precio ?? r.pu ?? r.precioVenta);
      items.push({
        tipo: "repuesto",
        codigo: r.codigo ?? r.Codigo ?? "",
        articleId: r.articleId ?? "",
        descripcion: r.descripcion ?? r.nombre ?? r.Nombre ?? "",
        cant: cantidad,
        pu: precio,
        total: num(r.total) || round2(precio * cantidad),
        moneda: "PEN",
      });
    }
  }
  return items;
}

// Marca la recepción como facturada en Firestore. Antes esto se escribía en localStorage,
// así que el flag nunca llegaba ni a la lista de órdenes ni a la app móvil, y la misma
// orden podía facturarse una y otra vez.
export async function marcarRecepcionFacturada(recepcionId, datos = {}) {
  if (!recepcionId) return;
  await setDoc(
    doc(db, "recepciones", recepcionId),
    { facturado: true, fecha_facturacion: new Date().toISOString(), ...datos },
    { merge: true }
  );
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
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
  if (payload.id && actualizarStock && op && colName !== "recepciones") {
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
  // La Orden de Trabajo no es un comprobante: su identificador es `numeroorden`
  // dentro de `recepciones`, no un correlativo de serie fiscal.
  if (!payload.numero && colName !== "recepciones") {
    const { numero, clave } = await getNextCorrelative(docKey, payload.serie || "");
    payload.numero = String(numero).padStart(6, "0");
    // De qué contador salió. El backend lo comprueba antes de declarar: un número nacido
    // en pruebas no puede acabar presentado ante SUNAT como real.
    payload.correlativoDe = clave;
    console.log("[D4-DOC] generated correlativo", { numero: payload.numero, clave });
  }
  if (colName === "recepciones" && !payload.numeroorden) {
    payload.numeroorden = (await getNextCorrelative("vs-orden", "")).numero;
    console.log("[D4-DOC] generated numeroorden", { numeroorden: payload.numeroorden });
  }

  if (colName === "recepciones" && !payload.codeCT) {
    // Al EDITAR se conserva el código que ya tuviera el documento. El formulario de la orden
    // no arrastra `codeCT` en su estado, así que el payload llega siempre sin él: generarlo
    // sin mirar antes renumeraba la orden en cada guardado (se vio pasar de CT001-0000231 a
    // CT001-0000232 con solo volver a guardar). El código de un documento no cambia.
    let existente = "";
    if (payload.id) {
      try {
        const previo = await getDoc(doc(db, colName, payload.id));
        if (previo.exists()) existente = previo.data().codeCT || "";
      } catch (e) {
        console.warn("[D4-DOC] no se pudo leer el codeCT anterior", e);
      }
    }
    payload.codeCT = existente || (await siguienteCodeCT());
    console.log("[D4-DOC] codeCT", { codeCT: payload.codeCT, conservado: !!existente });
  }

  // ── Aplicar stock NUEVO ──
  //
  // Una Orden de Trabajo NO mueve inventario. Los repuestos salen del almacén cuando se
  // consumen —con el vale de insumos— o cuando se factura el servicio, y eso ya lo hace la
  // emisión del comprobante.
  //
  // Antes sí lo movía, y por partida doble: `OPERATION` no tiene entrada para «vs-orden»,
  // así que `op` llegaba indefinido, `isCompra` salía false y el descuento se aplicaba
  // igual. Peor todavía: la reconciliación de la edición está condicionada a `op`, que
  // también era falso, de modo que al reabrir y volver a guardar la misma orden el
  // descuento se repetía sin revertir el anterior. Cada guardado se comía una unidad.
  // Salió a la luz porque a un técnico se le denegaba la escritura en `Articles` al guardar
  // una orden — el permiso estaba bien; lo que sobraba era la escritura.
  const mueveInventario = colName !== "recepciones";

  if (mueveInventario) {
    try {
      await applyStockToItems(itemsToProcess, op, actualizarStock);
      console.log("[D4-DOC] applyStockToItems OK");
    } catch (stockErr) {
      console.error("[D4-DOC] applyStockToItems ERROR:", stockErr);
      throw stockErr;
    }
  } else {
    console.log("[D4-DOC] recepción: no se toca el stock (lo mueve la facturación)");
  }

  // ── Guardar documento ──
  let clean = { ...payload };
  delete clean.id;

  if (colName === "recepciones") {
    // La Orden de Trabajo se escribe con el esquema de `recepciones` (§1.11), no con el de
    // un comprobante: sin `tipofactura`/`TipoOperacion`, y sin `facturado` — ese flag lo
    // gobierna la emisión de la factura (marcarRecepcionFacturada), no el editor de la orden.
    clean = toRecepcionSchema(payload);
    if (payload.diagnosticos) clean.diagnosticos = payload.diagnosticos;
  } else {
    clean.tipofactura = DOC_TYPE[docKey] || docKey;
    clean.TipoOperacion = TIPO_OPERACION[docKey] || "";
  }

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
    await createAlmacenMovements(payload, op, docId);
  }

  // ── Cuenta por Cobrar/Pagar ──
  // Se llama SIEMPRE (no solo si es crédito): al pasar un documento de Crédito a Contado
  // hay que retirar la cuenta que se había generado. `esCredito` tolera "Crédito",
  // "CREDITO" y "credito" — antes se comparaba contra el literal "Credito" y, como la UI
  // guarda "Crédito" con tilde, la rama no se ejecutaba nunca.
  if (op) {
    await createOrUpdateCreditAccount(payload, docId, docKey);
    console.log("[D4-DOC] cuenta por crédito conciliada", { formaPago: payload.formaPago, esCredito: esCredito(payload.formaPago) });
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
        // El precio y el nombre viajan también a la subcolección. Sin ellos, el micrositio
        // —que lee de AQUÍ, no del campo array del documento— enseñaba al cliente
        // «Precio: S/ 0.00» y dejaba el repuesto fuera del total de la cotización.
        Repuestos: (d.repuestos || []).map((r) => {
          const cantidad = Number(r.cantidad) || 0;
          const precio = round2(Number(r.precio) || 0);
          return {
            descripcion: r.descripcion || "",
            nombre: r.nombre || r.descripcion || "",
            codigo: r.codigo || "",
            cantidad,
            precio,
            total: round2(Number(r.total) || precio * cantidad),
            articleId: r.articleId || "",
          };
        }),
        // Timestamp, no texto. La app móvil declara este campo como DateTime y lo convierte
        // con un cast estricto, así que un "2026-08-18" le revienta la lectura: en su consola
        // aparecía «Error serializing doc recepciones/…/diagnosticos/…» y el diagnóstico se
        // descartaba entero. Es decir, todo diagnóstico escrito desde el panel era invisible
        // para el técnico en el teléfono. Comprobado en la app real.
        fecha: fechaComoTimestamp(payload.fecha),
      };
      await setDoc(doc(db, colName, docId, "diagnosticos", diagId), diagData, { merge: true });
    }
    console.log("[D4-DOC] diagnosticos subcollection written", { count: payload.diagnosticos.length });
  }

  console.log("[D4-DOC] RETURN docId:", docId);
  return docId;
}

// Devuelve al stock lo que consumió un documento, SIN borrarlo.
// Se usa al anular: un comprobante declarado ante SUNAT se conserva (queda marcado como
// anulado y con su nota de crédito), pero la mercadería tiene que volver al inventario.
export async function revertirStockDeDocumento(docKey, id) {
  const op = OPERATION[docKey];
  if (!op || !id) return;

  const colName = mapDocKeyToCollection(docKey);
  const snap = await getDoc(doc(db, colName, id));
  if (!snap.exists()) return;

  const datos = snap.data();
  if (datos.stockRevertido === true) return;      // idempotente: anular dos veces no duplica
  if (datos.actualizarStock === false) return;

  const isCompra = op === "Compra";
  for (const it of datos.items || datos.Items || []) {
    if (it.tipo && it.tipo !== "repuesto") continue;
    const key = it.codigo || it.descripcion;
    if (!key) continue;
    const cant = Number(it.cant ?? it.cantidad) || 0;
    if (cant <= 0) continue;
    await updateArticleStockByCode(key, isCompra ? -cant : cant, it.articleId);
  }

  await deleteKardexEntries(id);
  await deleteAlmacenMovements(id);
  await setDoc(doc(db, colName, id), { stockRevertido: true }, { merge: true });
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
//
// La clave es la SERIE para los comprobantes fiscales y el docKey para los internos: ver
// `claveCorrelativo`. Antes se contaba siempre por docKey, lo que rompía la continuidad
// dentro de una serie en cuanto se usara más de una; y los documentos de prueba gastaban
// el mismo contador que los reales, de modo que al pasar a producción la numeración
// habría arrancado ya con huecos.
//
// Devuelve también la clave usada para dejarla escrita en el documento: es lo que permite
// al backend distinguir un número de prueba de uno real.
/**
 * Código de documento de una recepción: «CT001-0000226».
 *
 * Lo generaba SOLO la app móvil. Una orden creada desde el panel se guardaba sin `codeCT`,
 * y como la lista de Órdenes de Trabajo imprime ese campo en la columna «Documento», la
 * orden aparecía con el hueco en blanco. Comprobado sobre la base: de 49 recepciones, las
 * 48 de la app tienen código y la única sin él es la creada desde el panel.
 *
 * El contador se siembra la primera vez con el mayor código que ya exista, para no repetir
 * ninguno de los que lleva puestos la app móvil. A partir de ahí es una transacción atómica,
 * igual que el resto de correlativos.
 */
async function siguienteCodeCT() {
  const ref = doc(db, "LastCode", "codeCT");

  const actual = await getDoc(ref);
  if (!actual.exists()) {
    let ultimo = 0;
    try {
      const masAlto = await getDocs(
        query(collection(db, "recepciones"), orderBy("codeCT", "desc"), limit(1))
      );
      if (!masAlto.empty) {
        const partes = String(masAlto.docs[0].data().codeCT || "").split("-");
        ultimo = Number(partes[1]) || 0;
      }
    } catch (e) {
      console.warn("siguienteCodeCT: no se pudo leer el último código, se arranca de 0", e);
    }
    await setDoc(ref, { numero: ultimo, serie: "CT001", updatedAt: new Date().toISOString() }, { merge: true });
  }

  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const siguiente = (snap.exists() ? (snap.data().numero || 0) : 0) + 1;
    tx.set(ref, { numero: increment(1), serie: "CT001", updatedAt: new Date().toISOString() }, { merge: true });
    return siguiente;
  });

  return `CT001-${String(numero).padStart(7, "0")}`;
}

export async function getNextCorrelative(docKey, serie) {
  const clave = claveCorrelativo(docKey, serie);
  const ref = doc(db, "LastCode", clave);
  const numero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().numero || 0) : 0;
    const next = current + 1;
    tx.set(ref, { numero: increment(1), serie: serie || "", updatedAt: new Date().toISOString() }, { merge: true });
    return next;
  });
  return { numero, clave };
}

// ── Cuentas por Cobrar/Pagar ──
// Crea la cuenta cuando el documento es a crédito y la retira cuando deja de serlo.
//
// El parámetro se llamaba `doc` y sombreaba la función `doc()` de Firestore importada
// arriba: la línea `doc(db, "cuentasPorCobrar", docId)` intentaba invocar el objeto del
// documento y lanzaba TypeError. Ahora se llama `documento`.
export async function createOrUpdateCreditAccount(documento, docId, docKey) {
  if (!docId) return;
  const cuentaRef = doc(db, "cuentasPorCobrar", docId);

  if (!esCredito(documento.formaPago)) {
    // Contado: si antes fue a crédito, se retira la cuenta — salvo que ya esté pagada,
    // porque entonces hay movimientos de dinero que no se pueden borrar.
    try {
      const snap = await getDoc(cuentaRef);
      if (snap.exists() && snap.data().estado !== "Pagado") await deleteDoc(cuentaRef);
    } catch { /* la cuenta no existía */ }
    return;
  }

  const op = OPERATION[docKey];
  const total = Number(documento.total) || 0;
  const esCompra = op === "Compra";
  await setDoc(cuentaRef, {
    // El nombre legible, no la clave interna. La pantalla de Cuentas por cobrar imprime
    // este campo tal cual en la columna «Documento» y en el título del cobro, así que
    // guardar `docKey` hacía que el usuario leyera «vs-boleta» donde el resto de las filas
    // decían «Boleta».
    tipoDocumento: DOC_TYPE[docKey] || docKey,
    numeroCotizacion: `${documento.serie || ""}-${documento.numero || docId}`,
    clientenombre: (esCompra ? documento.proveedor : documento.cliente) || documento.cliente || documento.proveedor || "",
    montoTotal: total,
    pagoTotalActual: 0,
    saldoPendiente: total,
    estado: "Pendiente",
    tipoCuenta: esCompra ? "Pagar" : "Cobrar",
    fecha: documento.fecha || new Date().toISOString().split("T")[0],
    tipofactura: "cuentasPorCobrar",
    createdAt: new Date().toISOString(),
  }, { merge: true });
  // Los pagos van a la subcolección `pagos_CporCobrar`, desde CuentasCobrar.jsx.
}
