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

const LOGO_URL = "/logofinal.png";
const ERP_LOGO_URL = "/logofinal.png";

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

function getNextMonthDueDate(fromDate) {
  let base;
  if (fromDate) {
    if (fromDate.includes('/')) {
      const p = fromDate.split('/');
      base = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    } else {
      base = new Date(fromDate);
    }
  } else {
    base = new Date();
  }
  if (isNaN(base.getTime())) base = new Date();
  const v = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
  return `${v.getDate().toString().padStart(2, '0')}/${(v.getMonth() + 1).toString().padStart(2, '0')}/${v.getFullYear()}`;
}

function borderLayout(hw, vw) {
  return {
    hLineWidth: () => hw,
    vLineWidth: () => vw,
    hLineColor: () => '#000',
    vLineColor: () => '#000',
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
}

const S = {
  empresaNombre: { fontSize: 12, bold: true },
  empresaDetalle: { fontSize: 8 },
  ruc: { fontSize: 11, bold: true },
  tituloDoc: { fontSize: 13, bold: true },
  numeroDoc: { fontSize: 11, bold: true },
  label: { fontSize: 9, bold: true },
  value: { fontSize: 9 },
  label10: { fontSize: 10, bold: true },
  value10: { fontSize: 10 },
  tableHeader: { fontSize: 9, bold: true, alignment: 'center', margin: [5, 5, 5, 5] },
  cell: { fontSize: 8, margin: [4, 3, 4, 3] },
  totalLine: { fontSize: 9, margin: [3, 2, 3, 2] },
  totalBold: { fontSize: 10, bold: true, margin: [3, 2, 3, 2] },
  detraccion: { fontSize: 9, bold: true, color: '#CC0000', margin: [0, 0, 0, 4] },
  detraccionDetail: { fontSize: 8 },
  detraccionBold: { fontSize: 9, bold: true },
};

async function buildDocDefFactura(opts) {
  await init();

  const {
    items = [], cliente = "CLIENTE GENÉRICO", clienteDoc = "00000000000",
    direccion = "SIN DIRECCIÓN", fecha = "", formaPago = "CONTADO",
    serie = "001", numero = "000000", subtotal = 0, igv = 0, total = 0,
    placa = "", marca = "", modelo = "", km = "", observaciones = "",
    titulo = "FACTURA ELECTRÓNICA", vendedor = "SIN ESPECIFICAR",
    nroCot = "", ordenCompra = "", totalEnLetras: ttl, qrData: qr,
    logoUrl, erpLogoUrl,
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

  content.push({
    columns: [
      {
        width: '*',
        columns: [
          ...(logoData ? [{ image: logoData, width: 80, height: 80, fit: [80, 80] }] : [{ text: '', width: 80 }]),
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

  const custRows = [
    { columns: [
      { width: '50%', text: [{ text: 'SEÑOR (ES) : ', bold: true, fontSize: 9 }, { text: cliente.toUpperCase(), fontSize: 9 }] },
      { width: '50%', text: [{ text: 'FECHA EMISIÓN : ', bold: true, fontSize: 9 }, { text: fechaFormatted, fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'DIRECCIÓN : ', bold: true, fontSize: 9 }, { text: direccion.toUpperCase(), fontSize: 9 }] },
      { width: '50%', text: [{ text: 'VENDEDOR : ', bold: true, fontSize: 9 }, { text: vendedor.toUpperCase(), fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'RUC : ', bold: true, fontSize: 9 }, { text: clienteDoc, fontSize: 9 }] },
      { width: '50%', text: [{ text: 'ORD. DE COMPRA : ', bold: true, fontSize: 9 }, { text: ordenCompra, fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'NRO COT : ', bold: true, fontSize: 9 }, { text: nroCot, fontSize: 9 }] },
      { width: '50%', text: [{ text: 'COND. DE PAGO : ', bold: true, fontSize: 9 }, { text: formaPago.toUpperCase(), fontSize: 9 }] },
    ], margin: [0, 0, 0, observaciones ? 4 : 0] },
  ];
  if (observaciones) {
    custRows.push({ columns: [
      { width: 'auto', text: [{ text: 'OBSERVA : ', bold: true, fontSize: 9 }] },
      { width: '*', text: observaciones.toUpperCase(), fontSize: 9 },
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
    table: { widths: ['*'], body: [[{ stack: custRows, margin: [8, 8, 8, 8] }]] },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 15],
  });

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
      { text: it.unidad || 'UND', style: 'cell', alignment: 'center' },
      { text: (it.descripcion || it.articulo || '').toUpperCase(), style: 'cell' },
      { text: Number(p).toFixed(2), style: 'cell', alignment: 'right' },
      { text: Number(t).toFixed(2), style: 'cell', alignment: 'right' },
    ]);
  }
  while (tblBody.length < 11) {
    tblBody.push([
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
    ]);
  }

  content.push({
    table: { widths: [60, 40, 40, '*', 80, 60], body: tblBody },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => '#000', vLineColor: () => '#000',
      fillColor: (ri) => ri === 0 ? '#EEEEEE' : null,
      paddingLeft: () => 4, paddingRight: () => 4,
      paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 8],
  });

  content.push({
    columns: [
      { width: 'auto', text: 'SON: ', style: 'label' },
      { width: '*', text: totalEnLetrasVal.toUpperCase(), style: 'value' },
    ],
    margin: [5, 0, 5, 10],
  });

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
            table: { widths: ['*'], body: [[
              { stack: [
                { text: 'BCP CTA Soles: 191-2390862-0-19', fontSize: 8 },
                { text: 'BCP CTA CCI: 002-19100239086201950', fontSize: 8 },
                { text: 'BN DETRACCIÓN: 00-066-104419', fontSize: 8 },
              ], margin: [6, 6, 6, 6] },
            ]]},
            layout: borderLayout(0.5, 0.5),
          },
          { text: 'FECHA DE VENCIMIENTO:', style: 'label', margin: [4, 8, 0, 0] },
          { text: fechaVencimientoStr, fontSize: 10, bold: true, color: '#CC0000', margin: [4, 0, 0, 0] },
        ],
        margin: [0, 0, 10, 0],
      },
      { width: 180, stack: totalsStack },
    ],
    margin: [0, 0, 0, 10],
  });

  if (erpData) {
    content.push({ image: erpData, width: 80, height: 35, fit: [80, 35], alignment: 'right' });
  }

  return { pageSize: 'A4', pageMargins: [20, 20, 20, 20], content, styles: S, defaultStyle: { fontName: 'Roboto' } };
}

