const LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";
const ERP_LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";

let _pdfMake = null;
async function getPdfMake() {
  if (!_pdfMake) {
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    pdfMakeModule.default.vfs = pdfFontsModule.default;
    pdfMakeModule.default.fonts = {
      Roboto: {
        normal: "Roboto-Regular.ttf",
        bold: "Roboto-Medium.ttf",
        italics: "Roboto-Italic.ttf",
        bolditalics: "Roboto-MediumItalic.ttf",
      },
    };
    _pdfMake = pdfMakeModule.default;
  }
  return _pdfMake;
}

function totalEnLetras(num) {
  if (num === 0) return "CERO CON 00/100 SOLES";
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  return `${entero} CON ${decimal.toString().padStart(2, "0")}/100 SOLES`;
}

function encabezado(titulo, numero) {
  return {
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
    margin: [0, 0, 0, 15],
  };
}

function datosCliente(cliente, direccion, ruc, condPago, fecha, vendedor, nroCot, observaciones) {
  const rows = [
    [{ text: "SE\u00d1OR(ES):", style: "label" }, { text: (cliente || "").toUpperCase(), style: "value" }, { text: "FECHA EMISI\u00d3N:", style: "label" }, { text: fecha || "", style: "value" }],
    [{ text: "DIRECCI\u00d3N:", style: "label" }, { text: (direccion || "").toUpperCase(), style: "value" }, { text: "VENDEDOR:", style: "label" }, { text: (vendedor || "").toUpperCase(), style: "value" }],
    [{ text: "RUC:", style: "label" }, { text: ruc || "", style: "value" }, { text: "ORD. DE COMPRA:", style: "label" }, { text: "", style: "value" }],
    [{ text: "NRO COT:", style: "label" }, { text: nroCot || "", style: "value" }, { text: "COND. DE PAGO:", style: "label" }, { text: (condPago || "").toUpperCase(), style: "value" }],
  ];
  if (observaciones) {
    rows.push([{ text: "OBSERVA:", style: "label" }, { text: observaciones, style: "value", colSpan: 3 }, {}, {}]);
  }
  return { table: { widths: ["17%", "33%", "17%", "33%"], body: rows }, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] };
}

function datosVehiculo(placa, marca, modelo, km) {
  if (!placa && !marca && !modelo && !km) return null;
  return {
    table: {
      widths: ["25%", "25%", "25%", "25%"],
      body: [
        [{ text: "PLACA:", style: "label" }, { text: (placa || "").toUpperCase(), style: "value" }, { text: "MARCA:", style: "label" }, { text: (marca || "").toUpperCase(), style: "value" }],
        [{ text: "MODELO:", style: "label" }, { text: (modelo || "").toUpperCase(), style: "value" }, { text: "KM:", style: "label" }, { text: km || "", style: "value" }],
      ],
    },
    layout: "lightHorizontalLines", margin: [0, 0, 0, 15],
  };
}

function tablaItems(items) {
  const body = [
    [{ text: "C\u00d3DIGO", style: "tableHeader" }, { text: "CANT.", style: "tableHeader", alignment: "center" }, { text: "DESCRIPCI\u00d3N", style: "tableHeader" }, { text: "P.UNITARIO", style: "tableHeader", alignment: "right" }, { text: "IMPORTE", style: "tableHeader", alignment: "right" }],
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
    body.push([{ text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }]);
  }
  return { table: { widths: [55, 35, "*", 65, 55], body }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 }, margin: [0, 0, 0, 10] };
}

function totales(subtotal, igv, total) {
  return {
    columns: [
      { width: "*", text: "" },
      { width: "40%", stack: [
        { text: `OP. GRAVADA    S/ ${Number(subtotal || 0).toFixed(2)}`, style: "totalLine" },
        { text: `I.G.V. (18%)    S/ ${Number(igv || 0).toFixed(2)}`, style: "totalLine" },
        { text: `IMPORTE TOTAL    S/ ${Number(total || 0).toFixed(2)}`, style: "totalBold" },
      ]},
    ],
    margin: [0, 0, 0, 10],
  };
}

