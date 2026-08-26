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

// ─────────────────────────────────────────────────────────────────────────────
// Base del IGV de una orden de trabajo.
//
// La app móvil guarda en la recepción `Subtotal`, `IGV` y `Total`, y trata la mano de obra
// y los repuestos como importes NETOS: 830 de base, 149.40 de IGV, 979.40 en total. Eso es
// lo que se le enseña al cliente en el micrositio y lo que aprueba.
//
// El editor del panel arrancaba siempre en «INCLUIDO IGV», así que interpretaba esos mismos
// 830 como precio final y emitía la boleta por 830: S/149.40 menos de lo que el cliente
// había aceptado, en TODA orden facturada desde ahí. Verificado con la orden CT001-0000230.
//
// No se fija «MAS IGV» a ciegas: se compara la suma de las líneas con lo que la orden ya
// tiene guardado. Si cuadra con el Subtotal, las líneas son netas; si cuadra con el Total,
// ya llevan el IGV dentro. Así la regla se verifica sola con cada documento y no se rompe
// si mañana la app cambia de criterio.
//
// Devuelve "MAS" | "INCLUIDO" | null. `null` significa «no se puede saber»: la orden no
// guarda importes o no cuadran con nada, y entonces manda lo que hubiera en el formulario.
// ─────────────────────────────────────────────────────────────────────────────

// Un céntimo de margen: los importes vienen redondeados a dos decimales desde tres sitios
// distintos y una comparación exacta fallaría por el último céntimo.
const TOLERANCIA = 0.05;

const cerca = (a, b) => a > 0 && b > 0 && Math.abs(a - b) < TOLERANCIA;

export function baseIgvDeOrden(sumaLineas, subtotalOrden, totalOrden) {
  const suma = Number(sumaLineas) || 0;
  const subtotal = Number(subtotalOrden) || 0;
  const total = Number(totalOrden) || 0;

  // El orden importa: si una orden guardara subtotal y total iguales —IGV cero— se prefiere
  // interpretarlo como precio final, que es lo conservador: nunca inventa un 18% de más.
  if (cerca(suma, total)) return "INCLUIDO";
  if (cerca(suma, subtotal) && total > subtotal) return "MAS";
  return null;
}
