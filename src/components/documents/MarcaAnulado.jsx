// ─────────────────────────────────────────────────────────────────────────────
// Marca de comprobante anulado.
//
// Las cuatro listas de emisión mostraban un comprobante anulado EXACTAMENTE igual que uno
// vigente: mismo número, mismo importe, misma insignia de estado. Comprobado anulando la
// boleta B066-047003 —quedó `anulado: true` con su nota de crédito BC66-047001 emitida y
// aceptada— y la fila siguió siendo indistinguible de las demás.
//
// Importa porque un comprobante anulado ya no se cobra ni se vuelve a enviar al cliente, y
// porque el botón de anular seguía ofreciéndose: volver a pulsarlo intenta emitir una
// SEGUNDA nota de crédito sobre un documento que ya no existe fiscalmente.
// ─────────────────────────────────────────────────────────────────────────────

export function estaAnulado(doc) {
  return doc?.anulado === true || doc?.Estado === "Anulado" || doc?.estado === "Anulado";
}

export default function MarcaAnulado({ doc }) {
  if (!estaAnulado(doc)) return null;
  const nc = doc.notaCredito;
  const referencia = nc?.serie && nc?.numero ? `${nc.serie}-${nc.numero}` : null;
  return (
    <span
      className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--danger-dim)] text-[var(--danger)] align-middle"
      // El número de la nota es lo que justifica la anulación ante SUNAT: conviene tenerlo
      // a mano sin abrir el detalle.
      title={referencia ? `Anulado con la nota de crédito ${referencia}` : "Comprobante anulado"}
    >
      ANULADO
    </span>
  );
}
