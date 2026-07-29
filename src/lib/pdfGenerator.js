import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.default || pdfFonts;
pdfMake.fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

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

// ---- Shared layout helpers (Factura / Compra) ----

function buildHeader(logoData, titulo, numDoc) {
  return {
    columns: [
      {
        width: '*',
        columns: [
          ...(logoData ? [{ image: logoData, width: 80, height: 80 }] : [{ text: '', width: 80 }]),
          { width: 12, text: '' },
          {
            width: '*',
            stack: [
              { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 16, bold: true },
              { text: 'Dirección fiscal: Av. Nicolás Ayllón 3270, Ate, Lima', fontSize: 7.5, margin: [0, 3, 0, 0] },
              { text: 'Tel.: 01 362 8667 - 924 483 844', fontSize: 7.5 },
              { text: 'gearmparts@gmail.com', fontSize: 7.5 },
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
              { text: 'R.U.C. 20601720621', fontSize: 11, bold: true, alignment: 'center' },
              { text: titulo, fontSize: 13, bold: true, alignment: 'center', margin: [0, 8, 0, 8] },
              { text: `Nº ${numDoc}`, fontSize: 11, bold: true, alignment: 'center' },
            ], margin: [10, 10, 10, 10] },
          ]],
        },
        layout: borderLayout(1.5, 1.5),
      },
    ],
    margin: [0, 0, 0, 15],
  };
}

function buildCustomerBlock(rows) {
  return {
    table: { widths: ['*'], body: [[{ stack: rows, margin: [8, 8, 8, 8] }]] },
    layout: borderLayout(1, 1),
    margin: [0, 0, 0, 15],
  };
}

function buildItemsTable(items) {
  const body = [
    [
      { text: 'CÓDIGO', style: 'tableHeader', alignment: 'center' },
      { text: 'CANT.', style: 'tableHeader', alignment: 'center' },
      { text: 'UNID.', style: 'tableHeader', alignment: 'center' },
      { text: 'DESCRIPCIÓN', style: 'tableHeader', alignment: 'center' },
      { text: 'P.UNIT.', style: 'tableHeader', alignment: 'center' },
      { text: 'IMPORTE', style: 'tableHeader', alignment: 'center' },
    ],
  ];
  for (const it of items) {
    const c = it.cant ?? it.cantidad ?? 1;
    const p = it.pu ?? it.precioVenta ?? 0;
    const t = it.total ?? c * p;
    body.push([
      { text: it.codigo || '', style: 'cell', alignment: 'center' },
      { text: String(c), style: 'cell', alignment: 'center' },
      { text: it.unidad || 'UND', style: 'cell', alignment: 'center' },
      { text: (it.descripcion || it.articulo || '').toUpperCase(), style: 'cell' },
      { text: Number(p).toFixed(2), style: 'cell', alignment: 'right' },
      { text: Number(t).toFixed(2), style: 'cell', alignment: 'right' },
    ]);
  }
  while (body.length < 11) {
    body.push([
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
      { text: '', style: 'cell' }, { text: '', style: 'cell' },
    ]);
  }
  return {
    table: { widths: [60, 40, 40, '*', 80, 60], body },
    layout: {
      hLineWidth: () => 0.5, vLineWidth: () => 0.5,
      hLineColor: () => '#000', vLineColor: () => '#000',
      fillColor: (ri) => ri === 0 ? '#EEEEEE' : null,
      paddingLeft: () => 4, paddingRight: () => 4,
      paddingTop: () => 4, paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 8],
  };
}

function buildAmountRow(label, value, style) {
  return {
    columns: [
      { width: 'auto', text: label, style },
      { width: '*', text: `S/ ${Number(value).toFixed(2)}`, style, alignment: 'right' },
    ],
  };
}

// ---- Shared unified layout helpers (todos los documentos) ----

function thinBorder() {
  return {
    hLineWidth: () => 0.75, vLineWidth: () => 0.75,
    hLineColor: () => '#000000', vLineColor: () => '#000000',
    paddingLeft: () => 4, paddingRight: () => 4,
    paddingTop: () => 2, paddingBottom: () => 2,
  };
}

function fieldRow(label, value, opts2 = {}) {
  const fs = opts2.fontSize || 8;
  return { text: [{ text: `${label} : `, bold: true, fontSize: fs }, { text: value || '', fontSize: fs }], ...(opts2.extra || {}) };
}

function sectionWithTitle(title, contentStack) {
  return {
    table: {
      widths: ['*'],
      body: [
        [{ text: title, fontSize: 8, bold: true, alignment: 'center', margin: [4, 4, 4, 4], fillColor: '#eeeeee' }],
        [{ stack: contentStack, margin: [4, 4, 4, 4] }],
      ],
    },
    layout: {
      hLineWidth: (i) => i === 1 ? 0 : 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => '#000000', vLineColor: () => '#000000',
      fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
      paddingLeft: () => 0, paddingRight: () => 0,
      paddingTop: () => 0, paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 8],
  };
}

