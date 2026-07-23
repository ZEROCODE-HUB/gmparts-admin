import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const LOGO_URL = "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/g-m-parts-lac7fg/assets/za03o2h6k5tg/Capa_1.png";
const ERP_LOGO_URL = "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/12345/capa_erp.png";

function totalEnLetras(num) {
  const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  if (num === 0) return "CERO CON 00/100 SOLES";
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  let palabras = "";
  if (entero >= 1000000) { palabras += "UN MILLÓN "; }
  // Simplificado: retorna número + texto fijo para demo
  return `${entero} CON ${decimal.toString().padStart(2, "0")}/100 SOLES`;
}

function encabezadoPDF(titulo, numero) {
  return {
    columns: [
      {
        width: "60%",
        stack: [
          { image: LOGO_URL, width: 80, height: 80, alignment: "left" },
          { text: "GEAR MOTOR PARTS S.A.C.", style: "empresaNombre" },
          { text: "Dirección fiscal: Coo. Veintisiete de Abril. Av. Nicolás Ayllón 3270, Ate, Lima", style: "empresaDetalle" },
          { text: "Tel.: 01 362 8667 - 924 483 844", style: "empresaDetalle" },
          { text: "gearmparts@gmail.com", style: "empresaDetalle" },
        ],
      },
      {
        width: "40%",
        alignment: "right",
        table: {
          widths: ["*"],
          body: [
            [
              {
                text: [
                  { text: "R.U.C. 20601720621\n", style: "ruc" },
                  { text: `${titulo}\n`, style: "tituloDoc" },
                  { text: `Nº ${numero}`, style: "numeroDoc" },
                ],
                alignment: "center",
                margin: [8, 8, 8, 8],
                border: [true, true, true, true],
              },
            ],
          ],
        },
      },
    ],
    margin: [0, 0, 0, 15],
  };
}

function datosCliente(cliente, direccion, ruc, condPago, fecha, vendedor, nroCot, observaciones) {
  const rows = [
    [{ text: "SEÑOR(ES):", style: "label" }, { text: (cliente || "").toUpperCase(), style: "value" }, { text: "FECHA EMISIÓN:", style: "label" }, { text: fecha || "", style: "value" }],
    [{ text: "DIRECCIÓN:", style: "label" }, { text: (direccion || "").toUpperCase(), style: "value" }, { text: "VENDEDOR:", style: "label" }, { text: (vendedor || "").toUpperCase(), style: "value" }],
    [{ text: "RUC:", style: "label" }, { text: ruc || "", style: "value" }, { text: "ORD. DE COMPRA:", style: "label" }, { text: "", style: "value" }],
    [{ text: "NRO COT:", style: "label" }, { text: nroCot || "", style: "value" }, { text: "COND. DE PAGO:", style: "label" }, { text: (condPago || "").toUpperCase(), style: "value" }],
  ];
  if (observaciones) {
    rows.push([{ text: "OBSERVA:", style: "label" }, { text: observaciones, style: "value", colSpan: 3 }, {}, {}]);
  }
  return {
    table: {
      widths: ["17%", "33%", "17%", "33%"],
      body: rows,
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10],
  };
}

