const LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";
const ERP_LOGO_URL = "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/12345/capa_erp.png";

function totalEnLetras(num) {
  if (num === 0) return "CERO CON 00/100 SOLES";
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  return `${entero} CON ${decimal.toString().padStart(2, "0")}/100 SOLES`;
}

function escape(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function itemsHTML(items) {
  if (!items || items.length === 0) return "";
  let rows = "";
  for (const it of items) {
    const cant = it.cant ?? it.cantidad ?? 1;
    const pu = it.pu ?? it.precioVenta ?? 0;
    const tot = it.total ?? cant * pu;
    rows += `<tr>
      <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:center">${escape(it.codigo || "")}</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:center">${cant}</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px">${escape(it.descripcion || it.articulo || "").toUpperCase()}</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:right">S/ ${Number(pu).toFixed(2)}</td>
      <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:right">S/ ${Number(tot).toFixed(2)}</td>
    </tr>`;
  }
  return rows;
}

function buildHTML({ items, cliente, clienteDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, placa, marca, modelo, km, observaciones, titulo = "DOCUMENTO", vendedor = "VENDEDOR 1", nroCot = "" }) {
  const numDoc = `${serie || ""}-${numero || ""}`;
  const detraccion = total > 700 ? total * 0.12 : null;
  const neto = detraccion ? total - detraccion : null;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escape(titulo)} ${escape(numDoc)}</title>
<style>
  @page { margin: 15mm 10mm; size: A4; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 4px; font-size: 9px; }
  .header { width: 100%; margin-bottom: 15px; }
  .header td { vertical-align: top; }
  .box { border: 1px solid #000; padding: 8px; }
  .label { font-weight: bold; font-size: 9px; }
  .value { font-size: 9px; }
  .totals { text-align: right; margin-top: 10px; }
  .totals p { margin: 2px 0; font-size: 9px; }
  .total-bold { font-weight: bold; font-size: 10px; }
  .detraccion { color: #c00; font-weight: bold; font-size: 8px; }
  .footer { margin-top: 15px; }
  .footer td { vertical-align: top; }
  .bank { font-size: 8px; }
  @media print { .no-print { display: none; } }
  hr { border: none; border-top: 0.5px solid #000; margin: 4px 0; }
</style></head><body>

<!-- ENCABEZADO -->
<table class="header"><tr>
  <td width="60%">
    <img src="${LOGO_URL}" width="80" style="margin-bottom:4px"/><br>
    <b style="font-size:12px">GEAR MOTOR PARTS S.A.C.</b><br>
    <span style="font-size:8px">Direcci\u00f3n fiscal: Coo. Veintisiete de Abril. Av. Nicol\u00e1s Ayll\u00f3n 3270, Ate, Lima</span><br>
    <span style="font-size:8px">Tel.: 01 362 8667 - 924 483 844</span><br>
    <span style="font-size:8px">gearmparts@gmail.com</span>
  </td>
  <td width="40%" style="text-align:right">
    <div class="box" style="display:inline-block;text-align:center;min-width:170px">
      <b style="font-size:11px">R.U.C. 20601720621</b><br><br>
      <b style="font-size:13px">${escape(titulo)}</b><br><br>
      <b style="font-size:11px">N\u00ba ${escape(numDoc)}</b>
    </div>
  </td>
</tr></table>

<!-- DATOS CLIENTE -->
<table style="border:1px solid #000;margin-bottom:10px;padding:6px">
  <tr>
    <td width="17%" class="label">SE\u00d1OR(ES):</td>
    <td width="33%" class="value">${escape(cliente).toUpperCase()}</td>
    <td width="17%" class="label">FECHA EMISI\u00d3N:</td>
    <td width="33%" class="value">${escape(fecha)}</td>
  </tr>
  <tr>
    <td class="label">DIRECCI\u00d3N:</td>
    <td class="value">${escape(direccion).toUpperCase()}</td>
    <td class="label">VENDEDOR:</td>
    <td class="value">${escape(vendedor).toUpperCase()}</td>
  </tr>
  <tr>
    <td class="label">RUC:</td>
    <td class="value">${escape(clienteDoc)}</td>
    <td class="label">ORD. DE COMPRA:</td>
    <td class="value"></td>
  </tr>
  <tr>
    <td class="label">NRO COT:</td>
    <td class="value">${escape(nroCot)}</td>
    <td class="label">COND. DE PAGO:</td>
    <td class="value">${escape(formaPago).toUpperCase()}</td>
  </tr>
  ${observaciones ? `<tr><td class="label">OBSERVA:</td><td class="value" colspan="3">${escape(observaciones)}</td></tr>` : ""}
</table>

<!-- DATOS VEHICULO (si aplica) -->
${(placa || marca || modelo || km) ? `
<table style="border:1px solid #000;margin-bottom:10px;padding:6px">
  <tr>
    <td width="25%" class="label">PLACA:</td>
    <td width="25%" class="value">${escape(placa).toUpperCase()}</td>
    <td width="25%" class="label">MARCA:</td>
    <td width="25%" class="value">${escape(marca).toUpperCase()}</td>
  </tr>
  <tr>
    <td class="label">MODELO:</td>
    <td class="value">${escape(modelo).toUpperCase()}</td>
    <td class="label">KM:</td>
    <td class="value">${escape(km)}</td>
  </tr>
</table>` : ""}

<!-- TABLA ITEMS -->
<table style="border-collapse:collapse;margin-bottom:10px">
  <tr style="background:#e0e0e0">
    <th style="border:1px solid #000;padding:5px;font-size:9px">C\u00d3DIGO</th>
    <th style="border:1px solid #000;padding:5px;font-size:9px">CANT.</th>
    <th style="border:1px solid #000;padding:5px;font-size:9px">DESCRIPCI\u00d3N</th>
    <th style="border:1px solid #000;padding:5px;font-size:9px">P.UNITARIO</th>
    <th style="border:1px solid #000;padding:5px;font-size:9px">IMPORTE</th>
  </tr>
  ${itemsHTML(items)}
</table>

<!-- TOTALES -->
<div class="totals">
  <p>OP. GRAVADA    S/ ${Number(subtotal || 0).toFixed(2)}</p>
  <p>I.G.V. (18%)    S/ ${Number(igv || 0).toFixed(2)}</p>
  <hr>
  <p class="total-bold">IMPORTE TOTAL    S/ ${Number(total || 0).toFixed(2)}</p>
</div>

<!-- FOOTER -->
<table class="footer"><tr>
  <td width="30%">
    <div style="text-align:center">
      <div style="border:1px solid #000;width:80px;height:80px;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:8px">QR</div>
      <span style="font-size:6px">Representaci\u00f3n impresa de la FACTURA ELECTR\u00d3NICA</span><br>
      <span style="font-size:6px">CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL</span>
    </div>
  </td>
  <td width="35%" style="padding-left:10px">
    <b style="font-size:9px">CUENTAS BANCARIAS:</b><br>
    <span class="bank">BCP CTA Soles: 191-2390862-0-19</span><br>
    <span class="bank">BCP CTA CCI: 002-19100239086201950</span><br>
    <span class="bank">BN DETRACCI\u00d3N: 00-066-104419</span>
  </td>
  <td width="35%">
    <b style="font-size:9px">SON:</b><br>
    <span style="font-size:8px">${escape(totalEnLetras(total || 0).toUpperCase())}</span><br>
    ${detraccion ? `<span class="detraccion">DETRACCI\u00d3N 12%: S/ ${detraccion.toFixed(2)}</span><br>
    <span class="detraccion">Neto a pagar: S/ ${(neto || 0).toFixed(2)}</span><br>
    <span style="font-size:6px;font-style:italic">Sujeto a Sistema de Pago Obligaciones Tributarias</span>` : ""}
  </td>
</tr></table>

<div style="text-align:right;margin-top:10px">
  <img src="${ERP_LOGO_URL}" width="60"/>
</div>

</body></html>`;
}

function openPrintWindow(html) {
  const w = window.open("", "_blank", "width=800,height=600");
  if (!w) { alert("Permite ventanas emergentes para imprimir"); return null; }
  w.document.write(html);
  w.document.close();
  return w;
}

export function generarFacturaPDF(opts) {
  return buildHTML(opts);
}

export function generarFacturaCompraPDF(opts) {
  return buildHTML({ ...opts, cliente: opts.proveedor || opts.cliente, clienteDoc: opts.proveedorDoc || opts.clienteDoc });
}

export function generarCotizacionPDF({ recepcion, diagnosticos = [], items }) {
  const allItems = [];
  for (const diag of diagnosticos) {
    const tiempo = Number(diag.horasTrabajo || diag.Tiempo_estimado || 0);
    const precioServ = Number(diag.manoDeObra || diag.precioservicio || 0);
    if (diag.nombreFalla || diag.Nombre_falla) {
      allItems.push({ codigo: "", descripcion: diag.nombreFalla || diag.Nombre_falla || "", cant: tiempo, pu: precioServ, total: precioServ * tiempo });
    }
    const reps = diag.repuestos || diag.Repuestos || [];
    for (const r of reps) {
      allItems.push({
        codigo: r.codigo || "",
        descripcion: r.nombre || r.descripcion || "",
        cant: Number(r.cantidad || 1),
        pu: Number(r.precio || r.precioCompra || 0),
        total: Number(r.cantidad || 1) * Number(r.precio || r.precioCompra || 0),
      });
    }
  }
  const itemsFinal = items && items.length > 0 ? items : allItems;
  return buildHTML({
    items: itemsFinal,
    cliente: recepcion.nombre_cliente || recepcion.Razon_social || "",
    clienteDoc: recepcion.RUCempresa || recepcion.DNI || "",
    fecha: recepcion.fecha_creacion || "",
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

export function descargarPDF(html, filename) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename.replace(".pdf", ".html") : filename + ".html";
  a.click();
  URL.revokeObjectURL(url);
}

export function imprimirPDF(html) {
  const w = openPrintWindow(html);
  if (w) setTimeout(() => w.print(), 500);
}

export function abrirPDF(html) {
  const w = openPrintWindow(html);
}
