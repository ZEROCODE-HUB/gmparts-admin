import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts;
pdfMake.fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

const LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";
const ERP_LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";

function totalEnLetras(num) {
  if (num === 0) return "CERO CON 00/100 SOLES";
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  return `${entero} CON ${decimal.toString().padStart(2, "0")}/100 SOLES`;
}

function encabezado(titulo, numero) {
  return [
    {
      columns: [
        {
          width: "60%",
          stack: [
            { image: LOGO_URL, width: 80, height: 80, alignment: "left" },
            { text: "GEAR MOTOR PARTS S.A.C.", style: "empresaNombre" },
            { text: "Direcci\u00f3n fiscal: Coo. Veintisiete de Abril. Av. Nicol\u00e1s Ayll\u00f3n 3270, Ate, Lima", style: "empresaDetalle" },
            { text: "Tel.: 01 362 8667 - 924 483 844", style: "empresaDetalle" },
            { text: "gearmparts@gmail.com", style: "empresaDetalle" },
          ],
        },
        {
          width: "40%",
          alignment: "right",
          table: {
            widths: ["*"],
            body: [[
              {
                text: [
                  { text: "R.U.C. 20601720621\n", style: "ruc" },
                  { text: `${titulo}\n`, style: "tituloDoc" },
                  { text: `N\u00ba ${numero}`, style: "numeroDoc" },
                ],
                alignment: "center",
                margin: [8, 8, 8, 8],
                border: [true, true, true, true],
              },
            ]],
          },
        },
      ],
    },
    { margin: [0, 0, 0, 15] },
  ];
}

function styleEncabezado() {
  return {
    empresaNombre: { fontSize: 12, bold: true },
    empresaDetalle: { fontSize: 8 },
    ruc: { fontSize: 11, bold: true },
    tituloDoc: { fontSize: 13, bold: true },
    numeroDoc: { fontSize: 11, bold: true },
  };
}

function datosCliente(cliente, direccion, ruc, condPago, fecha, vendedor, nroCot, observaciones) {
  const rows = [
    [
      { text: "SE\u00d1OR(ES):", style: "label" },
      { text: (cliente || "").toUpperCase(), style: "value" },
      { text: "FECHA EMISI\u00d3N:", style: "label" },
      { text: fecha || "", style: "value" },
    ],
    [
      { text: "DIRECCI\u00d3N:", style: "label" },
      { text: (direccion || "").toUpperCase(), style: "value" },
      { text: "VENDEDOR:", style: "label" },
      { text: (vendedor || "").toUpperCase(), style: "value" },
    ],
    [
      { text: "RUC:", style: "label" },
      { text: ruc || "", style: "value" },
      { text: "ORD. DE COMPRA:", style: "label" },
      { text: "", style: "value" },
    ],
    [
      { text: "NRO COT:", style: "label" },
      { text: nroCot || "", style: "value" },
      { text: "COND. DE PAGO:", style: "label" },
      { text: (condPago || "").toUpperCase(), style: "value" },
    ],
  ];
  if (observaciones) {
    rows.push([
      { text: "OBSERVA:", style: "label" },
      { text: observaciones, style: "value", colSpan: 3 },
      {}, {},
    ]);
  }
  return {
    table: { widths: ["17%", "33%", "17%", "33%"], body: rows },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10],
  };
}

function datosVehiculo(placa, marca, modelo, km) {
  if (!placa && !marca && !modelo && !km) return null;
  return {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        [
          { text: "PLACA:", style: "label" },
          { text: (placa || "").toUpperCase(), style: "value" },
          { text: "MARCA:", style: "label" },
          { text: (marca || "").toUpperCase(), style: "value" },
        ],
        [
          { text: "MODELO:", style: "label" },
          { text: (modelo || "").toUpperCase(), style: "value" },
          { text: "KM:", style: "label" },
          { text: km || "", style: "value" },
        ],
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 15],
  };
}