function buildUnifiedHeader(logoData, titulo, numDoc, fecha) {
  return {
    columns: [
      {
        width: '*',
        columns: [
          ...(logoData ? [{ image: logoData, width: 100, height: 70 }] : [{ text: '', width: 100 }]),
          { width: 8, text: '' },
          {
            width: '*',
            stack: [
              { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 16, bold: true },
              { text: 'Dirección fiscal: Av. Nicolás Ayllón 3270, Ate, Lima', fontSize: 7.5, margin: [0, 3, 0, 0] },
              { text: 'Tel.: 01 362 8667 - 924 483 844', fontSize: 7.5 },
              { text: 'gearmparts@gmail.com', fontSize: 7.5 },
            ],
          },
        ],
      },
      {
        width: 180,
        table: {
          widths: ['*'],
          body: [
            [{ text: 'R.U.C. 20601720621', fontSize: 11, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
            [{ text: titulo, fontSize: 13, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
            [{ text: numDoc ? `Nº ${numDoc}` : '', fontSize: 11, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
            [{ text: fecha || '', fontSize: 9, alignment: 'center', margin: [8, 4, 8, 6] }],
          ],
        },
        layout: {
          hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0.75 : 0.5,
          vLineWidth: () => 0.75,
          hLineColor: () => '#000000', vLineColor: () => '#000000',
          paddingLeft: () => 0, paddingRight: () => 0,
          paddingTop: () => 0, paddingBottom: () => 0,
        },
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function buildUnifiedCliente(cliente, clienteDoc, direccion, labelCliente, extraRows) {
  const rows = [
    { columns: [
      { width: '*', text: fieldRow(labelCliente || 'CLIENTE', cliente, { fontSize: 8 }) },
      { width: '*', text: fieldRow('FECHA EMISIÓN', '', { fontSize: 8 }) },
    ], margin: [0, 0, 0, 2] },
    { columns: [
      { width: '*', text: fieldRow('RUC / DNI', clienteDoc, { fontSize: 8 }) },
      { width: '*', text: fieldRow('DIRECCIÓN', direccion, { fontSize: 8 }) },
    ], margin: [0, 0, 0, 2] },
  ];
  if (extraRows) {
    for (const r of extraRows) { rows.push({ ...r, margin: [0, 0, 0, 2] }); }
  }
  return {
    table: { widths: ['*', '*'], body: rows.map((r) => [
      { text: r.columns[0], alignment: 'left' },
      { text: r.columns[1], alignment: 'left' },
    ])},
    layout: thinBorder(),
    margin: [0, 0, 0, 8],
  };
}

function buildUnifiedTable(items) {
  const body = [
    [
      { text: 'ITEM', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      { text: 'DESCRIPCIÓN', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      { text: 'UNIDAD', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      { text: 'CANT', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      { text: 'PRECIO', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      { text: 'TOTAL', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
    ],
  ];
  let idx = 1;
  for (const it of items) {
    const c = it.cant ?? it.cantidad ?? 1;
    const p = it.pu ?? it.precio ?? it.precioVenta ?? 0;
    const t = it.total ?? c * p;
    const u = it.unidad || (it.tipo === 'servicio' || it.tipo === 'mano_obra' ? 'HRS' : 'UND');
    body.push([
      { text: String(idx++), fontSize: 8, alignment: 'center' },
      { text: (it.descripcion || it.articulo || '').toUpperCase(), fontSize: 8 },
      { text: u, fontSize: 8, alignment: 'center' },
      { text: String(c), fontSize: 8, alignment: 'center' },
      { text: `S/ ${Number(p).toFixed(2)}`, fontSize: 8, alignment: 'right' },
      { text: `S/ ${Number(t).toFixed(2)}`, fontSize: 8, alignment: 'right' },
    ]);
  }
  while (body.length < 11) {
    body.push([
      { text: '', fontSize: 8 }, { text: '', fontSize: 8 },
      { text: '', fontSize: 8 }, { text: '', fontSize: 8 },
      { text: '', fontSize: 8 }, { text: '', fontSize: 8 },
    ]);
  }
  return {
    table: { widths: [25, '*', 45, 30, 55, 55], headerRows: 1, body },
    layout: {
      hLineWidth: () => 0.75, vLineWidth: () => 0.75,
      hLineColor: () => '#000000', vLineColor: () => '#000000',
      fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
      paddingLeft: () => 3, paddingRight: () => 3,
      paddingTop: () => 2, paddingBottom: () => 2,
    },
    margin: [0, 0, 0, 8],
  };
}

function buildUnifiedTotales(subtotal, igv, total) {
  return {
    width: 180,
    stack: [
      buildAmountRow('SUB TOTAL', subtotal, 'totalLine'),
      buildAmountRow('I.G.V. (18%)', igv, 'totalLine'),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 4, 0, 4] },
      buildAmountRow('IMP. TOTAL', total, 'totalBold'),
    ],
  };
}

function buildUnifiedBankInfo() {
  return {
    width: 180,
    table: { widths: ['*'], body: [[
      { stack: [
        { text: 'CUENTAS BANCARIAS:', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
        { text: 'BCP CTA. CTE. SOLES  : 191-2390862-0-19', fontSize: 8, margin: [0, 0, 0, 1] },
        { text: 'BCP CTA. CCI. SOLES  : 002-19100239086201950', fontSize: 8, margin: [0, 0, 0, 1] },
        { text: 'BN DETRACCIÓN SOLES  : 00-066-104419', fontSize: 8 },
      ], margin: [4, 4, 4, 4] },
    ]]},
    layout: thinBorder(),
  };
}

function buildUnifiedSunatText(tipo) {
  const label = tipo === 'boleta' ? 'BOLETA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA';
  return {
    stack: [
      { text: `Representación impresa de la ${label}`, fontSize: 6, alignment: 'left', width: 150 },
      { text: 'CONSULTE SU DOCUMENTO EN WWW.SUNAT.GOB.PE CON SU CLAVE SOL', fontSize: 6, alignment: 'left', width: 150 },
      { text: 'gearmparts@gmail.com', fontSize: 6, alignment: 'left', width: 150 },
    ],
  };
}

async function buildDocDefFactura(opts) {

  const {
    items = [], cliente = "CLIENTE GENÉRICO", clienteDoc = "00000000000",
    direccion = "SIN DIRECCIÓN", fecha = "", formaPago = "CONTADO",
    serie = "001", numero = "000000", subtotal = 0, igv = 0, total = 0,
    placa = "", marca = "", modelo = "", km = "", observaciones = "",
    titulo = "FACTURA ELECTRÓNICA", vendedor = "SIN ESPECIFICAR",
    nroCot = "", ordenCompra = "", totalEnLetras: ttl,
    logoUrl,
  } = opts;

  const tipofactura = (opts.tipofactura || titulo || '').toLowerCase();
  const numDoc = `${serie}-${numero}`;
  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const fechaFormatted = formatDateToDDMMYYYY(fecha);
  const fechaVencimientoStr = getNextMonthDueDate();
  const detraccion = (tipofactura === 'factura' && total > 700) ? total * 0.12 : null;
  const montoNeto = detraccion ? total - detraccion : null;
  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);

  const content = [];

  content.push(buildUnifiedHeader(logoData, titulo, numDoc, fechaFormatted));

  const extraRows = [
    { columns: [
      { width: '*', text: fieldRow('VENDEDOR', vendedor, { fontSize: 8 }) },
      { width: '*', text: fieldRow('COND. DE PAGO', formaPago, { fontSize: 8 }) },
    ]},
  ];
  if (observaciones) {
    extraRows.push({ columns: [
      { width: '*', text: fieldRow('OBSERVACIONES', observaciones.toUpperCase(), { fontSize: 8 }) },
      { width: '*', text: '' },
    ]});
  }
  content.push(buildUnifiedCliente(cliente, clienteDoc, direccion, 'CLIENTE', extraRows));

  const hasVehicle = placa || marca || modelo || km;
  if (hasVehicle) {
    content.push(sectionWithTitle('DATOS DEL VEHÍCULO', [
      { columns: [
        { width: '*', text: fieldRow('PLACA', placa, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MARCA', marca, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MODELO', modelo, { fontSize: 8 }) },
      ], margin: [0, 0, 0, 2] },
    ]));
  }

  content.push(buildUnifiedTable(items));

  content.push({ text: `SON: ${totalEnLetrasVal.toUpperCase()}`, fontSize: 8, margin: [0, 0, 0, 6] });

  const isBoleta = tipofactura === 'boleta';

  content.push({
    columns: [
      isBoleta ? { width: 'auto', text: '' } : buildUnifiedSunatText(tipofactura),
      { width: '*', stack: [
        buildUnifiedBankInfo(),
        ...(tipofactura === 'factura' && !isBoleta ? [
          { text: 'FECHA DE VENCIMIENTO:', bold: true, fontSize: 8, margin: [4, 8, 0, 0] },
          { text: fechaVencimientoStr, fontSize: 10, bold: true, color: '#CC0000', margin: [4, 0, 0, 0] },
        ] : []),
      ], margin: [0, 0, 10, 0] },
      buildUnifiedTotales(subtotal, igv, total),
    ],
    margin: [0, 0, 0, 10],
  });

  if (detraccion != null) {
    content.push({
      background: '#F5F5F5',
      stack: [
        { text: 'DETRACCIÓN 12%', style: 'detraccion' },
        buildAmountRow('Base:', total, 'detraccionDetail'),
        buildAmountRow('Monto:', detraccion, 'detraccionDetail'),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 2, 0, 2] },
        buildAmountRow('Neto a pagar:', montoNeto, 'detraccionBold'),
        { text: 'Sujeto a Sistema de Pago Obligaciones Tributarias', fontSize: 6, margin: [0, 4, 0, 0] },
      ],
      margin: [4, 4, 4, 4],
    });
  }

  return { pageSize: 'A4', pageMargins: [20, 20, 20, 20], content, styles: S, defaultStyle: { fontName: 'Roboto' } };
}

async function buildDocDefCompra(opts) {
  const {
    items = [], cliente = "PROVEEDOR GENÉRICO", clienteDoc = "00000000000",
    direccion = "SIN DIRECCIÓN", fecha = "", formaPago = "CONTADO",
    serie = "001", numero = "000000", subtotal = 0, igv = 0, total = 0,
    observaciones = "", titulo = "FACTURA ELECTRÓNICA", vendedor = "SIN ESPECIFICAR",
    nroCot = "", ordenCompra = "", totalEnLetras: ttl,
    logoUrl,
  } = opts;

  const numDoc = `${serie}-${numero}`;
  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const fechaFormatted = formatDateToDDMMYYYY(fecha);
  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);

  function rep(s) { return (s || '').replace(/Ñ/g, 'N'); }

  const content = [];

  content.push(buildUnifiedHeader(logoData, rep(titulo), numDoc, fechaFormatted));

  const extraRows = [
    { columns: [
      { width: '*', text: fieldRow('VENDEDOR', rep(vendedor), { fontSize: 8 }) },
      { width: '*', text: fieldRow('COND. DE PAGO', rep(formaPago), { fontSize: 8 }) },
    ]},
  ];
  if (observaciones) {
    extraRows.push({ columns: [
      { width: '*', text: fieldRow('OBSERVACIONES', rep(observaciones.toUpperCase()), { fontSize: 8 }) },
      { width: '*', text: '' },
    ]});
  }
  content.push(buildUnifiedCliente(rep(cliente), clienteDoc, rep(direccion), 'PROVEEDOR', extraRows));

  content.push(buildUnifiedTable(items));

  content.push({ text: `SON: ${rep(totalEnLetrasVal.toUpperCase())}`, fontSize: 8, margin: [0, 0, 0, 6] });

  content.push({
    columns: [
      buildUnifiedSunatText('factura'),
      { width: '*', stack: [buildUnifiedBankInfo()], margin: [0, 0, 10, 0] },
      buildUnifiedTotales(subtotal, igv, total),
    ],
    margin: [0, 0, 0, 10],
  });

  return { pageSize: 'A4', pageMargins: [20, 20, 20, 20], content, styles: S, defaultStyle: { fontName: 'Roboto' } };
}

async function buildDocDefCotizacion(opts) {
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

  const totalEnLetrasVal = ttl || totalEnLetras(total);
  const fechaFormatted = formatDateToDDMMYYYY(fecha || fechaServicio);
  const etiquetaId = natural ? 'DNI' : 'RUC';
  const etiquetaNombre = natural ? 'NOMBRE COMPLETO' : 'RAZÓN SOCIAL';
  const nombreCliente = razonSocial || cliente;
  const codCot = serie && numero ? `CT${serie}-${numero}`.replace(/^CT-/, 'CT') : (numero || '');

  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);

  const thinBorderLayout = {
    hLineWidth: () => 0.75,
    vLineWidth: () => 0.75,
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  };

  function fieldRow(label, value, opts = {}) {
    const fs = opts.fontSize || 8;
    return { text: [{ text: `${label} : `, bold: true, fontSize: fs }, { text: value || '', fontSize: fs }], ...opts.extra };
  }

  function sectionWithTitle(title, contentStack) {
    return {
      table: {
        widths: ['*'],
        body: [
          [{ text: title, fontSize: 8, bold: true, alignment: 'center', margin: [4, 4, 4, 4], fillColor: '#eeeeee' }],
          [{ stack: contentStack, margin: [4, 4, 4, 4] }],
        ],
      },
      layout: {
        hLineWidth: (i) => i === 1 ? 0 : 0.75,
        vLineWidth: () => 0.75,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8],
    };
  }

  // ── DATOS CLIENTE ──
  function buildClienteSection() {
    const leftRows = [
      fieldRow(etiquetaNombre, nombreCliente),
      fieldRow(etiquetaId, clienteDoc),
      fieldRow('PERSONA CONTACTO', personaContacto),
      fieldRow('TELÉFONO', telefonoContactoComercial || '/'),
      fieldRow('E-MAIL', email),
    ];
    if (referencia) leftRows.push(fieldRow('REFERENCIA', referencia));

    const rightRows = [
      fieldRow('CONTACTO COMERCIAL', contactoComercial),
      fieldRow('TELÉFONO', telefonoContactoComercial),
      fieldRow('E-MAIL', telefonoPersonaContacto),
    ];

    const maxRows = Math.max(leftRows.length, rightRows.length);
    const body = [];
    for (let i = 0; i < maxRows; i++) {
      body.push([
        { text: leftRows[i] || '', alignment: 'left' },
        { text: rightRows[i] || '', alignment: 'left' },
      ]);
    }

    return {
      table: { widths: ['*', '*'], body },
      layout: thinBorderLayout,
      margin: [0, 0, 0, 8],
    };
  }

  // ── DATOS DEL VEHÍCULO ──
  function buildVehiculoSection() {
    return sectionWithTitle('DATOS DEL VEHÍCULO', [
      { columns: [
        { width: '*', text: fieldRow('PLACA', placa, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MARCA', marca, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MODELO', modelo, { fontSize: 8 }) },
      ], margin: [0, 0, 0, 2] },
      { columns: [
        { width: '*', text: fieldRow('COLOR', color, { fontSize: 8 }) },
        { width: '*', text: fieldRow('COMBUSTIBLE', combustible, { fontSize: 8 }) },
        { width: '*', text: fieldRow('KILOMETRAJE', kilometraje, { fontSize: 8 }) },
      ], margin: [0, 0, 0, 2] },
      fieldRow('AÑO DE FABRICACIÓN', anioFabricacion, { fontSize: 8 }),
    ]);
  }

  // ── CONDICIONES COMERCIALES ──
  function buildCondicionesSection() {
    return sectionWithTitle('CONDICIONES COMERCIALES', [
      fieldRow('FORMA DE PAGO', formaPago, { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      fieldRow('MONEDA', moneda, { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      fieldRow('LUGAR DE SERVICIO', lugarServicio, { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      fieldRow('PLAZO DE ENTREGA', plazoEntrega, { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      fieldRow('VALIDEZ DE LA OFERTA', validezOferta, { fontSize: 8, extra: { margin: [0, 0, 0, 4] } }),
    ]);
  }

  // ── SERVICE BLOCK ──
  function buildServiceBlock() {
    const blockStack = [
      fieldRow('FECHA DE SERVICIO', fechaServicio || fechaFormatted, { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      fieldRow('SERVICIO', '', { fontSize: 8, extra: { margin: [0, 0, 0, 2] } }),
      {
        columns: [
          { width: '*', text: fieldRow('TIPO DE SERVICIO', tipoServicio, { fontSize: 8 }) },
          { width: 'auto', text: fieldRow('N° OR', numeroOrden, { fontSize: 8 }), alignment: 'right' },
        ],
      },
    ];

    return {
      table: { widths: ['*'], body: [[{ stack: blockStack, margin: [4, 4, 4, 4] }]] },
      layout: thinBorderLayout,
      margin: [0, 0, 0, 8],
    };
  }

  // ── TABLA DE ÍTEMS ──
  function buildItemsTable() {
    const tblBody = [
      [
        { text: 'ITEM', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'DESCRIPCIÓN', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'UNIDAD', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'CANT', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'PRECIO', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'TOTAL', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      ],
    ];
    let idx = 1;
    for (const it of items) {
      const c = it.cant ?? it.cantidad ?? 1;
      const p = it.pu ?? it.precio ?? it.precioVenta ?? 0;
      const t = it.total ?? c * p;
      const u = it.unidad || (it.tipo === 'servicio' || it.tipo === 'mano_obra' ? 'HRS' : 'UND');
      tblBody.push([
        { text: String(idx++), fontSize: 8, alignment: 'center' },
        { text: (it.descripcion || it.articulo || '').toUpperCase(), fontSize: 8 },
        { text: u, fontSize: 8, alignment: 'center' },
        { text: String(c), fontSize: 8, alignment: 'center' },
        { text: `S/ ${Number(p).toFixed(2)}`, fontSize: 8, alignment: 'right' },
        { text: `S/ ${Number(t).toFixed(2)}`, fontSize: 8, alignment: 'right' },
      ]);
    }

    return {
      table: { widths: [25, '*', 45, 30, 50, 50], headerRows: 1, body: tblBody },
      layout: {
        hLineWidth: () => 0.75,
        vLineWidth: () => 0.75,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 8],
    };
  }

  // ── TOTALES ──
  function buildTotales() {
    return {
      columns: [
        { width: '*', text: [{ text: 'OBS :', bold: true, fontSize: 8 }] },
        {
          width: 'auto',
          stack: [
            { text: `SUB TOTAL    S/ ${Number(subtotal).toFixed(2)}`, fontSize: 8, margin: [0, 0, 0, 1] },
            { text: `I.G.V. (18%) S/ ${Number(igv).toFixed(2)}`, fontSize: 8, margin: [0, 0, 0, 1] },
            { text: `IMP. TOTAL   S/ ${Number(total).toFixed(2)}`, fontSize: 8, bold: true },
          ],
          alignment: 'right',
        },
      ],
      margin: [0, 0, 0, 8],
    };
  }

  // ── CUENTAS BANCARIAS ──
  function buildCuentasBancarias() {
    return {
      width: 180,
      table: { widths: ['*'], body: [[
        { stack: [
          { text: 'CUENTAS BANCARIAS:', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
          { text: 'BCP CTA. CTE. SOLES  : 191-2390862-0-19', fontSize: 8, margin: [0, 0, 0, 1] },
          { text: 'BCP CTA. CCI. SOLES  : 002-19100239086201950', fontSize: 8, margin: [0, 0, 0, 1] },
          { text: 'BN DETRACCIÓN SOLES  : 00-066-104419', fontSize: 8 },
        ], margin: [4, 4, 4, 4] },
      ]]},
      layout: thinBorderLayout,
    };
  }

  const content = [
    buildUnifiedHeader(logoData, titulo, codCot, fechaFormatted),
    buildClienteSection(),
    buildVehiculoSection(),
    buildCondicionesSection(),
    buildServiceBlock(),
    buildItemsTable(),
    { text: `SON: ${totalEnLetrasVal}`, bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
    buildTotales(),
    { text: 'Esta cotización no incluye repuestos adicionales que se puedan presentar en el transcurso del servicio.', fontSize: 8, margin: [0, 0, 0, 2] },
    { text: 'Sin otro particular y a la espera de su orden de servicio nos despedimos.', fontSize: 8, margin: [0, 0, 0, 6] },
    { text: 'Atentamente,', fontSize: 8, margin: [0, 0, 0, 8] },
    buildCuentasBancarias(),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20],
    content,
    defaultStyle: { fontName: 'Roboto', fontSize: 8 },
  };
}

async function buildDocDefOrden(opts) {
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
    personaContacto = "", telefonoPersonaContacto = "", telefonoContactoComercial = "", referencia = "",
  } = opts;

  const logoData = await urlToDataUrl(logoUrl || LOGO_URL);
  const rucDefault = "20601720621";
  const numOrden = numero || nroCot || numeroOrden || '';

  const thinBorderLayout = {
    hLineWidth: () => 0.75, vLineWidth: () => 0.75,
    hLineColor: () => '#000000', vLineColor: () => '#000000',
    paddingLeft: () => 4, paddingRight: () => 4,
    paddingTop: () => 2, paddingBottom: () => 2,
  };

  function fieldRow(label, value, opts2 = {}) {
    const fs = opts2.fontSize || 8;
    return { text: [{ text: `${label} : `, bold: true, fontSize: fs }, { text: value || '', fontSize: fs }], ...(opts2.extra || {}) };
  }

  function sectionWithTitle(title, contentStack) {
    return {
      table: {
        widths: ['*'],
        body: [
          [{ text: title, fontSize: 8, bold: true, alignment: 'center', margin: [4, 4, 4, 4], fillColor: '#eeeeee' }],
          [{ stack: contentStack, margin: [4, 4, 4, 4] }],
        ],
      },
      layout: {
        hLineWidth: (i) => i === 1 ? 0 : 0.75,
        vLineWidth: () => 0.75,
        hLineColor: () => '#000000', vLineColor: () => '#000000',
        fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8],
    };
  }

  function buildHeaderOT() {
    return {
      columns: [
        {
          width: '*',
          columns: [
            logoData ? { image: logoData, width: 100, height: 70, fit: [100, 70] } : { text: '', width: 100 },
            { width: 8, text: '' },
            {
              width: '*',
              stack: [
                { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 18, bold: true, italics: true },
                { text: 'Dirección fiscal: Av. Colectora Industrial Mza. A Lote. 6', fontSize: 7, margin: [0, 2, 0, 0] },
                { text: 'Asc. Santa Cruz de Vista Alegre - Santa Anita', fontSize: 7 },
                { text: 'Sucursal: Av. Nicolás Ayllón Nro. 3270 Coo. Veintisiete de abril - Ate', fontSize: 7 },
                { text: 'Tel.: 01 362 8667 - 924 483 844', fontSize: 7 },
                { text: 'gearmparts@gmail.com', fontSize: 7 },
              ],
            },
          ],
        },
        {
          width: 'auto',
          table: {
            widths: ['*'],
            body: [
              [{ text: 'R.U.C. 20601720621', fontSize: 9, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
              [{ text: 'ORDEN DE TRABAJO', fontSize: 12, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
              [{ text: numOrden, fontSize: 9, bold: true, alignment: 'center', margin: [8, 6, 8, 6] }],
            ],
          },
          layout: {
            hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0.75 : 0.5,
            vLineWidth: () => 0.75,
            hLineColor: () => '#000000', vLineColor: () => '#000000',
            paddingLeft: () => 0, paddingRight: () => 0,
            paddingTop: () => 0, paddingBottom: () => 0,
          },
        },
      ],
      margin: [0, 0, 0, 8],
    };
  }

  function buildClienteSectionOT() {
    const leftRows = [
      fieldRow('RAZÓN SOCIAL', razonSocial || cliente),
      fieldRow('RUC', clienteDoc || rucDefault),
      fieldRow('PERSONA CONTACTO', personaContacto || vendedor || contactoComercial),
      fieldRow('TELÉFONO', telefono || telefonoPersonaContacto || '/'),
      fieldRow('E-MAIL', email || ''),
    ];
    if (referencia) leftRows.push(fieldRow('REFERENCIA', referencia));

    const rightRows = [
      fieldRow('CONTACTO COMERCIAL', contactoComercial || vendedor || ''),
      fieldRow('TELÉFONO', telefonoContactoComercial || telefono || ''),
      fieldRow('E-MAIL', telefonoPersonaContacto || email || ''),
    ];

    const max = Math.max(leftRows.length, rightRows.length);
    const body = [];
    for (let i = 0; i < max; i++) {
      body.push([
        { text: leftRows[i] || '', alignment: 'left', margin: [4, 2, 4, 2] },
        { text: rightRows[i] || '', alignment: 'left', margin: [4, 2, 4, 2] },
      ]);
    }

    return {
      table: { widths: ['*', '*'], body },
      layout: {
        hLineWidth: () => 0.75,
        vLineWidth: (i, node) => i === 0 || i === node.table.widths.length ? 0.75 : 0,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 0, paddingRight: () => 0,
        paddingTop: () => 0, paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 8],
    };
  }

  function buildVehiculoSectionOT() {
    return sectionWithTitle('DATOS DEL VEHÍCULO', [
      { columns: [
        { width: '*', text: fieldRow('PLACA', placa, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MARCA', marca, { fontSize: 8 }) },
        { width: '*', text: fieldRow('MODELO', modelo, { fontSize: 8 }) },
      ], margin: [0, 0, 0, 2] },
      { columns: [
        { width: '*', text: fieldRow('COLOR', color, { fontSize: 8 }) },
        { width: '*', text: fieldRow('COMBUSTIBLE', combustible, { fontSize: 8 }) },
        { width: '*', text: fieldRow('KILOMETRAJE', kilometraje, { fontSize: 8 }) },
      ], margin: [0, 0, 0, 2] },
      fieldRow('AÑO DE FABRICACIÓN', anioFabricacion, { fontSize: 8 }),
    ]);
  }

  function buildItemsTableOT() {
    const tblBody = [
      [
        { text: 'ITEM', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'CÓDIGO', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'DESCRIPCIÓN', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'UNIDAD', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'CANT', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
        { text: 'CHECK', fontSize: 8, bold: true, alignment: 'center', margin: [3, 3, 3, 3] },
      ],
    ];
    let idx = 1;
    for (const it of items) {
      const c = it.cant ?? it.cantidad ?? 1;
      const u = it.unidad || (it.tipo === 'servicio' || it.tipo === 'mano_obra' ? 'HRS' : 'UND');
      tblBody.push([
        { text: String(idx++), fontSize: 8, alignment: 'center' },
        { text: it.codigo || '-', fontSize: 8, alignment: 'center' },
        { text: (it.descripcion || it.articulo || '').toUpperCase(), fontSize: 8 },
        { text: u, fontSize: 8, alignment: 'center' },
        { text: String(c), fontSize: 8, alignment: 'center' },
        { text: ' ', fontSize: 8, alignment: 'center' },
      ]);
    }

    return {
      table: { widths: [25, 60, '*', 40, 30, 40], headerRows: 1, body: tblBody },
      layout: {
        hLineWidth: () => 0.75, vLineWidth: () => 0.75,
        hLineColor: () => '#000000', vLineColor: () => '#000000',
        fillColor: (ri) => ri === 0 ? '#eeeeee' : null,
        paddingLeft: () => 3, paddingRight: () => 3,
        paddingTop: () => 2, paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 8],
    };
  }

  function buildObservacionesOT() {
    return [
      { text: 'Observaciones de servicio:', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
      { text: '', fontSize: 8, margin: [0, 0, 0, 8] },
    ];
  }

  function buildFirmasOT() {
    return {
      table: {
        widths: ['*', '*'],
        body: [[
          {
            stack: [
              { text: 'Firma y/o sello conductor o responsable', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
              { text: 'NOMBRE: ________________________', fontSize: 8, margin: [0, 0, 0, 12] },
              { columns: [
                { width: 'auto', text: 'DNI: __________', fontSize: 8 },
                { width: 20, text: '' },
                { width: 'auto', text: 'FIRMA __________', fontSize: 8 },
              ]},
            ], margin: [6, 6, 6, 6],
          },
          {
            stack: [
              { text: 'Recepción en Taller', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
              { text: 'GEAR MOTOR PARTS S.A.C.', fontSize: 8, margin: [0, 0, 0, 12] },
              { text: 'NOMBRE: ________________________', fontSize: 8 },
            ], margin: [6, 6, 6, 6],
          },
        ]],
      },
      layout: thinBorderLayout,
    };
  }

  const content = [
    buildHeaderOT(),
    buildClienteSectionOT(),
    buildVehiculoSectionOT(),
    buildItemsTableOT(),
    ...buildObservacionesOT(),
    buildFirmasOT(),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 20],
    content,
    defaultStyle: { fontName: 'Roboto', fontSize: 8 },
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

  const code = data.codeCT || '';
  const tipofactura = (data.tipofactura || '').toLowerCase();
  const status = (data.status || '').toLowerCase();
  const hasProveedor = data.proveedor || data.proveedorDoc;
  const hasDiagOrServiceItems = data.diagnosticos || data.items?.some?.((it) => it.tipo === 'servicio' || it.tipo === 'mano_obra');

  // Detectar tipo por tipofactura primero
  if (tipofactura === 'cotizacion') {
    tipo = 'cotizacion';
  } else if (tipofactura === 'boleta') {
    tipo = 'factura';
  } else if (tipofactura === 'factura') {
    tipo = hasProveedor ? 'compra' : 'factura';
  } else if (hasProveedor) {
    tipo = 'compra';
  } else if (code.startsWith('OT')) {
    tipo = 'orden';
  } else if (code.startsWith('CT') || code.startsWith('SC') || data.tipo_servicio) {
    if (status === 'reparación' || status === 'finalizado' || status === 'completado' || status === 'aprobado') {
      tipo = 'orden';
    } else {
      tipo = 'cotizacion';
    }
  } else if (hasDiagOrServiceItems) {
    if (!data.total && data.items?.length > 0) {
      tipo = 'orden';
    } else {
      tipo = 'cotizacion';
    }
  }

  // Determinar título según tipofactura
  const effectiveTitle = tipofactura === 'boleta' ? 'BOLETA ELECTRÓNICA'
    : tipofactura === 'factura' ? (hasProveedor ? 'FACTURA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA')
    : tipofactura === 'cotizacion' ? 'COTIZACIÓN'
    : (title && title !== "Comprobante") ? title
    : undefined;

  // Expand diagnosticos into flat line items
  let items = data.items;
  if (!items && data.diagnosticos) {
    items = [];
    for (const diag of data.diagnosticos) {
      const mo = Number(diag.manoDeObra) || 0;
      const horas = Number(diag.horasTrabajo) || 0;
      if (mo > 0) {
        items.push({
          codigo: 'MO',
          descripcion: diag.solucion ? `Mano de obra: ${diag.solucion}` : 'Mano de obra',
          cantidad: horas || 1,
          pu: horas ? +(mo / horas).toFixed(2) : mo,
          total: mo,
        });
      }
      for (const rp of diag.repuestos || []) {
        const cant = Number(rp.cantidad) || 0;
        const pu = Number(rp.precio) || Number(rp.pu) || 0;
        if (cant > 0) {
          items.push({
            codigo: rp.codigo || '',
            descripcion: rp.descripcion || '',
            cantidad: cant,
            pu,
            total: cant * pu,
          });
        }
      }
    }
  }
  items = items || [];

  // Compute totals from items when missing
  const itemsTotal = items.reduce((s, it) => s + (Number(it.total) || (Number(it.cantidad || 1) * Number(it.pu || 0))), 0);
  const rawSub = Number(data.subtotal ?? data.Subtotal ?? data.subTotal ?? 0);
  const rawIgv = Number(data.igv ?? data.IGV ?? 0);
  const rawTotal = Number(data.total ?? data.Total ?? 0);
  const subtotal = rawSub || itemsTotal;
  const igv = rawIgv || (subtotal ? +(subtotal * 0.18).toFixed(2) : 0);
  const total = rawTotal || (subtotal ? +(subtotal * 1.18).toFixed(2) : 0);

  return {
    tipo,
    items,
    cliente: data.cliente || data.razonSNombre || data.nombre_cliente || data.Razon_social || (data.proveedor || ''),
    clienteDoc: data.clienteDoc || data.RUCempresa || data.DNI || (data.proveedorDoc || ''),
    direccion: data.direccion || '',
    fecha: data.fecha || data.Fecha || data.fecha_creacion || '',
    formaPago: data.formaPago || data.FPago || 'CONTADO',
    serie: data.serie || data.nserie || data.Nserie || '',
    numero: data.numero || data.NumCotizacion || data.numeroorden || data.codeCT || '',
    subtotal,
    igv,
    total,
    placa: data.placa || '',
    marca: data.marca || '',
    modelo: data.modelo || '',
    km: data.km_ingreso || data.kilometraje || '',
    observaciones: data.observacion || data.motivo || data.observaciones || '',
    titulo: effectiveTitle,
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
