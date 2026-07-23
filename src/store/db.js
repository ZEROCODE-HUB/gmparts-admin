// Capa de persistencia tipo "base de datos" (localStorage) para documentos,
// stock de articulos y kardex (cuenta de inventario).
//
// Stock (Flutter ref):
//  - Venta (factura/boleta): descuenta Stock por cantidad
//    (crearfactura_widget.dart:1058 actualizarStockSoloNuevosCopy;  crearfactura_compra_widget.dart:773-782).
//  - Compra: incrementa Stock por cantidad + actualiza precioCompra/precioVenta/utilidad
//    (crearfactura_compra_widget.dart:755-772, gated por checkboxStockValue).
// Kardex (cuenta de inventario): se registra Salida (venta) / Ingreso (compra) por linea repuesto.
//  - Flutter escribe KardexElementRecord en el flujo de almacen (d_pc_inventario_ingreso_creacion_widget.dart:2196),
//    pero la semantica de "cuenta de inventario cambia" al emitir se modela aqui agregando la linea al kardex.

import {
  facturasVASeed, boletasVASeed, cotizacionesVASeed, guiasVASeed, notasCreditoSeed,
} from "../mock/seed.facturas";
import {
  facturasCompraSeed, boletasCompraSeed, notasPedidoSeed, guiasCompraSeed, ordenesPagoSeed,
} from "../mock/seed.compras";
import articulosSeed from "../mock/seed.articulos";
import kardexSeed from "../mock/seed.kardex";
import serviciosDocsSeed from "../mock/seed.serviciosDocs";
import recepcionesSeed from "../mock/seed.recepciones";
import valesSeed from "../mock/seed.vales";
import { cuentasCobrarSeed } from "../mock/seed.cobranza";
import serviciosSeed from "../mock/seed.servicios";

const LS = { docs: "gmp_docs_v1", art: "gmp_art_v1", kardex: "gmp_kardex_v1" };

const SEED_MAP = {
  "service": serviciosSeed,
  "va-factura": facturasVASeed,
  "va-boleta": boletasVASeed,
  "va-cotizacion": cotizacionesVASeed,
  "va-guia": guiasVASeed,
  "va-notacredito": notasCreditoSeed,
  "vs-factura": serviciosDocsSeed.filter((d) => d.tipo === "factura"),
  "vs-boleta": serviciosDocsSeed.filter((d) => d.tipo === "boleta"),
  "vs-cotizacion": serviciosDocsSeed.filter((d) => d.tipo === "cotizacion"),
  "vs-notas": serviciosDocsSeed.filter((d) => d.tipo === "nota"),
  "vs-orden": recepcionesSeed,
  "cuentasPorCobrar": cuentasCobrarSeed,
  "al-vale": valesSeed,
  "c-factura": facturasCompraSeed,
  "c-boleta": boletasCompraSeed,
  "c-notas": notasPedidoSeed,
  "c-guia": guiasCompraSeed,
  "c-orden": ordenesPagoSeed,
};

const OPERATION = {
  "va-factura": "Venta", "va-boleta": "Venta", "vs-factura": "Venta", "vs-boleta": "Venta",
  "al-notaventa": "Venta",
  "c-factura": "Compra", "c-boleta": "Compra", "c-notas": "Compra", "c-guia": "Compra", "c-orden": "Compra",
};

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

// ---- Articulos (stock + precios) ----
let artOverrides = load(LS.art, {}); // id -> { Stock, Precio_compra, Precio_Venta, Utilidad }

export function getArticulos() {
  return articulosSeed.map((a) => {
    const o = artOverrides[a.id];
    return o ? { ...a, ...o } : a;
  });
}

export function articuloEstado(a) {
  const stock = a.Stock ?? 0;
  const min = a.Stock_minimo_Minimum_Stock ?? 0;
  if (stock <= 0) return "Agotado";
  if (stock <= min) return "Stock bajo";
  return "Disponible";
}

function findArticuloIndex(matchKey) {
  const all = getArticulos();
  let idx = all.findIndex((a) => a.Codigo === matchKey || a.id === matchKey);
  if (idx === -1) idx = all.findIndex((a) => a.Nombre_name === matchKey);
  return idx;
}

// ---- Documentos ----
export function getDocuments(docKey) {
  const stored = load(LS.docs, {})[docKey] || [];
  const seed = SEED_MAP[docKey] || [];
  return [...seed, ...stored];
}

export function getDocumentById(docKey, id) {
  return getDocuments(docKey).find((d) => d.id === id) || null;
}

