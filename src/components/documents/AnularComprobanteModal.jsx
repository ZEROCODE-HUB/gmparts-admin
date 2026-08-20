import { useState, useEffect } from "react";
import { AlertTriangle, FileWarning } from "lucide-react";
import { llamarComprobantes } from "../../lib/comprobantes";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";
import { showToast } from "../ui/Toast";
import { revertirStockDeDocumento } from "../../store/firestoreStock";

// Anular un comprobante declarado no es borrarlo: exige emitir una nota de crédito ante
// SUNAT. Este diálogo enseña los números exactos ANTES de confirmar — qué documento se
// anula, por cuánto, y cuántas unidades vuelven al stock.
export default function AnularComprobanteModal({ docKey, id, onClose, onAnulado }) {
  const [previo, setPrevio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [anulando, setAnulando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const previo = await llamarComprobantes("previsualizarAnulacion", { collection: docKey, docId: id });
        if (vigente) setPrevio(previo);
      } catch (e) {
        if (vigente) setError(e?.message || "No se pudo leer el comprobante");
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => { vigente = false; };
  }, [docKey, id]);

  const anular = async () => {
    setAnulando(true);
    setError("");
    try {
      const res = await llamarComprobantes("anular", { collection: docKey, docId: id });
      // El stock se devuelve desde el cliente, que es donde vive toda la lógica de
      // inventario (kardex y movimientos incluidos).
      await revertirStockDeDocumento(docKey, id);
      showToast(res?.message || "Comprobante anulado", "success");
      if (onAnulado) onAnulado();
      onClose();
    } catch (e) {
      const msg = e?.message || "No se pudo anular el comprobante";
      setError(msg);
      showToast(msg, "error");
    }
    setAnulando(false);
  };

  const moneda = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

  return (
    <Modal title="Anular comprobante" onClose={onClose}>
      {cargando && <p className="text-sm text-[var(--muted)]">Consultando el comprobante…</p>}

      {!cargando && previo && (
        <>
          <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-[var(--surface-2)]">
            {previo.declarado ? <FileWarning size={18} className="text-[var(--danger)] shrink-0 mt-0.5" />
                              : <AlertTriangle size={18} className="text-[var(--muted)] shrink-0 mt-0.5" />}
            <p className="text-sm">{previo.accion}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><span className="text-[12px] text-[var(--muted)]">Documento</span><p className="text-sm gmp-mono font-medium">{previo.numero}</p></div>
            <div><span className="text-[12px] text-[var(--muted)]">Cliente</span><p className="text-sm">{previo.cliente || "—"}</p></div>
            <div><span className="text-[12px] text-[var(--muted)]">Total</span><p className="text-sm gmp-mono">{moneda(previo.total)}</p></div>
            <div><span className="text-[12px] text-[var(--muted)]">Vuelve al stock</span><p className="text-sm gmp-mono">{previo.unidadesADevolver} unidad(es)</p></div>
            {previo.declarado && (
              <div className="col-span-2">
                <span className="text-[12px] text-[var(--muted)]">Nota de crédito que se emitirá</span>
                <p className="text-sm gmp-mono">{previo.serieNota}-…  ·  motivo 01, anulación de la operación</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-[var(--danger)] mb-4">{error}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn variant="danger" onClick={anular} disabled={anulando || previo.yaAnulado}>
              {anulando ? "Anulando…" : previo.declarado ? "Emitir nota de crédito y anular" : "Anular"}
            </Btn>
          </div>
        </>
      )}

      {!cargando && !previo && (
        <>
          <p className="text-sm text-[var(--danger)] mb-6">{error || "No se pudo cargar el comprobante."}</p>
          <div className="flex justify-end"><Btn variant="ghost" onClick={onClose}>Cerrar</Btn></div>
        </>
      )}
    </Modal>
  );
}
