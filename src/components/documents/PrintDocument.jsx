import { useState } from "react";
import { X, Download, Printer } from "lucide-react";
import { docToOpts, descargarPDF, imprimirPDF } from "../../lib/pdfGenerator";

export default function PrintDocument({ title = "Documento", data, onClose }) {
  const [loading, setLoading] = useState(false);
  if (!data) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      await descargarPDF(docToOpts(data, title), `${title}_${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    onClose();
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      await imprimirPDF(docToOpts(data, title));
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--panel)] rounded-lg p-6 flex flex-col gap-3 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-sm mb-2">{title}</h3>
        <button onClick={handleDownload} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Download size={16} /> {loading ? "Generando..." : "Descargar PDF"}</button>
        <button onClick={handlePrint} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Printer size={16} /> {loading ? "Generando..." : "Imprimir"}</button>
        <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--text)] mt-2">Cancelar</button>
      </div>
    </div>
  );
}