function applyStockSideEffects(docKey, doc) {
  const op = OPERATION[docKey];
  if (!op) return;
  const isCompra = op === "Compra";
  const actualizarStock = doc.actualizarStock !== false; // venta siempre; compra solo si checkbox on
  if (isCompra && !actualizarStock) return;

  const movimientos = [];
  for (const it of doc.items || []) {
    if (it.tipo !== "repuesto") continue;
    const key = it.codigo || it.descripcion;
    const idx = findArticuloIndex(key);
    if (idx === -1) continue;
    const all = getArticulos();
    const art = all[idx];
    const cant = Number(it.cant) || 0;
    if (cant <= 0) continue;
    const cambio = isCompra ? cant : -cant;
    const nuevoStock = Math.max(0, (art.Stock ?? 0) + cambio);
    const override = { ...(artOverrides[art.id] || {}), Stock: nuevoStock };
    if (isCompra) {
      if (it.precioCompra != null) override.Precio_compra_Purchase_price = it.precioCompra;
      if (it.pu != null) override.Precio_Venta_Sale_price = it.pu;
      if (it.utilidad != null) override.Utilidad_Profit_Percentage = it.utilidad;
    }
    artOverrides[art.id] = override;
    movimientos.push({
      Article: art.id, Article_name: art.Nombre_name, Code_Id: art.Codigo,
      Document_Type: isCompra ? "Ingreso" : "Salida",
      Date: doc.fecha || new Date().toISOString().split("T")[0],
      Client: isCompra ? "" : (doc.cliente || ""),
      Provider: isCompra ? (doc.proveedor || "") : "",
      Quantity: cambio,
      Description: isCompra ? "Compra" : "Venta",
      Unit: art.Unidad_de_medida_Measurement_unit || "Unidad",
      PricePerUnit: isCompra ? (it.precioCompra || art.Precio_compra_Purchase_price) : (it.pu || art.Precio_Venta_Sale_price),
      Total_Price: Math.abs(cambio) * (isCompra ? (it.precioCompra || art.Precio_compra_Purchase_price) : (it.pu || art.Precio_Venta_Sale_price)),
      Warehouse: doc.almacen || "w1", OEM: art.OEM || "",
    });
  }
  save(LS.art, artOverrides);
  if (movimientos.length) addKardex(movimientos);
  return movimientos.length > 0;
}

function reverseStockSideEffects(docKey, doc) {
  const op = OPERATION[docKey];
  if (!op) return;
  const isCompra = op === "Compra";
  const all = getArticulos();
  const movimientos = [];
  for (const it of doc.items || []) {
    if (it.tipo !== "repuesto") continue;
    const key = it.codigo || it.descripcion;
    const idx = findArticuloIndex(key);
    if (idx === -1) continue;
    const art = all[idx];
    const cant = Number(it.cant) || 0;
    if (cant <= 0) continue;
    const cambio = isCompra ? -cant : cant; // invierte el efecto original
    const nuevoStock = Math.max(0, (art.Stock ?? 0) + cambio);
    artOverrides[art.id] = { ...(artOverrides[art.id] || {}), Stock: nuevoStock };
    movimientos.push({
      Article: art.id, Article_name: art.Nombre_name, Code_Id: art.Codigo,
      Document_Type: isCompra ? "Salida" : "Ingreso",
      Date: doc.fecha || new Date().toISOString().split("T")[0],
      Client: isCompra ? "" : (doc.cliente || ""),
      Provider: isCompra ? (doc.proveedor || "") : "",
      Quantity: cambio,
      Description: "Anulación",
      Unit: art.Unidad_de_medida_Measurement_unit || "Unidad",
      PricePerUnit: isCompra ? (it.precioCompra || art.Precio_compra_Purchase_price) : (it.pu || art.Precio_Venta_Sale_price),
      Total_Price: Math.abs(cambio) * (isCompra ? (it.precioCompra || art.Precio_compra_Purchase_price) : (it.pu || art.Precio_Venta_Sale_price)),
      Warehouse: doc.almacen || "w1", OEM: art.OEM || "",
    });
  }
  save(LS.art, artOverrides);
  if (movimientos.length) addKardex(movimientos);
}

// ---- Cuentas por cobrar / pagar (Fase B) ----
const CREDIT_DOC_KEYS = ["va-factura", "va-boleta", "vs-factura", "vs-boleta", "c-factura", "c-boleta"];
const TIPO_DOC_BY_KEY = {
  "va-factura": "Factura", "va-boleta": "Boleta", "vs-factura": "Factura", "vs-boleta": "Boleta",
  "c-factura": "Factura", "c-boleta": "Boleta",
};