function tablaItems(items) {
  const body = [
    [
      { text: "C\u00d3DIGO", style: "tableHeader" },
      { text: "CANT.", style: "tableHeader", alignment: "center" },
      { text: "DESCRIPCI\u00d3N", style: "tableHeader" },
      { text: "P.UNITARIO", style: "tableHeader", alignment: "right" },
      { text: "IMPORTE", style: "tableHeader", alignment: "right" },
    ],
  ];
  for (const it of items || []) {
    const cant = it.cant ?? it.cantidad ?? 1;
    const pu = it.pu ?? it.precioVenta ?? 0;
    const tot = it.total ?? cant * pu;
    body.push([
      { text: it.codigo || "", style: "cell", alignment: "center" },
      { text: String(cant), style: "cell", alignment: "center" },
      { text: (it.descripcion || it.articulo || "").toUpperCase(), style: "cell" },
      { text: `S/ ${Number(pu).toFixed(2)}`, style: "cell", alignment: "right" },
      { text: `S/ ${Number(tot).toFixed(2)}`, style: "cell", alignment: "right" },
    ]);
  }
  while (body.length < 12) {
    body.push([
      { text: "", style: "cell" },
      { text: "", style: "cell" },
      { text: "", style: "cell" },
      { text: "", style: "cell" },
      { text: "", style: "cell" },
    ]);
  }
  return {
    table: { widths: [55, 35, "*", 65, 55], body },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
    margin: [0, 0, 0, 10],
  };
}

