import { useState } from "react";
import { Printer, Download } from "lucide-react";
import { docToOpts, descargarPDF, imprimirPDF } from "../../lib/pdfGenerator";

export default function PrintButton({ title, data }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  if (!data) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      await descargarPDF(docToOpts(data, title), `${title || "documento"}_${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    setOpen(false);
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      await imprimirPDF(docToOpts(data, title));
    } catch (e) { console.error("PDF error:", e); }
    setLoading(false);
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={loading} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir / PDF"><Printer size={15} /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-[var(--panel)] rounded-lg p-6 flex flex-col gap-3 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleDownload} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Download size={16} /> {loading ? "Generando..." : "Descargar PDF"}</button>
            <button onClick={handlePrint} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Printer size={16} /> {loading ? "Generando..." : "Imprimir"}</button>
            <button onClick={() => setOpen(false)} className="text-sm text-[var(--muted)] hover:text-[var(--text)] mt-2">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
