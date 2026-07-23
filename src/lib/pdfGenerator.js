import pdfMake from "pdfmake/build/pdfmake";

let _inited = false;
async function init() {
  if (_inited) return;
  const pdfFonts = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = pdfFonts.default;
  pdfMake.fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };
  _inited = true;
}

const LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";
const ERP_LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";

async function urlToDataUrl(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

function totalEnLetras(num) {
  if (num === 0) return "CERO CON 00/100 SOLES";
  const e = Math.floor(num);
  const d = Math.round((num - e) * 100);
  return `${e} CON ${d.toString().padStart(2, "0")}/100 SOLES`;
}

const S = {
  empresaNombre: { fontSize: 12, bold: true }, empresaDetalle: { fontSize: 8 },
  ruc: { fontSize: 11, bold: true }, tituloDoc: { fontSize: 13, bold: true }, numeroDoc: { fontSize: 11, bold: true },
  label: { fontSize: 9, bold: true }, value: { fontSize: 9 },
  tableHeader: { fontSize: 10, bold: true, alignment: "center", margin: [5, 5, 5, 5] },
  cell: { fontSize: 9, margin: [4, 3, 4, 3] },
  totalLine: { fontSize: 10, margin: [3, 3, 3, 3] }, totalBold: { fontSize: 11, bold: true, margin: [3, 3, 3, 3] },
  detraccion: { fontSize: 9, color: "#CC0000", bold: true },
};

async function buildDocDef(opts) {
  await init();
  const { items, cliente, clienteDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, placa, marca, modelo, km, observaciones, titulo = "FACTURA ELECTR\u00d3NICA", vendedor = "VENDEDOR 1", nroCot = "" } = opts;
  const numDoc = `${serie || ""}-${numero || ""}`;
  const [logoData, erpData] = await Promise.all([urlToDataUrl(LOGO_URL), urlToDataUrl(ERP_LOGO_URL)]);
  const detraccion = total > 700 ? total * 0.12 : null;
  const neto = detraccion ? total - detraccion : null;
  const content = [
    { columns: [
      { width: "60%", stack: [
        ...(logoData ? [{ image: logoData, width: 80, height: 80, alignment: "left" }] : []),
        { text: "GEAR MOTOR PARTS S.A.C.", style: "empresaNombre" },
        { text: "Direcci\u00f3n fiscal: Coo. Veintisiete de Abril. Av. Nicol\u00e1s Ayll\u00f3n 3270, Ate, Lima", style: "empresaDetalle" },
        { text: "Tel.: 01 362 8667 - 924 483 844", style: "empresaDetalle" },
        { text: "gearmparts@gmail.com", style: "empresaDetalle" },
      ]},
      { width: "40%", alignment: "right", table: { widths: ["*"], body: [[{ text: [{ text: "R.U.C. 20601720621\n", style: "ruc" }, { text: `${titulo}\n`, style: "tituloDoc" }, { text: `N\u00ba ${numDoc}`, style: "numeroDoc" }], alignment: "center", margin: [8, 8, 8, 8], border: [true, true, true, true] }]] }},
    ], margin: [0, 0, 0, 15] },
    { table: { widths: ["17%", "33%", "17%", "33%"], body: [
      [{ text: "SE\u00d1OR(ES):", style: "label" }, { text: (cliente || "").toUpperCase(), style: "value" }, { text: "FECHA EMISI\u00d3N:", style: "label" }, { text: fecha || "", style: "value" }],
      [{ text: "DIRECCI\u00d3N:", style: "label" }, { text: (direccion || "").toUpperCase(), style: "value" }, { text: "VENDEDOR:", style: "label" }, { text: (vendedor || "").toUpperCase(), style: "value" }],
      [{ text: "RUC:", style: "label" }, { text: clienteDoc || "", style: "value" }, { text: "ORD. DE COMPRA:", style: "label" }, { text: "", style: "value" }],
      [{ text: "NRO COT:", style: "label" }, { text: nroCot || "", style: "value" }, { text: "COND. DE PAGO:", style: "label" }, { text: (formaPago || "").toUpperCase(), style: "value" }],
      ...(observaciones ? [[{ text: "OBSERVA:", style: "label" }, { text: observaciones, style: "value", colSpan: 3 }, {}, {}]] : []),
    ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
  ];
  if (placa || marca || modelo || km) {
    content.push({ table: { widths: ["25%", "25%", "25%", "25%"], body: [
      [{ text: "PLACA:", style: "label" }, { text: (placa || "").toUpperCase(), style: "value" }, { text: "MARCA:", style: "label" }, { text: (marca || "").toUpperCase(), style: "value" }],
      [{ text: "MODELO:", style: "label" }, { text: (modelo || "").toUpperCase(), style: "value" }, { text: "KM:", style: "label" }, { text: km || "", style: "value" }],
    ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 15] });
  }
  const tblBody = [[{ text: "C\u00d3DIGO", style: "tableHeader" }, { text: "CANT.", style: "tableHeader", alignment: "center" }, { text: "DESCRIPCI\u00d3N", style: "tableHeader" }, { text: "P.UNITARIO", style: "tableHeader", alignment: "right" }, { text: "IMPORTE", style: "tableHeader", alignment: "right" }]];
  for (const it of items || []) {
    const c = it.cant ?? it.cantidad ?? 1;
    const p = it.pu ?? it.precioVenta ?? 0;
    const t = it.total ?? c * p;
    tblBody.push([{ text: it.codigo || "", style: "cell", alignment: "center" }, { text: String(c), style: "cell", alignment: "center" }, { text: (it.descripcion || it.articulo || "").toUpperCase(), style: "cell" }, { text: `S/ ${Number(p).toFixed(2)}`, style: "cell", alignment: "right" }, { text: `S/ ${Number(t).toFixed(2)}`, style: "cell", alignment: "right" }]);
  }
  while (tblBody.length < 12) tblBody.push([{ text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }]);
  content.push({ table: { widths: [55, 35, "*", 65, 55], body: tblBody }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 }, margin: [0, 0, 0, 10] });
  content.push({ columns: [
    { width: "*", text: "" }, { width: "40%", stack: [
      { text: `OP. GRAVADA    S/ ${Number(subtotal || 0).toFixed(2)}`, style: "totalLine" },
      { text: `I.G.V. (18%)    S/ ${Number(igv || 0).toFixed(2)}`, style: "totalLine" },
      { text: `IMPORTE TOTAL    S/ ${Number(total || 0).toFixed(2)}`, style: "totalBold" },
    ]},
  ], margin: [0, 0, 0, 10] });
  content.push({ columns: [
    { width: "30%", stack: [
      { qr: `${cliente || ""}|${numDoc}|${total || 0}`, fit: 80, alignment: "center" },
      { text: "Representaci\u00f3n impresa de la FACTURA ELECTR\u00d3NICA", fontSize: 6, alignment: "center" },
      { text: "CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL", fontSize: 6, alignment: "center" },
    ]},
    { width: "35%", stack: [
      { text: "CUENTAS BANCARIAS:", style: "label" },
      { text: "BCP CTA Soles: 191-2390862-0-19", fontSize: 8 },
      { text: "BCP CTA CCI: 002-19100239086201950", fontSize: 8 },
      { text: "BN DETRACCI\u00d3N: 00-066-104419", fontSize: 8 },
    ], margin: [0, 0, 10, 0] },
    { width: "35%", stack: [
      { text: "SON:", style: "label" },
      { text: totalEnLetras(total || 0).toUpperCase(), fontSize: 8 },
      ...(detraccion ? [{ text: `DETRACCI\u00d3N 12%: S/ ${detraccion.toFixed(2)}`, style: "detraccion" }, { text: `Neto a pagar: S/ ${(neto || 0).toFixed(2)}`, style: "detraccion" }, { text: "Sujeto a Sistema de Pago Obligaciones Tributarias", fontSize: 6, italics: true }] : []),
    ]},
  ], margin: [0, 10, 0, 10] });
  if (erpData) content.push({ image: erpData, width: 60, alignment: "right" });
  return { pageSize: "A4", pageMargins: [25, 25, 25, 25], content, styles: S, defaultStyle: { fontName: "Roboto" } };
}

export async function descargarPDF(opts, filename) {
  if (!filename.endsWith(".pdf")) filename += ".pdf";
  pdfMake.createPdf(await buildDocDef(opts)).download(filename);
}
export async function imprimirPDF(opts) {
  pdfMake.createPdf(await buildDocDef(opts)).print();
}
export async function abrirPDF(opts) {
  pdfMake.createPdf(await buildDocDef(opts)).open();
}

export function docToOpts(data, title) {
  return {
    items: data.items || data.diagnosticos || [],
    cliente: data.cliente || data.razonSNombre || data.nombre_cliente || data.Razon_social || "",
    clienteDoc: data.clienteDoc || data.RUCempresa || data.DNI || "",
    direccion: data.direccion || "",
    fecha: data.fecha || data.Fecha || data.fecha_creacion || "",
    formaPago: data.formaPago || data.FPago || "CONTADO",
    serie: data.serie || data.nserie || data.Nserie || "",
    numero: data.numero || data.NumCotizacion || "",
    subtotal: data.subtotal || 0,
    igv: data.igv || 0,
    total: data.total || data.Total || 0,
    placa: data.placa || "",
    marca: data.marca || "",
    modelo: data.modelo || "",
    km: data.km_ingreso || "",
    observaciones: data.observacion || data.motivo || "",
    titulo: title || "DOCUMENTO",
  };
}
