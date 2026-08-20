import { useState } from "react";
import { FileText } from "lucide-react";

// Igual que en PrintDocument: el generador de PDF se carga al pulsar, no al arrancar.
const cargarGeneradorPDF = () => import("../../lib/pdfGenerator");

export default function DownloadPdfButton({ data }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { docToOpts, descargarPDF } = await cargarGeneradorPDF();
      await descargarPDF(docToOpts(data, ""), `${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
      title="Descargar PDF">
      <FileText size={15} />
    </button>
  );
}