function totales(subtotal, igv, total) {
  return {
    columns: [
      { width: "*", text: "" },
      {
        width: "40%",
        stack: [
          { text: `OP. GRAVADA    S/ ${Number(subtotal || 0).toFixed(2)}`, style: "totalLine" },
          { text: `I.G.V. (18%)    S/ ${Number(igv || 0).toFixed(2)}`, style: "totalLine" },
          { text: `IMPORTE TOTAL    S/ ${Number(total || 0).toFixed(2)}`, style: "totalBold" },
        ],
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

function footer(qrData, totalVal) {
  const detraccion = totalVal > 700 ? totalVal * 0.12 : null;
  const neto = detraccion ? totalVal - detraccion : null;
  return {
    columns: [
      {
        width: "30%",
        stack: [
          { qr: qrData || "SIN DATOS QR", fit: 80, alignment: "center" },
          { text: "Representaci\u00f3n impresa de la FACTURA ELECTR\u00d3NICA", fontSize: 6, alignment: "center" },
          { text: "CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL", fontSize: 6, alignment: "center" },
        ],
      },
      {
        width: "35%",
        stack: [
          { text: "CUENTAS BANCARIAS:", style: "label" },
          { text: "BCP CTA Soles: 191-2390862-0-19", fontSize: 8 },
          { text: "BCP CTA CCI: 002-19100239086201950", fontSize: 8 },
          { text: "BN DETRACCI\u00d3N: 00-066-104419", fontSize: 8 },
        ],
        margin: [0, 0, 10, 0],
      },
      {
        width: "35%",
        stack: [
          { text: "SON:", style: "label" },
          { text: totalEnLetras(totalVal || 0).toUpperCase(), fontSize: 8 },
          ...(detraccion ? [
            { text: `DETRACCI\u00d3N 12%: S/ ${detraccion.toFixed(2)}`, style: "detraccion" },
            { text: `Neto a pagar: S/ ${(neto || 0).toFixed(2)}`, style: "detraccion" },
            { text: "Sujeto a Sistema de Pago Obligaciones Tributarias", fontSize: 6, italics: true },
          ] : []),
        ],
      },
    ],
    margin: [0, 10, 0, 10],
  };
}

function estilosGlobales() {
  return {
    empresaNombre: { fontSize: 12, bold: true },
    empresaDetalle: { fontSize: 8 },
    ruc: { fontSize: 11, bold: true },
    tituloDoc: { fontSize: 13, bold: true },
    numeroDoc: { fontSize: 11, bold: true },
    label: { fontSize: 9, bold: true },
    value: { fontSize: 9 },
    tableHeader: { fontSize: 9, bold: true, alignment: "center", margin: [4, 4, 4, 4] },
    cell: { fontSize: 8, margin: [3, 2, 3, 2] },
    totalLine: { fontSize: 9, margin: [2, 2, 2, 2] },
    totalBold: { fontSize: 10, bold: true, margin: [2, 2, 2, 2] },
    detraccion: { fontSize: 8, color: "#CC0000", bold: true },
  };
}

// ──────────────────────────────────────────────
// Factura / Boleta (Venta)
// ──────────────────────────────────────────────
export function generarFacturaPDF(opts) {
  const {
    items, cliente, clienteDoc, direccion, fecha, formaPago,
    serie, numero, subtotal, igv, total,
    placa, marca, modelo, km, observaciones,
    titulo = "FACTURA ELECTR\u00d3NICA", vendedor = "VENDEDOR 1", nroCot = "",
  } = opts;
  const numDoc = `${serie || ""}-${numero || ""}`;
  const qrData = `${cliente || ""}|${numDoc}|${total || 0}`;
  const content = [
    encabezado(titulo, numDoc),
    datosCliente(cliente, direccion || "SIN DIRECCI\u00d3N", clienteDoc || "00000000000", formaPago || "CONTADO", fecha || "", vendedor, nroCot, observaciones),
  ];
  const vh = datosVehiculo(placa, marca, modelo, km);
  if (vh) content.push(vh);
  content.push(tablaItems(items || []));
  content.push(totales(subtotal, igv, total));
  content.push(footer(qrData, total || 0));
  content.push({ image: ERP_LOGO_URL, width: 60, alignment: "right" });

  return {
    pageSize: "A4",
    pageMargins: [20, 20, 20, 20],
    content,
    styles: estilosGlobales(),
    defaultStyle: { fontName: "Roboto" },
  };
}

// ──────────────────────────────────────────────
// Factura Compra
// ──────────────────────────────────────────────
export function generarFacturaCompraPDF(opts) {
  return generarFacturaPDF({
    ...opts,
    cliente: opts.proveedor || opts.cliente,
    clienteDoc: opts.proveedorDoc || opts.clienteDoc,
  });
}

// ──────────────────────────────────────────────
// Cotizaci\u00f3n de Servicio
// ──────────────────────────────────────────────
export function generarCotizacionPDF({ recepcion, diagnosticos = [], items }) {
  const allItems = [];
  for (const diag of diagnosticos) {
    const tiempo = Number(diag.horasTrabajo || diag.Tiempo_estimado || 0);
    const precioServ = Number(diag.manoDeObra || diag.precioservicio || 0);
    if (diag.nombreFalla || diag.Nombre_falla) {
      allItems.push({
        tipo: "mano_obra",
        codigo: "", descripcion: diag.nombreFalla || diag.Nombre_falla || "",
        cant: tiempo, pu: precioServ, total: precioServ * tiempo,
      });
    }
    const reps = diag.repuestos || diag.Repuestos || [];
    for (const r of reps) {
      allItems.push({
        tipo: "repuesto",
        codigo: r.codigo || "",
        descripcion: r.nombre || r.descripcion || "",
        cant: Number(r.cantidad || 1),
        pu: Number(r.precio || r.precioCompra || 0),
        total: Number(r.cantidad || 1) * Number(r.precio || r.precioCompra || 0),
      });
    }
  }
  const itemsFinal = items && items.length > 0 ? items : allItems;
  return generarFacturaPDF({
    items: itemsFinal,
    cliente: recepcion.nombre_cliente || recepcion.Razon_social || "",
    clienteDoc: recepcion.RUCempresa || recepcion.DNI || "",
    fecha: typeof recepcion.fecha_creacion === "string" ? recepcion.fecha_creacion : "",
    formaPago: recepcion.condpago || "CONTADO",
    serie: recepcion.codeCT || "",
    numero: "",
    subtotal: recepcion.Subtotal || recepcion.subtotal || 0,
    igv: recepcion.IGV || recepcion.igv || 0,
    total: recepcion.Total || recepcion.total || 0,
    placa: recepcion.placa || "",
    marca: recepcion.marca || "",
    modelo: recepcion.modelo || "",
    km: recepcion.km_ingreso || "",
    observaciones: recepcion.observaciones || recepcion.Observaciones_adicionales || "",
    titulo: "COTIZACI\u00d3N",
    nroCot: recepcion.codeCT || "",
  });
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
export function descargarPDF(docDef, filename) {
  pdfMake.createPdf(docDef).download(filename);
}
export function imprimirPDF(docDef) {
  pdfMake.createPdf(docDef).print();
}
export function abrirPDF(docDef) {
  pdfMake.createPdf(docDef).open();
}
