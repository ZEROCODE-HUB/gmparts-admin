// Capa swappable Firestore — Fase D1 (catálogos simples).
//
// Solo los docKeys de catálogo de Fase D1 enrutan a Firestore. El resto de la app
// sigue en localStorage (db.js) hasta fases posteriores. Ver BACKEND_SPEC.md §3.
//
// Notas de diseño (Fase D1 acotada):
//  - No se toca db.js (sigue localStorage para va-*/vs-*/c-*). El swappable completo
//    de db.js -> firestoreDb se hace en fases D2-D4.
//  - Los catálogos NO usan DocumentReference entre sí en esta fase (subgroup.group /
//    vehicle_model_modelo.brand se omiten; solo se guarda el nombre legible).
//  - Repuestos/Insumos NO se conectan como colecciones (read-only vía Articles, §1.21/1.22).

import { db } from "../lib/firebase";
import {
  collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";


// docKey interno (React) -> colección Firestore
export const CATALOG_MAP = {
  "cat-marca": "article_brand_marca",
  "cat-grupo": "Group",
  "cat-subgrupo": "subgroup",
  "cat-unidad": "measurement_unit",
  "cat-vehmarca": "vehicle_marca_brand",
  "cat-vehmodelo": "vehicle_model_modelo",
  "cat-encargado": "encargados",
};

export const DOC_TYPE = {
  "va-factura": "Factura", "va-boleta": "Boleta", "va-cotizacion": "Cotizacion",
  "va-guia": "Guia", "va-notacredito": "NotaCredito",
  "vs-factura": "Factura", "vs-boleta": "Boleta", "vs-cotizacion": "Cotizacion",
  "vs-orden": "OrdenTrabajo", "vs-notas": "Nota de venta",
  "c-factura": "Factura", "c-boleta": "Boleta", "c-notas": "NotaPedido",
  "c-guia": "Guia", "c-orden": "OrdenPago",
  "al-notaventa": "Nota de venta",
};

// Campo de nombre por colección (encargados usa `nombre`, el resto `name`)
export const CATALOG_NAME_FIELD = {
  "cat-encargado": "nombre",
};



// Split confirmado en D3: vs-* → Facturas, va-*/c-* → FacturasVentasCompras
export function mapDocKeyToCollection(docKey) {
  if (CATALOG_MAP[docKey]) return CATALOG_MAP[docKey];
  const FACTURAS = ["vs-factura", "vs-boleta", "vs-cotizacion", "vs-orden", "vs-notas"];
  const FACTURAS_VC = [
    "va-factura", "va-boleta", "va-cotizacion", "va-guia", "va-notacredito",
    "c-factura", "c-boleta", "c-notas", "c-guia", "c-orden", "al-notaventa",
  ];
  if (FACTURAS.includes(docKey)) return "Facturas";
  if (FACTURAS_VC.includes(docKey)) return "FacturasVentasCompras";
  if (docKey === "cuentasPorCobrar") return "cuentasPorCobrar";
  return docKey;
}

export function isFirestoreDocKey(docKey) {
  return docKey in CATALOG_MAP;
}

export async function getDocuments(docKey) {
  const snap = await getDocs(collection(db, mapDocKeyToCollection(docKey)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveDocument(docKey, doc) {
  if (doc.id && !String(doc.id).startsWith("seed:")) {
    const ref = doc(db, mapDocKeyToCollection(docKey), doc.id);
    await setDoc(ref, doc, { merge: true });
    return doc.id;
  }
  const { id, ...data } = doc;
  const ref = await addDoc(collection(db, mapDocKeyToCollection(docKey)), data);
  return ref.id;
}

export async function deleteDocument(docKey, id) {
  if (!id || String(id).startsWith("seed:")) return;
  await deleteDoc(doc(db, mapDocKeyToCollection(docKey), id));
}

// ---- Catálogos (Fase D1) ----
export async function addCatalogEntry(docKey, name, extra = {}) {
  const field = CATALOG_NAME_FIELD[docKey] || "name";
  const ref = await addDoc(collection(db, mapDocKeyToCollection(docKey)), { [field]: name, ...extra });
  return ref.id;
}

export async function editCatalogEntry(docKey, id, name, extra = {}) {
  const field = CATALOG_NAME_FIELD[docKey] || "name";
  await setDoc(doc(db, mapDocKeyToCollection(docKey), id), { [field]: name, ...extra }, { merge: true });
  return id;
}

export async function deleteCatalogEntry(docKey, id) {
  if (!id || String(id).startsWith("seed:")) return;
  await deleteDoc(doc(db, mapDocKeyToCollection(docKey), id));
}

// Mapa Flutter PascalCase → admin camelCase (top-level)
const FLUTTER_FIELDS = {
  "RazonNombre": ["proveedor", "cliente"],
  "RazonSNombre": ["cliente", "proveedor"],
  "Nserie": ["serie"],
  "Total": ["total"],
  "Estado": ["estado"],
  "Fecha": ["fecha"],
  "FPago": ["formaPago"],
  "Items": ["items"],
  "NumCotizacion": ["numero"],
  "Usuario": ["usuario"],
  "Canje": ["canje"],
  "EstadoFactura": ["estadoFactura"],
};
// Mismo mapa para sub-campos dentro de items/objetos
const FLUTTER_SUB_FIELDS = {
  "Descripcion": ["descripcion"],
  "Codigo": ["codigo"],
  "Cantidad": ["cant", "cantidad"],
  "PrecioVenta": ["pu", "precioVenta"],
  "PrecioCompra": ["precioCompra"],
  "Total": ["total"],
  "Tipo": ["tipo"],
  "Utilidad": ["utilidad"],
  "Stock": ["stock"],
  "Moneda": ["moneda"],
};

function prepareValue(val) {
  if (val && typeof val.toDate === "function") return val.toDate().toISOString().split("T")[0];
  if (val && typeof val === "object" && !Array.isArray(val) && typeof val.path === "string" && typeof val.id === "string") return val.id;
  if (Array.isArray(val)) return val.map(prepareValue);
  if (val && typeof val === "object") {
    const r = {};
    for (const k in val) r[k] = prepareValue(val[k]);
    for (const [pk, aliases] of Object.entries(FLUTTER_SUB_FIELDS)) {
      if (r[pk] !== undefined) for (const a of aliases) { if (r[a] == null) r[a] = r[pk]; }
    }
    return r;
  }
  return val;
}

function prepareDoc(data) {
  const result = {};
  for (const key in data) result[key] = prepareValue(data[key]);
  for (const [pk, aliases] of Object.entries(FLUTTER_FIELDS)) {
    if (result[pk] !== undefined) for (const a of aliases) { if (result[a] == null) result[a] = result[pk]; }
  }
  return result;
}

// ---- Maestros (Fase D2) ----
// Hook genérico en tiempo real para cualquier colección Firestore.
// `constraints` es un arreglo de restricciones de firebase/firestore (where/orderBy).
export function useFirestoreCollection(collectionName, constraints = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const col = collection(db, collectionName);
    const q = constraints.length ? query(col, ...constraints) : col;
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...prepareDoc(d.data()) })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [collectionName, JSON.stringify(constraints)]);
  return items;
}

// Convierte campos con nombre de fecha (fecha, date, nacimiento, creacion, registro, expiration) a Timestamp
function prepareDateFields(data) {
  const DATE_KEYS = /^(fecha|date|nacimiento|creacion|registro|ingreso|SOAT_Expiration|ITV_Expiration|GNV_Expiration)/i;
  const out = { ...data };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (typeof val === "string" && DATE_KEYS.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const d = new Date(val + "T00:00:00");
      if (!isNaN(d.getTime())) out[key] = Timestamp.fromDate(d);
    }
  }
  return out;
}