export function saveCuenta(cuenta) {
  saveDocument("cuentasPorCobrar", cuenta);
}
export function getCuentas() {
  return getDocuments("cuentasPorCobrar");
}

function maybeGenerateAccount(docKey, doc) {
  if (!CREDIT_DOC_KEYS.includes(docKey)) return;
  if (doc.formaPago !== "Crédito") return;
  const id = `cc-${docKey}-${doc.id}`;
  if (getDocuments("cuentasPorCobrar").some((c) => c.id === id)) return; // idempotente
  const isVenta = docKey.startsWith("va-") || docKey.startsWith("vs-");
  const cuenta = {
    id,
    tipoDocumento: TIPO_DOC_BY_KEY[docKey] || "Factura",
    numeroCotizacion: `${doc.serie || ""}-${doc.numero || ""}`,
    clientenombre: doc.cliente || doc.proveedor || "",
    proveedorname: doc.proveedor || "",
    montoTotal: Number(doc.total) || 0,
    pagoTotalActual: 0,
    saldoPendiente: Number(doc.total) || 0,
    estado: "Pendiente",
    fecha: doc.fecha || new Date().toISOString().split("T")[0],
    fecha_creacion: new Date().toISOString(),
    tipoCuenta: isVenta ? "Cobrar" : "Pagar",
    pagos: [],
    documentoRef: `${docKey}:${doc.id}`,
  };
  saveDocument("cuentasPorCobrar", cuenta);
}

export function markRecepcionFacturada(otId) {
  const ot = getDocumentById("vs-orden", otId);
  if (!ot) return;
  saveDocument("vs-orden", { ...ot, facturado: true });
}

export function consumirRepuestosOT(ot) {
  const movimientos = [];
  for (const diag of ot.diagnosticos || []) {
    for (const rp of diag.repuestos || []) {
      const idx = findArticuloIndex(rp.codigo || rp.descripcion);
      if (idx === -1) continue;
      const all = getArticulos();
      const art = all[idx];
      const cant = Number(rp.cantidad) || 0;
      if (cant <= 0) continue;
      const nuevoStock = Math.max(0, (art.Stock ?? 0) - cant);
      artOverrides[art.id] = { ...(artOverrides[art.id] || {}), Stock: nuevoStock };
      movimientos.push({
        Article: art.id, Article_name: art.Nombre_name, Code_Id: art.Codigo,
        Document_Type: "Salida", Date: ot.fecha_creacion || new Date().toISOString().split("T")[0],
        Client: ot.cliente || "", Provider: "", Quantity: -cant,
        Description: "Consumo OT", Unit: art.Unidad_de_medida_Measurement_unit || "Unidad",
        PricePerUnit: art.Precio_Venta_Sale_price, Total_Price: cant * art.Precio_Venta_Sale_price,
        Warehouse: ot.almacen || "w1", OEM: art.OEM || "",
      });
    }
  }
  save(LS.art, artOverrides);
  if (movimientos.length) addKardex(movimientos);
}

// Construye los ítems de una Factura de Taller a partir de una recepción (OT).
// Espejo de cotizaciones_widget.dart:1233-1274 (suma manoDeObra + repuestos).
export function getOTFacturaItems(ot) {
  const items = [];
  for (const diag of ot.diagnosticos || []) {
    const mo = Number(diag.manoDeObra) || 0;
    const horas = Number(diag.horasTrabajo) || 0;
    if (mo > 0) {
      items.push({ tipo: "mano_obra", descripcion: `Mano de obra (${horas}h)`, cant: horas || 1, pu: horas ? mo / horas : mo, total: mo, codigo: "MO-001", moneda: "PEN" });
    }
    if (diag.solucion) {
      items.push({ tipo: "servicio", descripcion: diag.solucion, cant: 1, pu: 0, total: 0, codigo: "", moneda: "PEN" });
    }
    for (const rp of diag.repuestos || []) {
      const art = articulosSeed.find((a) => a.Codigo === rp.codigo || a.Nombre_name === rp.descripcion);
      const pu = art ? art.Precio_Venta_Sale_price : 0;
      const cant = Number(rp.cantidad) || 0;
      items.push({
        tipo: "repuesto", descripcion: rp.descripcion, cant, pu, total: cant * pu,
        codigo: rp.codigo || (art ? art.Codigo : ""), moneda: "PEN",
        stock: art ? art.Stock : 0, precioCompra: art ? art.Precio_compra_Purchase_price : 0,
        utilidad: art ? art.Utilidad_Profit_Percentage : 0,
      });
    }
  }
  return items;
}