async function buildDocDefCompra(opts) {
  await init();

  const {
    items = [], cliente = "PROVEEDOR GENÉRICO", clienteDoc = "00000000000",
    direccion = "SIN DIRECCIÓN", fecha = "", formaPago = "CONTADO",
    serie = "001", numero = "000000", subtotal = 0, igv = 0, total = 0,
    observaciones = "", titulo = "COMPROBANTE", vendedor = "SIN ESPECIFICAR",
    nroCot = "", ordenCompra = "", totalEnLetras: ttl, qrData: qr,
    logoUrl, erpLogoUrl,
  } = opts;

  const numDoc = `${serie}-${numero}`;
  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const qrData = qr || `${cliente}|${numDoc}|${total}`;
  const fechaFormatted = formatDateToDDMMYYYY(fecha);
  const [logoData, erpData] = await Promise.all([
    urlToDataUrl(logoUrl || LOGO_URL),
    urlToDataUrl(erpLogoUrl || ERP_LOGO_URL),
  ]);

  function rep(s) { return (s || '').replace(/Ñ/g, 'N'); }

  const content = [];

  content.push({
    columns: [
      {
        width: '*',
        columns: [
          ...(logoData ? [{ image: logoData, width: 80, height: 80, fit: [80, 80] }] : [{ text: '', width: 80 }]),
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
        table: { widths: ['*'], body: [[
          { stack: [
            { text: 'R.U.C. 20601720621', style: 'ruc', alignment: 'center' },
            { text: rep(titulo), style: 'tituloDoc', alignment: 'center', margin: [0, 8, 0, 8] },
            { text: `Nº ${numDoc}`, style: 'numeroDoc', alignment: 'center' },
          ], margin: [10, 10, 10, 10] },
        ]]},
        layout: borderLayout(1.5, 1.5),
      },
    ],
    margin: [0, 0, 0, 15],
  });

  const custRows = [
    { columns: [
      { width: '50%', text: [{ text: 'PROVEEDOR : ', bold: true, fontSize: 9 }, { text: rep(cliente.toUpperCase()), fontSize: 9 }] },
      { width: '50%', text: [{ text: 'FECHA EMISIÓN : ', bold: true, fontSize: 9 }, { text: fechaFormatted, fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'DIRECCIÓN : ', bold: true, fontSize: 9 }, { text: rep(direccion.toUpperCase()), fontSize: 9 }] },
      { width: '50%', text: [{ text: 'VENDEDOR : ', bold: true, fontSize: 9 }, { text: rep(vendedor.toUpperCase()), fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'RUC : ', bold: true, fontSize: 9 }, { text: clienteDoc, fontSize: 9 }] },
      { width: '50%', text: [{ text: 'ORD. DE COMPRA : ', bold: true, fontSize: 9 }, { text: ordenCompra, fontSize: 9 }] },
    ], margin: [0, 0, 0, 4] },
    { columns: [
      { width: '50%', text: [{ text: 'NRO COT : ', bold: true, fontSize: 9 }, { text: nroCot, fontSize: 9 }] },
      { width: '50%', text: [{ text: 'COND. DE PAGO : ', bold: true, fontSize: 9 }, { text: rep(formaPago.toUpperCase()), fontSize: 9 }] },
    ], margin: [0, 0, 0, 0] },
  ];
  custRows.push({ columns: [
    { width: 'auto', text: [{ text: 'OBSERVACIONES : ', bold: true, fontSize: 9 }] },
    { width: '*', text: rep((observaciones || '').toUpperCase()), fontSize: 9 },
  ]});

  content.push({
    table: { widths: ['*'], body: [[{ stack: custRows, margin: [8, 8, 8, 8] }]] },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 15],
  });

  const tblBody = [
    [
      { text: 'CÓDIGO', style: 'tableHeader', alignment: 'center' },
      { text: 'CANT.', style: 'tableHeader', alignment: 'center' },
      { text: 'UNID.', style: 'tableHeader', alignment: 'center' },
      { text: 'DESCRIPCIÓN', style: 'tableHeader', alignment: 'center' },
      { text: 'P. UNIT.', style: 'tableHeader', alignment: 'center' },
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
      { text: 'HORAS', style: 'cell', alignment: 'center' },
      { text: rep((it.descripcion || it.articulo || '').toUpperCase()), style: 'cell' },
      { text: Number(p).toFixed(2), style: 'cell', alignment: 'right' },
      { text: Number(t).toFixed(2), style: 'cell', alignment: 'right' },
    ]);
  }

  content.push({
    table: { widths: [60, 40, 40, '*', 80, 60], body: tblBody },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => '#000', vLineColor: () => '#000',
      fillColor: (ri) => ri === 0 ? '#EEEEEE' : null,
      paddingLeft: () => 4, paddingRight: () => 4,
      paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 8],
  });

  content.push({
    columns: [
      { width: 'auto', text: 'SON: ', style: 'label' },
      { width: '*', text: rep(totalEnLetrasVal.toUpperCase()), style: 'value' },
    ],
    margin: [5, 0, 5, 10],
  });

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
        table: { widths: ['*'], body: [[
          { stack: [
            { text: 'BCP CTA Soles: 191-2390862-0-19', fontSize: 8 },
            { text: 'BCP CTA CCI: 002-19100239086201950', fontSize: 8 },
            { text: 'BN DETRACCIÓN: 00-066-104419', fontSize: 8 },
          ], margin: [6, 6, 6, 6] },
        ]]},
        layout: borderLayout(0.5, 0.5),
        margin: [0, 0, 10, 0],
      },
      {
        width: 150,
        table: { widths: ['*'], body: [[
          { stack: [
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
          ], margin: [8, 8, 8, 8] },
        ]]},
        layout: borderLayout(0.5, 0.5),
      },
    ],
    margin: [0, 0, 0, 10],
  });

  if (erpData) {
    content.push({ image: erpData, width: 80, height: 35, fit: [80, 35], alignment: 'right' });
  }

  return { pageSize: 'A4', pageMargins: [20, 20, 20, 20], content, styles: S, defaultStyle: { fontName: 'Roboto' } };
}

