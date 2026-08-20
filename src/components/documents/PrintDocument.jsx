import { useState } from "react";
import { X, Download, Printer, FileText } from "lucide-react";

// El generador de PDF pesa 1,8 MB (pdfmake y sus fuentes). Se carga al pulsar, no al
// abrir la aplicación: antes viajaba en el bundle inicial aunque nadie imprimiera nada.
const cargarGeneradorPDF = () => import("../../lib/pdfGenerator");

export default function PrintDocument({ title = "Documento", data, onClose }) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);
  if (!data) return null;

  const handleDownload = async () => {
    setAction("download");
    setLoading(true);
    try {
      const { docToOpts, descargarPDF } = await cargarGeneradorPDF();
      await descargarPDF(docToOpts(data, title), `${title}_${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    onClose();
  };

  const handlePrint = async () => {
    setAction("print");
    setLoading(true);
    try {
      const { docToOpts, imprimirPDF } = await cargarGeneradorPDF();
      await imprimirPDF(docToOpts(data, title));
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="gmp-fade-in bg-[var(--surface-3)] rounded-xl border border-[var(--line-soft)] w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-soft)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]"><FileText size={18} /></div>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-[var(--muted)]">Selecciona una opción</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--line-soft)] hover:bg-[var(--accent-dim)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-sm font-medium transition-all disabled:opacity-50"
          >
            <Download size={18} className="text-[var(--accent)]" />
            <div className="text-left">
              <div className="font-semibold">Descargar PDF</div>
              <div className="text-xs text-[var(--muted)]">Guardar en tu dispositivo</div>
            </div>
            {loading && action === "download" && <span className="ml-auto text-xs text-[var(--muted)]">Generando...</span>}
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--line-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] text-sm font-medium transition-all disabled:opacity-50"
          >
            <Printer size={18} className="text-[var(--muted)]" />
            <div className="text-left">
              <div className="font-semibold">Imprimir</div>
              <div className="text-xs text-[var(--muted)]">Enviar a impresora</div>
            </div>
            {loading && action === "print" && <span className="ml-auto text-xs text-[var(--muted)]">Preparando...</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
