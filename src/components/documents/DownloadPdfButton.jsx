import { useState } from "react";
import { FileText } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";

// Botón "Descargar PDF" para vista de detalle de documentos.
// Si el documento ya tiene pdfUrl, lo abre directamente.
// Si no, llama a la Cloud Function generateDocumentPdf para generarlo.
//
// Uso: <DownloadPdfButton collection="FacturasVentasCompras" docId={id} pdfUrl={doc.pdfUrl} />
//
// La Cloud Function debe estar desplegada para generar nuevos PDFs.
// Sin la función desplegada, el botón abre pdfUrl si existe.

export default function DownloadPdfButton({ collection, docId, pdfUrl }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
      return;
    }
    setLoading(true);
    try {
      const functions = getFunctions();
      const generatePdf = httpsCallable(functions, "generateDocumentPdf");
      const result = await generatePdf({ collection, docId });
      const url = result.data.url;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar PDF. Verifica que la Cloud Function est\u00e9 desplegada.");
    } finally {
      setLoading(false);
    }
  };

  if (!pdfUrl && !collection) return null;

  return (
    <button onClick={handleClick} disabled={loading}
      className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
      title={pdfUrl ? "Descargar PDF" : "Generar PDF"}>
      <FileText size={15} />
    </button>
  );
}
