// Desglose de IGV.
//
// La misma expresión estaba copiada en los tres editores de documentos, y el canje de
// cotización a factura ni siquiera la aplicaba: emitía `igv: 0` sobre precios que ya
// llevaban el impuesto incluido. Un comprobante gravado que declara IGV cero lo rechaza
// SUNAT, y además descuadra el reporte de ventas.
export const TASA_IGV = 0.18;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// `incluido` es lo que en la interfaz se llama tipoIgv "INCLUIDO": el precio que se teclea
// ya lleva el IGV dentro, así que hay que extraerlo, no sumarlo.
export function desglosarIgv(sumaItems, incluido) {
  const suma = Number(sumaItems) || 0;
  if (incluido) {
    const subtotal = round2(suma / (1 + TASA_IGV));
    return { subtotal, igv: round2(suma - subtotal), total: round2(suma) };
  }
  const subtotal = round2(suma);
  const igv = round2(subtotal * TASA_IGV);
  return { subtotal, igv, total: round2(subtotal + igv) };
}
