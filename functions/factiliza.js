// Helpers puros para la integracion con Factiliza (emision electronica SUNAT).
// Separados de index.js para poder probarlos sin inicializar firebase-admin.

const FACTILIZA_API = "https://apife.factiliza.com/api/v1";
const RUC_EMPRESA = "20601720621";

function round2(num) {
  return Math.round(num * 100) / 100;
}

// Catálogo SUNAT 06 — Tipo de documento de identidad.
// 0 = Otros, 1 = DNI, 4 = Carnet de extranjería, 6 = RUC, 7 = Pasaporte.
function tipoDocIdentidad(tipoDoc, numDoc) {
  const t = String(tipoDoc || "").trim().toUpperCase();
  if (t === "RUC" || t === "6") return "6";
  if (t === "DNI" || t === "1") return "1";
  if (t === "CE" || t === "CARNET DE EXTRANJERIA" || t === "4") return "4";
  if (t === "PASAPORTE" || t === "PAS" || t === "7") return "7";
  const n = String(numDoc || "").replace(/\D/g, "");
  if (n.length === 11) return "6";
  if (n.length === 8) return "1";
  return "0";
}

// Normaliza cualquier representación de fecha a "YYYY-MM-DDT00:00:00-05:00".
// Firestore devuelve Timestamp en los documentos creados por la app Flutter y
// String "YYYY-MM-DD" en los creados por el admin web; concatenar el Timestamp
// directamente producía "[object Object]T00:00:00-05:00" y Factiliza respondía
// 400 "The JSON value could not be converted to System.DateTime".
function toFactilizaDate(valor) {
  const pad = (n) => String(n).padStart(2, "0");
  let d = null;

  if (valor && typeof valor.toDate === "function") {
    d = valor.toDate();
  } else if (valor instanceof Date) {
    d = valor;
  } else if (valor && typeof valor === "object" && typeof valor._seconds === "number") {
    d = new Date(valor._seconds * 1000);
  } else if (typeof valor === "string") {
    const s = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T00:00:00-05:00";
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return dmy[3] + "-" + pad(dmy[2]) + "-" + pad(dmy[1]) + "T00:00:00-05:00";
    d = new Date(s);
  }

  if (!d || isNaN(d.getTime())) d = new Date();
  // Fecha calendario en hora de Lima (UTC-5), no en UTC.
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return lima.toISOString().split("T")[0] + "T00:00:00-05:00";
}

function buildDetail(items, igvIncluido) {
  return (items || []).map((it) => {
    const cantidad = Number(it.cant ?? it.cantidad ?? 1) || 1;
    const precio = Number(it.pu ?? it.precioVenta ?? 0) || 0;
    let valorUnitario, igv, valorVenta;
    if (igvIncluido) {
      valorUnitario = round2(precio / 1.18);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
    } else {
      valorUnitario = round2(precio);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
    }
    return {
      unidad: "NIU",
      cantidad,
      cod_Producto: it.codigo || "",
      descripcion: it.descripcion || "",
      monto_Valor_Unitario: valorUnitario,
      monto_Base_Igv: valorVenta,
      porcentaje_Igv: 18,
      igv,
      tip_Afe_Igv: "10",
      total_Impuestos: igv,
      monto_Precio_Unitario: round2(valorUnitario * 1.18),
      monto_Valor_Venta: valorVenta,
      factor_Icbper: 0,
    };
  });
}

// Extrae un mensaje legible de las distintas formas de error de Factiliza:
// { data: { error: { message } } }, { message }, CDR de SUNAT, o validación ASP.NET
// { title, errors: { campo: ["..."] } }.
function extractFactilizaError(result) {
  if (!result) return "";
  const cdr = result?.data?.sunatResponse?.cdrResponse;
  const partes = [
    result?.data?.error?.message,
    cdr?.description,
    result?.data?.sunatResponse?.error?.message,
    result?.message,
    result?.title,
  ].filter((p) => typeof p === "string" && p.trim());

  if (result?.errors && typeof result.errors === "object") {
    for (const [campo, msgs] of Object.entries(result.errors)) {
      const texto = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      partes.push(campo === "$" ? texto : campo + ": " + texto);
    }
  }
  return [...new Set(partes)].join(" | ");
}