function datosVehiculo(placa, marca, modelo, km) {
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

function tablaItems(items, conCodigo = true, conCant = true) {
  const headers = [
    { text: "CÓDIGO", style: "tableHeader" },
    { text: "CANT.", style: "tableHeader", alignment: "center" },
    { text: "DESCRIPCIÓN", style: "tableHeader" },
    { text: "P.UNITARIO", style: "tableHeader", alignment: "right" },
    { text: "IMPORTE", style: "tableHeader", alignment: "right" },
  ];
  const body = [headers];
  for (const it of items) {
    const cant = it.cant ?? it.cantidad ?? 1;
    const pu = it.pu ?? it.precioVenta ?? 0;
    const total = it.total ?? cant * pu;
    body.push([
      { text: it.codigo || "", style: "cell", alignment: "center" },
      { text: String(cant), style: "cell", alignment: "center" },
      { text: (it.descripcion || it.articulo || "").toUpperCase(), style: "cell" },
      { text: `S/ ${Number(pu).toFixed(2)}`, style: "cell", alignment: "right" },
      { text: `S/ ${Number(total).toFixed(2)}`, style: "cell", alignment: "right" },
    ]);
  }
  while (body.length < 12) {
    body.push([{ text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }, { text: "", style: "cell" }]);
  }
  return {
    table: {
      widths: [55, 35, "*", 65, 55],
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
    margin: [0, 0, 0, 10],
  };
}

function totales(subtotal, igv, total) {
  const items = [
    { text: "OP. GRAVADA", alignment: "left" },
    { text: `S/ ${Number(subtotal || 0).toFixed(2)}`, alignment: "right" },
  ];
  return {
    columns: [
      { width: "*", text: "" },
      {
        width: "40%",
        table: {
          widths: ["*"],
          body: [
            [{ text: `OP. GRAVADA    S/ ${Number(subtotal || 0).toFixed(2)}`, style: "totalLine" }],
            [{ text: `I.G.V. (18%)    S/ ${Number(igv || 0).toFixed(2)}`, style: "totalLine" }],
            [{ text: `IMPORTE TOTAL    S/ ${Number(total || 0).toFixed(2)}`, style: "totalBold", margin: [0, 4, 0, 4] }],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 10],
      },
    ],
  };
}

function footerPDF(qrData, totalVal) {
  const detraccion = totalVal > 700 ? totalVal * 0.12 : null;
  const neto = detraccion ? totalVal - detraccion : null;
  return {
    columns: [
      {
        width: "30%",
        stack: [
          { qr: qrData || "SIN DATOS QR", fit: 80, alignment: "center" },
          { text: "Representación impresa de la FACTURA ELECTRÓNICA", fontSize: 6, alignment: "center" },
          { text: "CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL", fontSize: 6, alignment: "center" },
        ],
      },
      {
        width: "35%",
        stack: [
          { text: "CUENTAS BANCARIAS:", style: "label" },
          { text: "BCP CTA Soles: 191-2390862-0-19", style: "bankDetail" },
          { text: "BCP CTA CCI: 002-19100239086201950", style: "bankDetail" },
          { text: "BN DETRACCIÓN: 00-066-104419", style: "bankDetail" },
        ],
        margin: [0, 0, 10, 0],
      },
      {
        width: "35%",
        stack: [
          { text: "SON:", style: "label" },
          { text: totalEnLetras(totalVal || 0).toUpperCase(), fontSize: 8 },
          detraccion ? { text: `DETRACCIÓN 12%: S/ ${detraccion.toFixed(2)}`, style: "detraccion" } : null,
          detraccion ? { text: `Neto a pagar: S/ ${neto.toFixed(2)}`, style: "detraccionBold" } : null,
          detraccion ? { text: "Sujeto a Sistema de Pago Obligaciones Tributarias", fontSize: 6, italics: true } : null,
        ].filter(Boolean),
      },
    ],
    margin: [0, 10, 0, 10],
  };
}

function estiloFactura(titulo) {
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
    bankDetail: { fontSize: 8 },
    detraccion: { fontSize: 8, color: "#CC0000", bold: true },
    detraccionBold: { fontSize: 9, bold: true },
  };
}

// ──────────────────────────────────────────────
// EXPORT: Generar Factura / Boleta (Venta)
// ──────────────────────────────────────────────
export function generarFacturaPDF({ items, cliente, clienteDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, placa, marca, modelo, km, observaciones, titulo = "FACTURA ELECTRÓNICA", vendedor = "VENDEDOR 1" }) {
  const numDoc = `${serie || ""}-${numero || ""}`;
  const qrData = `${cliente || ""}|${numDoc}|${total || 0}`;
  const docDef = {
    pageSize: "A4",
    pageMargins: [20, 20, 20, 20],
    content: [
      encabezadoPDF(titulo, numDoc),
      datosCliente(cliente, direccion || "SIN DIRECCIÓN", clienteDoc || "00000000000", formaPago || "CONTADO", fecha || "", vendedor, "", observaciones),
      datosVehiculo(placa, marca, modelo, km),
      tablaItems(items || []),
      totales(subtotal, igv, total),
      footerPDF(qrData, total || 0),
      { image: ERP_LOGO_URL, width: 60, alignment: "right" },
    ],
    styles: estiloFactura(titulo),
    defaultStyle: { fontName: "Roboto" },
  };
  return docDef;
}

// ──────────────────────────────────────────────
// EXPORT: Generar Factura Compra
// ──────────────────────────────────────────────
export function generarFacturaCompraPDF({ items, proveedor, proveedorDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, observaciones, titulo = "FACTURA ELECTRÓNICA", vendedor = "VENDEDOR 1" }) {
  return generarFacturaPDF({ items, cliente: proveedor, clienteDoc: proveedorDoc, direccion, fecha, formaPago, serie, numero, subtotal, igv, total, placa: "", marca: "", modelo: "", km: "", observaciones, titulo, vendedor });
}

// ──────────────────────────────────────────────
// EXPORT: Generar Cotización de Servicio
// ──────────────────────────────────────────────
export function generarCotizacionPDF({ recepcion, diagnosticos = [], items }) {
  // Construir items desde diagnosticos (FlutterFlow logic)
  const allItems = [];
  let counter = 1;
  for (const diag of diagnosticos) {
    // Mano de obra
    const tiempo = Number(diag.horasTrabajo || diag.Tiempo_estimado || 0);
    const precioServ = Number(diag.manoDeObra || diag.precioservicio || 0);
    if (diag.nombreFalla || diag.Nombre_falla) {
      allItems.push({
        codigo: "",
        descripcion: diag.nombreFalla || diag.Nombre_falla || "",
        cant: tiempo,
        pu: precioServ,
        total: precioServ * tiempo,
        _item: counter++,
      });
    }
    // Repuestos
    const reps = diag.repuestos || diag.Repuestos || [];
    for (const r of reps) {
      const cant = Number(r.cantidad || 1);
      const precio = Number(r.precio || r.precioCompra || 0);
      allItems.push({
        codigo: r.codigo || "",
        descripcion: r.nombre || r.descripcion || "",
        cant,
        pu: precio,
        total: cant * precio,
        _item: counter++,
      });
    }
  }

  // Si llegaron items directos (sin diagnosticos), usarlos
  const itemsFinal = items && items.length > 0 ? items : allItems;

  const numCot = recepcion.codeCT || recepcion.numeroCotizacion || "SIN CODIGO";
  const totalVal = recepcion.Total || recepcion.total || 0;
  const qrData = `${recepcion.nombre_cliente || ""}|${numCot}|${totalVal}`;

  const docDef = {
    pageSize: "A4",
    pageMargins: [20, 20, 20, 20],
    content: [
      // Encabezado
      {
        columns: [
          {
            width: "60%",
            stack: [
              { image: LOGO_URL, width: 100, alignment: "left" },
              { text: "GEAR MOTOR PARTS S.A.C.", style: "empresaNombre" },
              { text: "Dirección fiscal: Av. Nicolás Ayllón Nro. 3270", style: "empresaDetalle" },
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
                    { text: `Cotizacion ${numCot}\n`, style: "tituloDoc" },
                    { text: `FECHA: ${recepcion.fecha_creacion || ""}`, style: "numeroDoc" },
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
      },
      // Datos cliente
      datosCliente(
        recepcion.nombre_cliente || recepcion.Razon_social || "",
        "",
        recepcion.RUCempresa || recepcion.DNI || "",
        recepcion.condpago || "CONTADO",
        recepcion.fecha_creacion || "",
        recepcion.tecnico_servicio || "",
        numCot,
        recepcion.observaciones || recepcion.Observaciones_adicionales || ""
      ),
      // Datos vehiculo
      datosVehiculo(recepcion.placa, recepcion.marca, recepcion.modelo, recepcion.km_ingreso),
      // Tabla de items (con codigo y numero de item)
      {
        table: {
          widths: [30, 50, "*", 40, 40, 50, 50],
          body: [
            [
              { text: "ITEM", style: "tableHeader" },
              { text: "CÓDIGO", style: "tableHeader" },
              { text: "DESCRIPCIÓN", style: "tableHeader" },
              { text: "UNIDAD", style: "tableHeader", alignment: "center" },
              { text: "CANT", style: "tableHeader", alignment: "center" },
              { text: "PRECIO", style: "tableHeader", alignment: "right" },
              { text: "TOTAL", style: "tableHeader", alignment: "right" },
            ],
            ...(itemsFinal.length > 0 ? itemsFinal.map((it, i) => [
              { text: String(i + 1), style: "cell", alignment: "center" },
              { text: it.codigo || it.Codigo || "", style: "cell", alignment: "center" },
              { text: (it.descripcion || it.nombre || it.Nombre_falla || "").toUpperCase(), style: "cell" },
              { text: it._item ? "HRS" : "UND", style: "cell", alignment: "center" },
              { text: String(Number(it.cant || it.cantidad || 1)), style: "cell", alignment: "center" },
              { text: `S/ ${Number(it.pu || it.precio || 0).toFixed(2)}`, style: "cell", alignment: "right" },
              { text: `S/ ${Number(it.total || 0).toFixed(2)}`, style: "cell", alignment: "right" },
            ]) : []),
          ],
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        margin: [0, 0, 0, 10],
      },
      // Totales
      totales(recepcion.Subtotal || recepcion.subtotal || 0, recepcion.IGV || recepcion.igv || 0, totalVal),
      // Condiciones comerciales
      {
        text: [
          { text: "CONDICIONES COMERCIALES\n", style: "label" },
          { text: `FORMA DE PAGO: ${recepcion.condpago || "CONTADO"}\n`, fontSize: 9 },
          { text: `MONEDA: ${recepcion.moneda || "SOLES"}\n`, fontSize: 9 },
          { text: `VALIDEZ OFERTA: ${recepcion.validoferta || "7 DÍAS"}\n`, fontSize: 9 },
          { text: `FECHA DE SERVICIO: ${recepcion.fecha_creacion || ""}`, fontSize: 9 },
        ],
        margin: [0, 0, 0, 10],
      },
      // Total en letras
      { text: `SON: ${totalEnLetras(totalVal)}`, style: "label", margin: [0, 0, 0, 10] },
      // Footer
      footerPDF(qrData, totalVal),
    ],
    styles: estiloFactura("COTIZACIÓN"),
    defaultStyle: { fontName: "Roboto" },
  };
  return docDef;
}

// ──────────────────────────────────────────────
// Helper: descargar o imprimir
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
