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

function formatDateToDDMMYYYY(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }
  if (dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function getNextMonthDueDate() {
  const hoy = new Date();
  const vencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
  return `${vencimiento.getDate().toString().padStart(2, '0')}/${(vencimiento.getMonth() + 1).toString().padStart(2, '0')}/${vencimiento.getFullYear()}`;
}

function borderLayout(hLineWidth, vLineWidth) {
  return {
    hLineWidth: () => hLineWidth,
    vLineWidth: () => vLineWidth,
    hLineColor: () => '#000',
    vLineColor: () => '#000',
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
}

async function buildDocDef(opts) {
  await init();

  const {
    items = [],
    cliente = "CLIENTE GENÉRICO",
    clienteDoc = "00000000000",
    direccion = "SIN DIRECCIÓN",
    fecha = "",
    formaPago = "CONTADO",
    serie = "001",
    numero = "000000",
    subtotal = 0,
    igv = 0,
    total = 0,
    placa = "",
    marca = "",
    modelo = "",
    km = "",
    observaciones = "",
    titulo = "FACTURA ELECTRÓNICA",
    vendedor = "SIN ESPECIFICAR",
    nroCot = "",
    ordenCompra = "",
    totalEnLetras: ttl,
    qrData: qr,
    logoUrl,
    erpLogoUrl,
  } = opts;

  const numDoc = `${serie}-${numero}`;
  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const qrData = qr || `${cliente}|${numDoc}|${total}`;
  const fechaFormatted = formatDateToDDMMYYYY(fecha);
  const fechaVencimientoStr = getNextMonthDueDate();

  const detraccion = total > 700 ? total * 0.12 : null;
  const montoNeto = detraccion ? total - detraccion : null;

  const [logoData, erpData] = await Promise.all([
    urlToDataUrl(logoUrl || LOGO_URL),
    urlToDataUrl(erpLogoUrl || ERP_LOGO_URL),
  ]);

  const content = [];

  // ═══════════════════════════════════════════
  // ENCABEZADO
  // ═══════════════════════════════════════════
  content.push({
    columns: [
      {
        width: '*',
        columns: [
          ...(logoData
            ? [{ image: logoData, width: 80, height: 80, fit: [80, 80] }]
            : [{ text: '', width: 80 }]),
          { width: 10, text: '' },
          {
            width: '*',
            stack: [
              { text: 'GEAR MOTOR PARTS S.A.C.', style: 'empresaNombre' },
              { text: 'Dirección fiscal: Coo. Veintisiete de abril. Av. Nicolás Ayllón 3270, Ate, Lima', style: 'empresaDetalle' },
              { text: 'Asc. Santa Cruz de Vista Alegre - Santa Anita', style: 'empresaDetalle' },
              { text: 'Sucursal: Av. Nicolás Ayllón Nro. 3270 Coo. Vendedores de abril - Ate', style: 'empresaDetalle' },
              { text: 'Tel.: 01 362 8667 - 924 483 844', style: 'empresaDetalle' },
              { text: 'gearmparts@gmail.com', style: 'empresaDetalle' },
            ],
          },
        ],
      },
      {
        width: 180,
        table: {
          widths: ['*'],
          body: [[
            { stack: [
              { text: 'R.U.C. 20601720621', style: 'ruc', alignment: 'center' },
              { text: titulo, style: 'tituloDoc', alignment: 'center', margin: [0, 8, 0, 8] },
              { text: `Nº ${numDoc}`, style: 'numeroDoc', alignment: 'center' },
            ], margin: [10, 10, 10, 10] },
          ]],
        },
        layout: borderLayout(1.5, 1.5),
      },
    ],
    margin: [0, 0, 0, 15],
  });

  // ═══════════════════════════════════════════
  // DATOS CLIENTE
  // ═══════════════════════════════════════════
  const custRows = [];
  custRows.push({ columns: [
    { width: '50%', text: [{ text: 'SEÑOR(ES) : ', bold: true, fontSize: 9 }, { text: cliente.toUpperCase(), fontSize: 9 }] },
    { width: '50%', text: [{ text: 'FECHA EMISIÓN : ', bold: true, fontSize: 9 }, { text: fechaFormatted, fontSize: 9 }] },
  ], margin: [0, 0, 0, 4] });
  custRows.push({ columns: [
    { width: '50%', text: [{ text: 'DIRECCIÓN : ', bold: true, fontSize: 9 }, { text: direccion.toUpperCase(), fontSize: 9 }] },
    { width: '50%', text: [{ text: 'VENDEDOR : ', bold: true, fontSize: 9 }, { text: vendedor.toUpperCase(), fontSize: 9 }] },
  ], margin: [0, 0, 0, 4] });
  custRows.push({ columns: [
    { width: '50%', text: [{ text: 'RUC : ', bold: true, fontSize: 9 }, { text: clienteDoc, fontSize: 9 }] },
    { width: '50%', text: [{ text: 'ORD. DE COMPRA : ', bold: true, fontSize: 9 }, { text: ordenCompra, fontSize: 9 }] },
  ], margin: [0, 0, 0, 4] });
  custRows.push({ columns: [
    { width: '50%', text: [{ text: 'NRO COT : ', bold: true, fontSize: 9 }, { text: nroCot, fontSize: 9 }] },
    { width: '50%', text: [{ text: 'COND. DE PAGO : ', bold: true, fontSize: 9 }, { text: formaPago.toUpperCase(), fontSize: 9 }] },
  ], margin: [0, 0, 0, observaciones ? 4 : 0] });
  if (observaciones) {
    custRows.push({ columns: [
      { width: 'auto', text: [{ text: 'OBSERVA : ', bold: true, fontSize: 9 }] },
      { width: '*', text: observaciones, fontSize: 9 },
    ], margin: [0, 0, 0, 4] });
  }
  custRows.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 10000, y2: 0, lineWidth: 0.5 }], margin: [0, 4, 0, 4] });
  custRows.push({ columns: [
    { width: '25%', text: [{ text: 'PLACA : ', bold: true, fontSize: 9 }, { text: placa.toUpperCase(), fontSize: 9 }] },
    { width: '25%', text: [{ text: 'MARCA : ', bold: true, fontSize: 9 }, { text: marca.toUpperCase(), fontSize: 9 }] },
    { width: '25%', text: [{ text: 'MODELO : ', bold: true, fontSize: 9 }, { text: modelo.toUpperCase(), fontSize: 9 }] },
    { width: '25%', text: [{ text: 'KM : ', bold: true, fontSize: 9 }, { text: km, fontSize: 9 }] },
  ]});

  content.push({
    table: {
      widths: ['*'],
      body: [[{ stack: custRows, margin: [8, 8, 8, 8] }]],
    },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 15],
  });

  // ═══════════════════════════════════════════
  // TABLA DE ITEMS
  // ═══════════════════════════════════════════
  const tblBody = [
    [
      { text: 'CÓDIGO', style: 'tableHeader', alignment: 'center' },
      { text: 'CANT.', style: 'tableHeader', alignment: 'center' },
      { text: 'UNID.', style: 'tableHeader', alignment: 'center' },
      { text: 'DESCRIPCIÓN', style: 'tableHeader', alignment: 'center' },
      { text: 'P.UNITARIO', style: 'tableHeader', alignment: 'center' },
      { text: 'IMPORTE', style: 'tableHeader', alignment: 'center' },
    ],
  ];
  for (const it of items) {
    const c = it.cant ?? it.cantidad ?? 1;
    const p = it.pu ?? it.precioVenta ?? 0;
    const t = it.total ?? c * p;
    tblBody.push([
      { text: it.codigo || '', style: 'cell', alignment: 'center' },
      { text: String(c), style: 'cell', alignment: 'center' },
      { text: 'UND', style: 'cell', alignment: 'center' },
      { text: (it.descripcion || it.articulo || '').toUpperCase(), style: 'cell' },
      { text: Number(p).toFixed(2), style: 'cell', alignment: 'right' },
      { text: Number(t).toFixed(2), style: 'cell', alignment: 'right' },
    ]);
  }
  while (tblBody.length < 11) {
    tblBody.push([
      { text: '', style: 'cell' },
      { text: '', style: 'cell' },
      { text: '', style: 'cell' },
      { text: '', style: 'cell' },
      { text: '', style: 'cell' },
      { text: '', style: 'cell' },
    ]);
  }

  content.push({
    table: {
      widths: [55, 30, 30, '*', 65, 55],
      body: tblBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#000',
      vLineColor: () => '#000',
      fillColor: (rowIndex) => rowIndex === 0 ? '#EEEEEE' : null,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 8],
  });

  // ═══════════════════════════════════════════
  // TOTAL EN LETRAS
  // ═══════════════════════════════════════════
  content.push({
    columns: [
      { width: 'auto', text: 'SON: ', style: 'label' },
      { width: '*', text: totalEnLetrasVal.toUpperCase(), style: 'value' },
    ],
    margin: [5, 0, 5, 10],
  });

  // ═══════════════════════════════════════════
  // FOOTER (QR, CUENTAS, TOTALES)
  // ═══════════════════════════════════════════
  const totalsStack = [
    { columns: [
      { width: '*', text: 'OP. GRAVADA', style: 'totalLine' },
      { width: 'auto', text: `S/ ${Number(subtotal).toFixed(2)}`, style: 'totalLine', alignment: 'right' },
    ]},
    { columns: [
      { width: '*', text: 'I.G.V. (18%)', style: 'totalLine' },
      { width: 'auto', text: `S/ ${Number(igv).toFixed(2)}`, style: 'totalLine', alignment: 'right' },
    ]},
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 10000, y2: 0, lineWidth: 0.5 }], margin: [0, 4, 0, 4] },
    { columns: [
      { width: '*', text: 'IMPORTE TOTAL', style: 'totalBold' },
      { width: 'auto', text: `S/ ${Number(total).toFixed(2)}`, style: 'totalBold', alignment: 'right' },
    ]},
  ];

  if (detraccion != null) {
    totalsStack.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 10000, y2: 0, lineWidth: 0.5 }], margin: [0, 4, 0, 4] });
    totalsStack.push({
      background: '#F5F5F5',
      stack: [
        { text: 'DETRACCIÓN 12%', style: 'detraccion' },
        { columns: [
          { width: '*', text: 'Base:', style: 'detraccionDetail' },
          { width: 'auto', text: `S/ ${Number(total).toFixed(2)}`, style: 'detraccionDetail', alignment: 'right' },
        ]},
        { columns: [
          { width: '*', text: 'Monto:', style: 'detraccionDetail' },
          { width: 'auto', text: `S/ ${Number(detraccion).toFixed(2)}`, style: 'detraccionDetail', alignment: 'right' },
        ]},
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 10000, y2: 0, lineWidth: 0.5 }], margin: [0, 2, 0, 2] },
        { columns: [
          { width: '*', text: 'Neto a pagar:', style: 'detraccionBold' },
          { width: 'auto', text: `S/ ${Number(montoNeto).toFixed(2)}`, style: 'detraccionBold', alignment: 'right' },
        ]},
        { text: 'Sujeto a Sistema de Pago Obligaciones Tributarias', fontSize: 6, margin: [0, 4, 0, 0] },
      ],
      margin: [4, 4, 4, 4],
    });
  }

  content.push({
    columns: [
      {
        width: 'auto',
        stack: [
          { qr: qrData, fit: 90, alignment: 'center' },
          { text: 'Representación impresa de la FACTURA ELECTRÓNICA', fontSize: 6, alignment: 'left', width: 150, margin: [0, 4, 0, 0] },
          { text: 'CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL', fontSize: 6, alignment: 'left', width: 150 },
          { text: 'gearmparts@gmail.com', fontSize: 6, alignment: 'left', width: 150 },
        ],
      },
      {
        width: '*',
        stack: [
          {
            table: {
              widths: ['*'],
              body: [[
                { stack: [
                  { text: 'BCP CTA Soles: 191-2390862-0-19', fontSize: 8 },
                  { text: 'BCP CTA CCI: 002-19100239086201950', fontSize: 8 },
                  { text: 'BN DETRACCIÓN: 00-066-104419', fontSize: 8 },
                ], margin: [6, 6, 6, 6] },
              ]],
            },
            layout: borderLayout(0.5, 0.5),
          },
          { text: 'FECHA DE VENCIMIENTO:', style: 'label', margin: [4, 8, 0, 0] },
          { text: fechaVencimientoStr, fontSize: 10, bold: true, color: '#CC0000', margin: [4, 0, 0, 0] },
        ],
        margin: [0, 0, 10, 0],
      },
      {
        width: 180,
        stack: totalsStack,
        margin: [0, 0, 0, 0],
      },
    ],
    margin: [0, 0, 0, 10],
  });

  // ═══════════════════════════════════════════
  // LOGO ERP
  // ═══════════════════════════════════════════
  if (erpData) {
    content.push({
      image: erpData,
      width: 80,
      height: 35,
      fit: [80, 35],
      alignment: 'right',
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20],
    content,
    styles: {
      empresaNombre: { fontSize: 12, bold: true },
      empresaDetalle: { fontSize: 8 },
      ruc: { fontSize: 11, bold: true },
      tituloDoc: { fontSize: 13, bold: true },
      numeroDoc: { fontSize: 11, bold: true },
      label: { fontSize: 9, bold: true },
      value: { fontSize: 9 },
      tableHeader: { fontSize: 9, bold: true, alignment: 'center', margin: [5, 5, 5, 5] },
      cell: { fontSize: 8, margin: [4, 3, 4, 3] },
      totalLine: { fontSize: 9, margin: [3, 2, 3, 2] },
      totalBold: { fontSize: 10, bold: true, margin: [3, 2, 3, 2] },
      detraccion: { fontSize: 9, bold: true, color: '#CC0000', margin: [0, 0, 0, 4] },
      detraccionDetail: { fontSize: 8 },
      detraccionBold: { fontSize: 9, bold: true },
    },
    defaultStyle: { fontName: 'Roboto' },
  };
}