function buildFactilizaPayload(doc, docKey) {
  const items = doc.items || [];
  const igvIncluido = doc.tipoIgv === "INCLUIDO";
  const detalle = buildDetail(items, igvIncluido);
  const subTotal = detalle.reduce((s, it) => s + it.monto_Valor_Venta, 0);
  const totalIgv = detalle.reduce((s, it) => s + it.igv, 0);
  const montoTotal = subTotal + totalIgv;

  const cliente = doc.cliente || doc.razonSNombre || doc.proveedor || "";
  const clienteDocNum = doc.clienteDoc || doc.proveedorDoc || "";
  const esFactura = docKey === "c-factura" || docKey === "va-factura" || docKey === "vs-factura";
  const esBoleta = docKey === "c-boleta" || docKey === "va-boleta" || docKey === "vs-boleta";
  const esNotaCredito = docKey === "va-notacredito";
  const esGuia = docKey === "c-guia" || docKey === "va-guia";

  let tipoDoc, endpoint;
  if (esNotaCredito) {
    tipoDoc = "07";
    endpoint = FACTILIZA_API + "/note/send";
  } else if (esGuia) {
    tipoDoc = "09";
    endpoint = FACTILIZA_API + "/despatch/send";
  } else {
    tipoDoc = esFactura ? "01" : esBoleta ? "03" : "01";
    endpoint = FACTILIZA_API + "/invoice/send";
  }

  const payload = {
    tipo_Operacion: "0101",
    tipo_Doc: tipoDoc,
    serie: doc.serie || doc.nserie || "",
    correlativo: doc.numero || "",
    tipo_Moneda: "PEN",
    fecha_Emision: toFactilizaDate(doc.fecha || doc.Fecha),
    empresa_Ruc: RUC_EMPRESA,
    cliente_Tipo_Doc: tipoDocIdentidad(doc.tipoDoc, clienteDocNum),
    cliente_Num_Doc: clienteDocNum,
    cliente_Razon_Social: cliente,
    cliente_Direccion: doc.direccion || doc.clienteDireccion || "",
    monto_Oper_Gravadas: round2(subTotal),
    monto_Igv: round2(totalIgv),
    total_Impuestos: round2(totalIgv),
    valor_Venta: round2(subTotal),
    sub_Total: round2(montoTotal),
    monto_Imp_Venta: round2(montoTotal),
    monto_Oper_Exoneradas: 0,
    estado_Documento: "0",
    manual: false,
    id_Base_Dato: "15265",
    detalle,
    forma_pago: [{ tipo: "Contado", monto: round2(montoTotal), cuota: 0, fecha_Pago: toFactilizaDate(doc.fecha || doc.Fecha) }],
    legend: [{ legend_Code: "1000", legend_Value: "GM PARTS TALLER" }],
  };

  if (esNotaCredito) {
    payload.afectado_Tipo_Doc = "01";
    payload.afectado_Num_Doc = doc.docRelacion || "";
    payload.motivo_Cod = "09";
    payload.motivo_Des = "Anulación";
    delete payload.forma_pago;
  }

  return { payload, endpoint };
}

// Comprueba los datos que SUNAT exige antes de gastar una llamada al API,
// para devolver un mensaje accionable en vez de un error de deserialización.
function validarPayload(payload) {
  const faltantes = [];
  if (!payload.serie) faltantes.push("serie");
  if (!payload.correlativo) faltantes.push("número correlativo");
  if (!payload.cliente_Num_Doc) faltantes.push("documento del cliente (RUC/DNI)");
  if (!payload.cliente_Razon_Social) faltantes.push("razón social / nombre del cliente");
  if (!payload.detalle || payload.detalle.length === 0) faltantes.push("al menos un ítem en el detalle");
  if (payload.tipo_Doc === "01" && payload.cliente_Tipo_Doc !== "6") {
    return "Una Factura requiere que el cliente tenga RUC (11 dígitos). Documento actual: " + (payload.cliente_Num_Doc || "vacío");
  }
  if (faltantes.length > 0) {
    return "El documento no puede enviarse a SUNAT porque le falta: " + faltantes.join(", ") + ".";
  }
  return "";
}

module.exports = {
  FACTILIZA_API,
  RUC_EMPRESA,
  round2,
  tipoDocIdentidad,
  toFactilizaDate,
  buildDetail,
  extractFactilizaError,
  buildFactilizaPayload,
  validarPayload,
};