export function saveVale(vale) {
  saveDocument("al-vale", vale);
  const movimientos = [];
  for (const it of vale.repuestos || []) {
    const idx = findArticuloIndex(it.codigo || it.descripcion);
    if (idx === -1) continue;
    const all = getArticulos();
    const art = all[idx];
    const cant = Number(it.cantidad) || 0;
    if (cant <= 0) continue;
    const nuevoStock = Math.max(0, (art.Stock ?? 0) - cant);
    artOverrides[art.id] = { ...(artOverrides[art.id] || {}), Stock: nuevoStock };
    movimientos.push({
      Article: art.id, Article_name: art.Nombre_name, Code_Id: art.Codigo,
      Document_Type: "Salida", Date: vale.fecha || new Date().toISOString().split("T")[0],
      Client: "", Provider: "", Quantity: -cant,
      Description: "Vale de insumos", Unit: art.Unidad_de_medida_Measurement_unit || "Unidad",
      PricePerUnit: it.precioCompra ?? art.Precio_compra_Purchase_price,
      Total_Price: cant * (it.precioCompra ?? art.Precio_compra_Purchase_price),
      Warehouse: vale.almacen || "w1", OEM: art.OEM || "",
    });
  }
  save(LS.art, artOverrides);
  if (movimientos.length) addKardex(movimientos);
}

export function saveDocument(docKey, doc) {
  const all = load(LS.docs, {});
  const stored = all[docKey] ? [...all[docKey]] : [];
  const existing = stored.find((d) => d.id === doc.id) || null;
  const isNew = !existing;
  if (isNew) {
    doc.stockAffected = applyStockSideEffects(docKey, doc);
    maybeGenerateAccount(docKey, doc);
    if (docKey.startsWith("c-")) doc.estadoFactura = doc.estadoFactura || "Registrado";
    else if (OPERATION[docKey]) doc.estado = doc.estado || "Emitida";
  } else {
    if (existing.stockAffected) reverseStockSideEffects(docKey, existing);
    doc.stockAffected = applyStockSideEffects(docKey, doc);
    if (doc.formaPago === "Crédito") {
      maybeGenerateAccount(docKey, doc);
    } else {
      const idCuenta = `cc-${docKey}-${doc.id}`;
      const cuenta = getDocuments("cuentasPorCobrar").find((c) => c.id === idCuenta);
      if (cuenta && cuenta.estado !== "Pagada") {
        deleteDocument("cuentasPorCobrar", idCuenta);
      }
    }
  }
  const i = stored.findIndex((d) => d.id === doc.id);
  if (i === -1) stored.push(doc); else stored[i] = doc;
  all[docKey] = stored;
  save(LS.docs, all);
}

// Scaffolding facturación electrónica (Fase B). El envío real a SUNAT es backend.
export function setEstadoFactura(docKey, id, estado) {
  const all = load(LS.docs, {});
  const stored = all[docKey] ? [...all[docKey]] : [];
  const i = stored.findIndex((d) => d.id === id);
  if (i === -1) return;
  stored[i] = { ...stored[i], estadoFactura: estado };
  all[docKey] = stored;
  save(LS.docs, all);
}

export function deleteDocument(docKey, id) {
  const all = load(LS.docs, {});
  const list = all[docKey] ? [...all[docKey]] : [];
  const doc = list.find((d) => d.id === id);
  if (doc && doc.stockAffected) reverseStockSideEffects(docKey, doc);
  all[docKey] = list.filter((d) => d.id !== id);
  save(LS.docs, all);
}

// ---- Kardex ----
let kardexOverrides = load(LS.kardex, []);
export function getKardex() {
  return [...kardexSeed, ...kardexOverrides];
}
function addKardex(entries) {
  const base = kardexOverrides.length
    ? Math.max(...kardexOverrides.map((k) => parseInt(String(k.id).replace(/\D/g, ""), 10) || 0))
    : Math.max(...kardexSeed.map((k) => parseInt(String(k.id).replace(/\D/g, ""), 10) || 0));
  let n = base;
  const withIds = entries.map((e) => ({ ...e, id: `k${++n}` }));
  kardexOverrides = [...kardexOverrides, ...withIds];
  save(LS.kardex, kardexOverrides);
}

// Devuelve un id unico para nuevos documentos de un docKey.
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
