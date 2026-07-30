export function buildDetail(detalle, igvIncluido = true) {
  return detalle.map((item) => {
    const cantidad = item.cant ?? item.cantidad ?? 1;
    let valorUnitario, igv, valorVenta, precioUnitarioConIgv;
    if (igvIncluido) {
      valorUnitario = round2(item.precioVenta / 1.18);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
      precioUnitarioConIgv = round2(valorUnitario * 1.18);
    } else {
      valorUnitario = round2(item.precioVenta);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
      precioUnitarioConIgv = round2(valorUnitario * 1.18);
    }
    return {
      unidad: "NIU",
      cantidad,
      cod_Producto: item.codigo || "",
      descripcion: item.descripcion || "",
      monto_Valor_Unitario: valorUnitario,
      monto_Base_Igv: valorVenta,
      porcentaje_Igv: 18,
      igv,
      tip_Afe_Igv: "10",
      total_Impuestos: igv,
      monto_Precio_Unitario: precioUnitarioConIgv,
      monto_Valor_Venta: valorVenta,
      factor_Icbper: 0,
    };
  });
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

export function buildInvoicePayload({
  tipoDoc, serie, correlativo, fechaEmision, empresaRuc,
  clienteTipoDoc, clienteNumDoc, clienteRazonSocial, clienteDireccion,
  detalle, igvIncluido = true, total,
}) {
  const items = buildDetail(detalle, igvIncluido);
  const subTotal = items.reduce((s, it) => s + it.monto_Valor_Venta, 0);
  const totalIgv = items.reduce((s, it) => s + it.igv, 0);
  const montoTotal = igvIncluido ? (total ?? subTotal + totalIgv) : total ?? subTotal + totalIgv;

  return {
    tipo_Operacion: "0101",
    tipo_Doc: tipoDoc,
    serie,
    correlativo,
    tipo_Moneda: "PEN",
    fecha_Emision: fechaEmision,
    empresa_Ruc: empresaRuc,
    cliente_Tipo_Doc: clienteTipoDoc,
    cliente_Num_Doc: clienteNumDoc,
    cliente_Razon_Social: clienteRazonSocial,
    cliente_Direccion: clienteDireccion,
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
    detalle: items,
    forma_pago: [{ tipo: "Contado", monto: round2(montoTotal), cuota: 0, fecha_Pago: fechaEmision }],
    legend: [{ legend_Code: "1000", legend_Value: "GM PARTS TALLER" }],
  };
}

export function buildCreditNotePayload({
  serie, correlativo, fechaEmision, empresaRuc,
  clienteTipoDoc, clienteNumDoc, clienteRazonSocial, clienteDireccion,
  detalle, tipoDocAfectado, numDocAfectado, motivoCod, motivoDes,
}) {
  const items = buildDetail(detalle, true);
  const subTotal = items.reduce((s, it) => s + it.monto_Valor_Venta, 0);
  const totalIgv = items.reduce((s, it) => s + it.igv, 0);
  const montoTotal = subTotal + totalIgv;

  return {
    tipo_Operacion: "0101",
    tipo_Doc: "07",
    serie,
    correlativo,
    tipo_Moneda: "PEN",
    estado_Documento: "0",
    fecha_Emision: fechaEmision,
    Observacion: "",
    Manual: false,
    empresa_Ruc: empresaRuc,
    cliente_Tipo_Doc: clienteTipoDoc,
    cliente_Num_Doc: clienteNumDoc,
    cliente_Razon_Social: clienteRazonSocial,
    cliente_Direccion: clienteDireccion,
    monto_Igv: round2(totalIgv),
    total_Impuestos: round2(totalIgv),
    valor_Venta: round2(subTotal),
    monto_Oper_Gravadas: round2(subTotal),
    monto_Oper_Exoneradas: 0,
    sub_Total: round2(montoTotal),
    monto_Imp_Venta: round2(montoTotal),
    afectado_Tipo_Doc: tipoDocAfectado,
    afectado_Num_Doc: numDocAfectado,
    motivo_Cod: motivoCod,
    motivo_Des: motivoDes,
    detalle: items,
    legend: [{ legend_Value: "GM PARTS TALLER", legend_Code: "1000" }],
  };
}

export function parseResponse(json) {
  return {
    success: json?.success === true,
    sunatSuccess: json?.data?.sunatResponse?.success === true,
    cdrId: json?.data?.sunatResponse?.cdrResponse?.id ?? null,
    message: json?.message ?? "",
    errorDetail: json?.data?.error?.message ?? "",
  };
}