// Crea o actualiza un documento de maestro. Si `docData.id` existe (y no es semilla)
// hace updateDoc(merge); si no, addDoc. Devuelve el id.
export async function saveMaestro(collectionName, docData) {
  const clean = prepareDateFields({ ...docData });
  delete clean.id;
  if (docData.id && !String(docData.id).startsWith("seed:")) {
    await setDoc(doc(db, collectionName, docData.id), clean, { merge: true });
    return docData.id;
  }
  const ref = await addDoc(collection(db, collectionName), clean);
  return ref.id;
}

export async function deleteMaestro(collectionName, id) {
  if (!id || String(id).startsWith("seed:")) return;
  await deleteDoc(doc(db, collectionName, id));
}

// ---- Hook para listas de documentos con delete, filtrado por tipofactura + TipoOperacion ----
export const TIPO_OPERACION = {
  "va-factura": "venta", "va-boleta": "venta", "va-cotizacion": "venta",
  "va-guia": "venta", "va-notacredito": "venta",
  "c-factura": "compra", "c-boleta": "compra", "c-notas": "compra",
  "c-guia": "compra", "c-orden": "compra",
  "al-notaventa": "venta",
};

function sortByDateDesc(arr, fields = ["fecha", "Fecha", "Date"]) {
  return [...arr].sort((a, b) => {
    for (const f of fields) {
      const da = a[f], db = b[f];
      if (da || db) return (da || "") > (db || "") ? -1 : (da || "") < (db || "") ? 1 : 0;
    }
    return 0;
  });
}

export function useFirestoreDocuments(docKey) {
  const colName = mapDocKeyToCollection(docKey);
  const tipo = DOC_TYPE[docKey] || docKey;
  const constraints = [where("tipofactura", "==", tipo)];
  if (colName === "FacturasVentasCompras" && TIPO_OPERACION[docKey]) {
    constraints.push(where("TipoOperacion", "==", TIPO_OPERACION[docKey]));
  }
  const items = useFirestoreCollection(colName, constraints);
  const sorted = sortByDateDesc(items, colName === "Facturas" ? ["Fecha", "fecha"] : ["fecha", "Fecha"]);
  const remove = useCallback(async (id) => {
    if (!id || String(id).startsWith("seed:")) return;
    await deleteDoc(doc(db, colName, id));
  }, [colName]);
  return [sorted, { remove }];
}