function footer(qrData, totalVal) {
  const detraccion = totalVal > 700 ? totalVal * 0.12 : null;
  const neto = detraccion ? totalVal - detraccion : null;
  return {
    columns: [
      { width: "30%", stack: [
        { qr: qrData || "SIN DATOS QR", fit: 80, alignment: "center" },
        { text: "Representaci\u00f3n impresa de la FACTURA ELECTR\u00d3NICA", fontSize: 6, alignment: "center" },
        { text: "CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL", fontSize: 6, alignment: "center" },
      ]},
      { width: "35%", stack: [
        { text: "CUENTAS BANCARIAS:", style: "label" },
        { text: "BCP CTA Soles: 191-2390862-0-19", fontSize: 8 },
        { text: "BCP CTA CCI: 002-19100239086201950", fontSize: 8 },
        { text: "BN DETRACCI\u00d3N: 00-066-104419", fontSize: 8 },
      ], margin: [0, 0, 10, 0]},
      { width: "35%", stack: [
        { text: "SON:", style: "label" },
        { text: totalEnLetras(totalVal || 0).toUpperCase(), fontSize: 8 },
        ...(detraccion ? [
          { text: `DETRACCI\u00d3N 12%: S/ ${detraccion.toFixed(2)}`, style: "detraccion" },
          { text: `Neto a pagar: S/ ${(neto || 0).toFixed(2)}`, style: "detraccion" },
          { text: "Sujeto a Sistema de Pago Obligaciones Tributarias", fontSize: 6, italics: true },
        ] : []),
      ]},
    ],
    margin: [0, 10, 0, 10],
  };
}

const estilos = {
  empresaNombre: { fontSize: 12, bold: true },
  empresaDetalle: { fontSize: 8 },
  ruc: { fontSize: 11, bold: true },
  tituloDoc: { fontSize: 13, bold: true },
  numeroDoc: { fontSize: 11, bold: true },
  label: { fontSize: 9, bold: true },
  value: { fontSize: 9 },
  tableHeader: { fontSize: 10, bold: true, alignment: "center", margin: [5, 5, 5, 5] },
  cell: { fontSize: 9, margin: [4, 3, 4, 3] },
  totalLine: { fontSize: 10, margin: [3, 3, 3, 3] },
  totalBold: { fontSize: 11, bold: true, margin: [3, 3, 3, 3] },
  detraccion: { fontSize: 9, color: "#CC0000", bold: true },
};

function buildDocDef(opts) {
  const { items, cliente, clienteDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, placa, marca, modelo, km, observaciones, titulo = "FACTURA ELECTR\u00d3NICA", vendedor = "VENDEDOR 1", nroCot = "" } = opts;
  const numDoc = `${serie || ""}-${numero || ""}`;
  const content = [
    encabezado(titulo, numDoc),
    datosCliente(cliente, direccion || "SIN DIRECCI\u00d3N", clienteDoc || "00000000000", formaPago || "CONTADO", fecha || "", vendedor, nroCot, observaciones),
  ];
  const vh = datosVehiculo(placa, marca, modelo, km);
  if (vh) content.push(vh);
  content.push(tablaItems(items || []));
  content.push(totales(subtotal, igv, total));
  content.push(footer(`${cliente || ""}|${numDoc}|${total || 0}`, total || 0));
  content.push({ image: ERP_LOGO_URL, width: 60, alignment: "right" });
  return { pageSize: "A4", pageMargins: [25, 25, 25, 25], content, styles: estilos, defaultStyle: { fontName: "Roboto" } };
}

function buildDocDefCotizacion({ recepcion, diagnosticos = [], items }) {
  const allItems = [];
  for (const diag of diagnosticos) {
    const tiempo = Number(diag.horasTrabajo || diag.Tiempo_estimado || 0);
    const precioServ = Number(diag.manoDeObra || diag.precioservicio || 0);
    if (diag.nombreFalla || diag.Nombre_falla) {
      allItems.push({ codigo: "", descripcion: diag.nombreFalla || diag.Nombre_falla || "", cant: tiempo, pu: precioServ, total: precioServ * tiempo });
    }
    for (const r of (diag.repuestos || diag.Repuestos || [])) {
      const cant = Number(r.cantidad || 1);
      const precio = Number(r.precio || r.precioCompra || 0);
      allItems.push({ codigo: r.codigo || "", descripcion: r.nombre || r.descripcion || "", cant, pu: precio, total: cant * precio });
    }
  }
  const itemsFinal = (items && items.length > 0) ? items : allItems;
  return buildDocDef({
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

// ── API PÚBLICA ──
export function generarFacturaPDF(opts) { return buildDocDef(opts); }
export function generarFacturaCompraPDF(opts) { return buildDocDef({ ...opts, cliente: opts.proveedor || opts.cliente, clienteDoc: opts.proveedorDoc || opts.clienteDoc }); }
export function generarCotizacionPDF(opts) { return buildDocDefCotizacion(opts); }

export async function descargarPDF(docDef, filename) {
  if (!filename.endsWith(".pdf")) filename += ".pdf";
  const pm = await getPdfMake();
  pm.createPdf(docDef).download(filename);
}
export async function imprimirPDF(docDef) {
  const pm = await getPdfMake();
  pm.createPdf(docDef).print();
}
export async function abrirPDF(docDef) {
  const pm = await getPdfMake();
  pm.createPdf(docDef).open();
}