async function buildDocDefCotizacion(opts) {
  await init();

  const {
    items = [], cliente = "", clienteDoc = "", direccion = "",
    fecha = "", formaPago = "CONTADO", serie = "", numero = "",
    subtotal = 0, igv = 0, total = 0,
    placa = "", marca = "", modelo = "", km = "",
    observaciones = "", titulo = "COTIZACIÓN",
    vendedor = "SIN ESPECIFICAR", nroCot = "", ordenCompra = "",
    totalEnLetras: ttl, qrData: qr, logoUrl, erpLogoUrl,
    contactoComercial = "", telefonoContactoComercial = "",
    personaContacto = "", telefonoPersonaContacto = "",
    email = "", referencia = "",
    color = "", combustible = "", kilometraje = "", anioFabricacion = "",
    moneda = "SOLES", lugarServicio = "", plazoEntrega = "",
    validezOferta = "", fechaServicio = "", tipoServicio = "",
    numeroOrden = "", natural = true, razonSocial = "",
  } = opts;

  const numDoc = `${serie}-${numero}`;
  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const fechaFormatted = formatDateToDDMMYYYY(fecha || fechaServicio);
  const fechaVencimientoStr = getNextMonthDueDate(fechaServicio || fecha);
  const etiquetaId = natural ? 'DNI' : 'RUC';
  const etiquetaNombre = natural ? 'NOMBRE COMPLETO' : 'RAZÓN SOCIAL';
  const nombreCliente = razonSocial || cliente;

  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);

  const content = [];

  content.push({
    columns: [
      logoData ? { image: logoData, width: 120, height: 80, fit: [120, 80], margin: [0, 0, 10, 0] } : { text: '', width: 130 },
      {
        width: '*',
        stack: [
          { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 14, bold: true },
          { text: 'Dirección fiscal: Av. Nicolás Ayllón Nro. 3270', fontSize: 8, margin: [0, 3, 0, 0] },
          { text: 'Sucursal: Av. Nicolás Ayllón Nro. 3270', fontSize: 8 },
          { text: 'Tel.: 01 362 8667 - 924 483 844', fontSize: 8 },
          { text: 'gearmparts@gmail.com', fontSize: 8 },
        ],
      },
      {
        width: 'auto',
        table: { widths: ['*'], body: [[
          { stack: [
            { text: 'R.U.C. 20601720621', fontSize: 10, bold: true, alignment: 'center' },
            { text: `Cotizacion ${numero || nroCot}`, fontSize: 12, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
            { text: `FECHA: ${fechaFormatted}`, fontSize: 10, bold: true, alignment: 'center' },
          ], margin: [8, 8, 8, 8] },
        ]]},
        layout: borderLayout(1, 1),
      },
    ],
    margin: [0, 0, 0, 10],
  });

  const infoRows = [
    { columns: [
      { width: '60%', text: [{ text: `${etiquetaNombre} : `, style: 'label10' }, { text: nombreCliente, style: 'value10' }] },
      { width: '40%', text: [{ text: 'CONTACTO COMERCIAL : ', style: 'label10' }, { text: contactoComercial, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] },
  ];
  if (clienteDoc) {
    infoRows.push({ columns: [
      { width: '60%', text: [{ text: `${etiquetaId} : `, style: 'label10' }, { text: clienteDoc, style: 'value10' }] },
      { width: '40%', text: [{ text: 'TELÉFONO : ', style: 'label10' }, { text: telefonoContactoComercial, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] });
  } else {
    infoRows.push({ columns: [
      { width: '60%', text: '' },
      { width: '40%', text: [{ text: 'TELÉFONO : ', style: 'label10' }, { text: telefonoContactoComercial, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] });
  }
  infoRows.push({ columns: [
    { width: '60%', text: [{ text: 'PERSONA CONTACTO : ', style: 'label10' }, { text: personaContacto, style: 'value10' }] },
    { width: '40%', text: [{ text: 'E-MAIL : ', style: 'label10' }, { text: telefonoPersonaContacto, style: 'value10' }] },
  ], margin: [0, 0, 0, 2] });
  infoRows.push({ text: [{ text: 'E-MAIL : ', style: 'label10' }, { text: email || '', style: 'value10' }], margin: [0, 0, 0, 2] });
  if (referencia) {
    infoRows.push({ text: [{ text: 'REFERENCIA : ', style: 'label10' }, { text: referencia, style: 'value10' }] });
  }

  content.push({
    table: { widths: ['*'], body: [[{ stack: infoRows, margin: [6, 6, 6, 6] }]] },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 10],
  });

  content.push({
    table: { widths: ['*'], body: [[
      { stack: [
        {
          table: { widths: ['*'], body: [[
            { text: 'DATOS DEL VEHÍCULO', fontSize: 10, bold: true, alignment: 'center', margin: [0, 5, 0, 5], background: '#E0E0E0' },
          ]]},
          layout: 'noBorders',
        },
        { columns: [
          { width: '*', text: [{ text: 'PLACA : ', bold: true, fontSize: 10 }, { text: placa, fontSize: 10 }] },
          { width: '*', text: [{ text: 'MARCA : ', bold: true, fontSize: 10 }, { text: marca, fontSize: 10 }] },
          { width: '*', text: [{ text: 'MODELO : ', bold: true, fontSize: 10 }, { text: modelo, fontSize: 10 }] },
        ], margin: [5, 5, 5, 3] },
        { columns: [
          { width: '*', text: [{ text: 'COLOR : ', bold: true, fontSize: 10 }, { text: color, fontSize: 10 }] },
          { width: '*', text: [{ text: 'COMBUSTIBLE : ', bold: true, fontSize: 10 }, { text: combustible, fontSize: 10 }] },
          { width: '*', text: [{ text: 'KILOMETRAJE : ', bold: true, fontSize: 10 }, { text: kilometraje, fontSize: 10 }] },
        ], margin: [5, 0, 5, 3] },
        { text: [{ text: 'AÑO DE FABRICACIÓN : ', bold: true, fontSize: 10 }, { text: anioFabricacion, fontSize: 10 }], margin: [5, 0, 5, 5] },
      ]},
    ]]},
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 10],
  });

  content.push({
    table: { widths: ['*'], body: [[
      { stack: [
        {
          table: { widths: ['*'], body: [[
            { text: 'CONDICIONES COMERCIALES', fontSize: 10, bold: true, alignment: 'center', margin: [0, 5, 0, 5], background: '#E0E0E0' },
          ]]},
          layout: 'noBorders',
        },
        { text: [{ text: 'FORMA DE PAGO : ', bold: true, fontSize: 10 }, { text: formaPago, fontSize: 10 }], margin: [5, 5, 5, 3] },
        { text: [{ text: 'MONEDA : ', bold: true, fontSize: 10 }, { text: moneda, fontSize: 10 }], margin: [5, 0, 5, 3] },
        { text: [{ text: 'LUGAR DE SERVICIO : ', bold: true, fontSize: 10 }, { text: lugarServicio, fontSize: 10 }], margin: [5, 0, 5, 3] },
        { text: [{ text: 'PLAZO DE ENTREGA : ', bold: true, fontSize: 10 }, { text: plazoEntrega, fontSize: 10 }], margin: [5, 0, 5, 3] },
        { text: [{ text: 'VALIDEZ DE LA OFERTA : ', bold: true, fontSize: 10 }, { text: validezOferta, fontSize: 10 }], margin: [5, 0, 5, 5] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 10000, y2: 0, lineWidth: 1 }] },
        { text: [{ text: 'FECHA DE SERVICIO : ', bold: true, fontSize: 10 }, { text: fechaServicio || fechaFormatted, fontSize: 10 }], margin: [5, 5, 5, 3] },
        { columns: [
          { width: '*', text: [{ text: 'TIPO DE SERVICIO : ', bold: true, fontSize: 10 }, { text: tipoServicio, fontSize: 10 }] },
          { width: 'auto', text: [{ text: 'N° OR : ', bold: true, fontSize: 10 }, { text: numeroOrden, fontSize: 10 }], alignment: 'right' },
        ], margin: [5, 0, 5, 5] },
      ]},
    ]]},
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 10],
  });

  const tblBody = [
    [
      { text: 'ITEM', style: 'tableHeader10', alignment: 'center' },
      { text: 'CODIGO', style: 'tableHeader10', alignment: 'center' },
      { text: 'DESCRIPCIÓN', style: 'tableHeader10', alignment: 'center' },
      { text: 'UNIDAD', style: 'tableHeader10', alignment: 'center' },
      { text: 'CANT', style: 'tableHeader10', alignment: 'center' },
      { text: 'PRECIO', style: 'tableHeader10', alignment: 'center' },
      { text: 'TOTAL', style: 'tableHeader10', alignment: 'center' },
    ],
  ];
  let itemIdx = 1;
  for (const it of items) {
    const c = it.cant ?? it.cantidad ?? 1;
    const p = it.pu ?? it.precio ?? it.precioVenta ?? 0;
    const t = it.total ?? c * p;
    const unidad = it.unidad || (it.tipo === 'servicio' || it.tipo === 'mano_obra' ? 'HRS' : 'UND');
    tblBody.push([
      { text: String(itemIdx++), style: 'cell10', alignment: 'center' },
      { text: it.codigo || '', style: 'cell10' },
      { text: (it.descripcion || it.articulo || '').toUpperCase(), style: 'cell10' },
      { text: unidad, style: 'cell10', alignment: 'center' },
      { text: String(c), style: 'cell10', alignment: 'center' },
      { text: `S/ ${Number(p).toFixed(2)}`, style: 'cell10', alignment: 'right' },
      { text: `S/ ${Number(t).toFixed(2)}`, style: 'cell10', alignment: 'right' },
    ]);
  }

  content.push({
    table: { widths: [30, 55, '*', 45, 35, 55, 55], body: tblBody },
    layout: {
      hLineWidth: () => 1, vLineWidth: () => 1,
      hLineColor: () => '#000', vLineColor: () => '#000',
      fillColor: (ri) => ri === 0 ? '#E0E0E0' : null,
      paddingLeft: () => 4, paddingRight: () => 4,
      paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 10],
  });

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 'auto',
        stack: [
          { text: `SUB TOTAL       S/ ${Number(subtotal).toFixed(2)}`, fontSize: 10, margin: [0, 0, 0, 2] },
          { text: `I.G.V. (18%)   S/ ${Number(igv).toFixed(2)}`, fontSize: 10, margin: [0, 0, 0, 2] },
          { text: `IMP. TOTAL   S/ ${Number(total).toFixed(2)}`, fontSize: 10, bold: true },
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 10],
  });

  content.push(
    { text: `SON: ${totalEnLetrasVal}`, bold: true, fontSize: 10, margin: [0, 0, 0, 5] },
    { text: 'OBS :', bold: true, fontSize: 10, margin: [0, 0, 0, 5] },
    { text: 'Esta cotización no incluye repuestos adicionales que se puedan presentar en el transcurso del servicio.', fontSize: 10, margin: [0, 0, 0, 3] },
    { text: 'Sin otro particular y a la espera de su orden de servicio nos despedimos.', fontSize: 10, margin: [0, 0, 0, 10] },
    { text: 'Atentamente,', fontSize: 10, margin: [0, 0, 0, 10] },
  );

  content.push({
    columns: [
      {
        width: 180,
        table: { widths: ['*'], body: [[
          { stack: [
            { text: 'CUENTAS BANCARIAS:', bold: true, fontSize: 10, margin: [0, 0, 0, 5] },
            { text: 'BCP CTA. CTE. SOLES :', fontSize: 10 },
            { text: '  191-2390862-0-19', fontSize: 10, margin: [0, 0, 0, 3] },
            { text: 'BCP CTA. CCI. SOLES :', fontSize: 10 },
            { text: '  002-19100239086201950', fontSize: 10, margin: [0, 0, 0, 3] },
            { text: 'BN DETRACCIÓN SOLES :', fontSize: 10 },
            { text: '  00-066-104419', fontSize: 10 },
          ], margin: [5, 5, 5, 5] },
        ]]},
        layout: borderLayout(1, 1),
      },
      { width: 20, text: '' },
      {
        width: 150,
        table: { widths: ['*'], body: [[
          { stack: [
            { text: 'FECHA DE VENCIMIENTO:', fontSize: 10, bold: true, color: '#CC0000', alignment: 'center' },
            { text: fechaVencimientoStr, fontSize: 14, bold: true, color: '#CC0000', alignment: 'center', margin: [0, 8, 0, 5] },
          ], margin: [8, 8, 8, 8] },
        ]]},
        layout: borderLayout(1, 1),
      },
    ],
    margin: [0, 0, 0, 0],
  });

  return {
    pageSize: 'A4', pageMargins: [20, 20, 20, 20], content,
    styles: { ...S, tableHeader10: { fontSize: 10, bold: true, alignment: 'center', margin: [4, 4, 4, 4] }, cell10: { fontSize: 10, margin: [3, 2, 3, 2] } },
    defaultStyle: { fontName: 'Roboto' },
  };
}

async function buildDocDefOrden(opts) {
  await init();

  const {
    items = [], cliente = "", clienteDoc = "",
    fecha = "", serie = "", numero = "",
    placa = "", marca = "", modelo = "", km = "",
    observaciones = "", titulo = "ORDEN DE TRABAJO",
    vendedor = "SIN ESPECIFICAR", nroCot = "",
    logoUrl,
    contactoComercial = "", telefono = "", email = "",
    color = "", combustible = "", kilometraje = "", anioFabricacion = "",
    razonSocial = "", numeroOrden = "",
  } = opts;

  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);
  const ruc = clienteDoc || "20601720621";
  const numCotizacion = numero || nroCot || numeroOrden;

  const itemsAgrupados = {};
  for (const it of items) {
    const key = it.descripcion || it.articulo || '';
    const codigo = it.codigo || '';
    if (itemsAgrupados[key]) {
      itemsAgrupados[key].cantidad += 1;
    } else {
      itemsAgrupados[key] = { cantidad: 1, codigo, descripcion: key };
    }
  }

  const content = [];

  content.push({
    columns: [
      logoData ? { image: logoData, width: 120, height: 80, fit: [120, 80], margin: [0, 0, 10, 0] } : { text: '', width: 130 },
      {
        width: '*',
        stack: [
          { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 14, bold: true },
          { text: 'Dirección fiscal: Av. Nicolás Ayllón Nro. 3270', fontSize: 8, margin: [0, 3, 0, 0] },
          { text: 'Sucursal: Av. Nicolás Ayllón Nro. 3270', fontSize: 8 },
          { text: 'Tel.: 01 362 8667 - 924 483 844', fontSize: 8 },
          { text: 'gearmparts@gmail.com', fontSize: 8 },
        ],
      },
      {
        width: 140,
        table: { widths: ['*'], body: [[
          { stack: [
            { text: `R.U.C. ${ruc}`, fontSize: 10, bold: true, alignment: 'center' },
            { text: 'ORDEN DE TRABAJO', fontSize: 12, bold: true, alignment: 'center', background: '#E0E0E0', margin: [0, 4, 0, 4] },
            { text: numCotizacion, fontSize: 10, bold: true, alignment: 'center' },
          ], margin: [8, 8, 8, 8] },
        ]]},
        layout: borderLayout(1, 1),
      },
    ],
    margin: [0, 0, 0, 10],
  });

  const contactName = vendedor || contactoComercial;
  const infoRows = [
    { columns: [
      { width: '60%', text: [{ text: 'RAZÓN SOCIAL : ', style: 'label10' }, { text: razonSocial || cliente, style: 'value10' }] },
      { width: '40%', text: [{ text: 'CONTACTO COMERCIAL : ', style: 'label10' }, { text: contactName, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] },
    { columns: [
      { width: '60%', text: [{ text: 'RUC : ', style: 'label10' }, { text: ruc, style: 'value10' }] },
      { width: '40%', text: [{ text: 'TELÉFONO : ', style: 'label10' }, { text: telefono, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] },
    { columns: [
      { width: '60%', text: [{ text: 'PERSONA CONTACTO : ', style: 'label10' }, { text: contactName, style: 'value10' }] },
      { width: '40%', text: [{ text: 'E-MAIL : ', style: 'label10' }, { text: email, style: 'value10' }] },
    ], margin: [0, 0, 0, 2] },
    { text: [{ text: 'TELÉFONO : ', style: 'label10' }, { text: telefono || '/', style: 'value10' }], margin: [0, 0, 0, 2] },
    { text: [{ text: 'E-MAIL : ', style: 'label10' }, { text: email || '', style: 'value10' }], margin: [0, 0, 0, 2] },
    { text: [{ text: 'REFERENCIA : ', style: 'label10' }, { text: '-', style: 'value10' }] },
  ];

  content.push({
    table: { widths: ['*'], body: [[{ stack: infoRows, margin: [6, 6, 6, 6] }]] },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 10],
  });

  content.push({
    table: { widths: ['*'], body: [[
      { stack: [
        {
          table: { widths: ['*'], body: [[
            { text: 'DATOS DEL VEHÍCULO', fontSize: 10, bold: true, alignment: 'center', margin: [0, 5, 0, 5], background: '#E0E0E0' },
          ]]},
          layout: 'noBorders',
        },
        { columns: [
          { width: '*', text: [{ text: 'PLACA : ', bold: true, fontSize: 10 }, { text: placa, fontSize: 10 }] },
          { width: '*', text: [{ text: 'MARCA : ', bold: true, fontSize: 10 }, { text: marca, fontSize: 10 }] },
          { width: '*', text: [{ text: 'MODELO : ', bold: true, fontSize: 10 }, { text: modelo, fontSize: 10 }] },
        ], margin: [5, 5, 5, 3] },
        { columns: [
          { width: '*', text: [{ text: 'COLOR : ', bold: true, fontSize: 10 }, { text: color, fontSize: 10 }] },
          { width: '*', text: [{ text: 'COMBUSTIBLE : ', bold: true, fontSize: 10 }, { text: combustible, fontSize: 10 }] },
          { width: '*', text: [{ text: 'KILOMETRAJE : ', bold: true, fontSize: 10 }, { text: kilometraje, fontSize: 10 }] },
        ], margin: [5, 0, 5, 3] },
        { text: [{ text: 'AÑO DE FABRICACIÓN : ', bold: true, fontSize: 10 }, { text: anioFabricacion, fontSize: 10 }], margin: [5, 0, 5, 5] },
      ]},
    ]]},
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 10],
  });

  const tblBody = [
    [
      { text: 'ITEM', style: 'tableHeader10', alignment: 'center' },
      { text: 'CÓDIGO', style: 'tableHeader10', alignment: 'center' },
      { text: 'DESCRIPCIÓN', style: 'tableHeader10', alignment: 'center' },
      { text: 'UNIDAD', style: 'tableHeader10', alignment: 'center' },
      { text: 'CANT', style: 'tableHeader10', alignment: 'center' },
      { text: 'CHECK', style: 'tableHeader10', alignment: 'center' },
    ],
  ];
  let itemIdx = 1;
  for (const key of Object.keys(itemsAgrupados)) {
    const g = itemsAgrupados[key];
    tblBody.push([
      { text: String(itemIdx++), style: 'cell10', alignment: 'center' },
      { text: g.codigo, style: 'cell10' },
      { text: key, style: 'cell10' },
      { text: 'HRS', style: 'cell10', alignment: 'center' },
      { text: String(g.cantidad), style: 'cell10', alignment: 'center' },
      { text: ' ', style: 'cell10', alignment: 'right' },
    ]);
  }

  content.push({
    table: { widths: [30, 55, '*', 45, 35, 50], body: tblBody },
    layout: {
      hLineWidth: () => 1, vLineWidth: () => 1,
      hLineColor: () => '#000', vLineColor: () => '#000',
      fillColor: (ri) => ri === 0 ? '#E0E0E0' : null,
      paddingLeft: () => 4, paddingRight: () => 4,
      paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 10],
  });

  content.push(
    { text: 'Observaciones de servicio:', bold: true, fontSize: 10, margin: [0, 0, 0, 5] },
    {
      table: {
        widths: ['*', '*'],
        body: [[
          {
            stack: [
              { text: 'Firma y/o sello conductor o responsable', fontSize: 10, margin: [0, 0, 0, 5] },
              { text: 'NOMBRE: _______________________', fontSize: 10, margin: [0, 0, 0, 12] },
              { columns: [
                { width: 'auto', text: 'DNI: __________', fontSize: 10 },
                { width: 30, text: '' },
                { width: 'auto', text: 'FIRMA __________', fontSize: 10 },
              ]},
            ], margin: [8, 8, 8, 8],
          },
          {
            stack: [
              { text: 'Recepción en Taller', fontSize: 10, margin: [0, 0, 0, 5] },
              { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 10, margin: [0, 0, 0, 12] },
              { text: 'NOMBRE: _______________________', fontSize: 10 },
            ], margin: [8, 8, 8, 8],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 1, vLineWidth: () => 1,
        hLineColor: () => '#000', vLineColor: () => '#000',
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
    },
  );

  return {
    pageSize: 'A4', pageMargins: [20, 20, 20, 20], content,
    styles: { ...S, tableHeader10: { fontSize: 10, bold: true, alignment: 'center', margin: [4, 4, 4, 4] }, cell10: { fontSize: 10, margin: [3, 2, 3, 2] } },
    defaultStyle: { fontName: 'Roboto' },
  };
}

async function buildDocDef(opts) {
  switch (opts.tipo) {
    case 'compra': return buildDocDefCompra(opts);
    case 'cotizacion': return buildDocDefCotizacion(opts);
    case 'orden': return buildDocDefOrden(opts);
    default: return buildDocDefFactura(opts);
  }
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
  let tipo = 'factura';

  if (data.proveedor || data.proveedorDoc) {
    tipo = 'compra';
  } else if (data.diagnosticos || data.items?.some?.((it) => it.tipo === 'servicio' || it.tipo === 'mano_obra')) {
    if (title === 'Documento' || (!data.total && data.items?.length > 0)) {
      tipo = 'orden';
    } else {
      tipo = 'cotizacion';
    }
  }

  return {
    tipo,
    items: data.items || data.diagnosticos || [],
    cliente: data.cliente || data.razonSNombre || data.nombre_cliente || data.Razon_social || (data.proveedor || ''),
    clienteDoc: data.clienteDoc || data.RUCempresa || data.DNI || (data.proveedorDoc || ''),
    direccion: data.direccion || '',
    fecha: data.fecha || data.Fecha || data.fecha_creacion || '',
    formaPago: data.formaPago || data.FPago || 'CONTADO',
    serie: data.serie || data.nserie || data.Nserie || '',
    numero: data.numero || data.NumCotizacion || data.numeroorden || '',
    subtotal: data.subtotal || 0,
    igv: data.igv || 0,
    total: data.total || data.Total || 0,
    placa: data.placa || '',
    marca: data.marca || '',
    modelo: data.modelo || '',
    km: data.km_ingreso || data.kilometraje || '',
    observaciones: data.observacion || data.motivo || data.observaciones || '',
    titulo: title || 'FACTURA ELECTRÓNICA',
    vendedor: data.vendedor || data.Vendedor || 'VENDEDOR 1',
    nroCot: data.nroCot || data.NroCot || data.NumCotizacion || '',
    ordenCompra: data.ordenCompra || data.orden_compra || '',
    totalEnLetras: data.totalEnLetras || data.TotalEnLetras || data.totaltext || '',
    qrData: data.qrData || data.QrData || '',
    logoUrl: data.logoUrl || data.LogoUrl || '',
    erpLogoUrl: data.erpLogoUrl || data.ErpLogoUrl || '',
    contactoComercial: data.contactoComercial || data.contacto || data.Contacto || '',
    telefonoContactoComercial: data.telefonoContactoComercial || data.telefono || data.Telefono || '',
    personaContacto: data.personaContacto || data.contacto || '',
    telefonoPersonaContacto: data.telefonoPersonaContacto || data.telefono || '',
    email: data.email || data.Email || '',
    referencia: data.referencia || data.Referencia || '',
    color: data.color || data.Color || '',
    combustible: data.combustible || data.Combustible || '',
    kilometraje: data.kilometraje || data.Kilometraje || data.km_ingreso || '',
    anioFabricacion: data.anioFabricacion || data.AnioFabricacion || data.anio || '',
    moneda: data.moneda || data.Moneda || 'SOLES',
    lugarServicio: data.lugarServicio || data.lugar_servicio || '',
    plazoEntrega: data.plazoEntrega || data.plazo_entrega || '',
    validezOferta: data.validezOferta || data.validez_oferta || '',
    fechaServicio: data.fechaServicio || data.fecha_servicio || data.fecha || '',
    tipoServicio: data.tipoServicio || data.tipo_servicio || data.servicio || '',
    numeroOrden: data.numeroOrden || data.numero_orden || data.numeroorden || '',
    natural: data.natural !== undefined ? data.natural : true,
    razonSocial: data.razonSocial || data.Razon_social || data.razonSNombre || '',
    telefono: data.telefono || data.Telefono || '',
    contacto: data.contacto || data.Contacto || '',
  };
}