export async function descargarPDF(opts, filename) {
  if (!filename.endsWith('.pdf')) filename += '.pdf';
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
    cliente: data.cliente || data.razonSNombre || data.nombre_cliente || data.Razon_social || '',
    clienteDoc: data.clienteDoc || data.RUCempresa || data.DNI || '',
    direccion: data.direccion || '',
    fecha: data.fecha || data.Fecha || data.fecha_creacion || '',
    formaPago: data.formaPago || data.FPago || 'CONTADO',
    serie: data.serie || data.nserie || data.Nserie || '',
    numero: data.numero || data.NumCotizacion || '',
    subtotal: data.subtotal || 0,
    igv: data.igv || 0,
    total: data.total || data.Total || 0,
    placa: data.placa || '',
    marca: data.marca || '',
    modelo: data.modelo || '',
    km: data.km_ingreso || '',
    observaciones: data.observacion || data.motivo || '',
    titulo: title || 'FACTURA ELECTRÓNICA',
    vendedor: data.vendedor || data.Vendedor || 'VENDEDOR 1',
    nroCot: data.nroCot || data.NroCot || data.NumCotizacion || '',
    ordenCompra: data.ordenCompra || data.orden_compra || '',
    totalEnLetras: data.totalEnLetras || data.TotalEnLetras || '',
    qrData: data.qrData || data.QrData || '',
    logoUrl: data.logoUrl || data.LogoUrl || '',
    erpLogoUrl: data.erpLogoUrl || data.ErpLogoUrl || '',
  };
}
