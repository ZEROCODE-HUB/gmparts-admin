import { useState } from "react";
import { FileText } from "lucide-react";
import { generarFacturaPDF, descargarPDF } from "../../lib/pdfGenerator";

export default function DownloadPdfButton({ data }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const html = generarFacturaPDF({
        items: data.items || data.diagnosticos || [],
        cliente: data.cliente || data.razonSNombre || data.nombre_cliente || data.Razon_social || "",
        clienteDoc: data.clienteDoc || data.RUCempresa || data.DNI || "",
        direccion: data.direccion || "",
        fecha: data.fecha || data.Fecha || data.fecha_creacion || "",
        formaPago: data.formaPago || data.FPago || "CONTADO",
        serie: data.serie || data.nserie || data.Nserie || "",
        numero: data.numero || data.NumCotizacion || "",
        subtotal: data.subtotal || 0,
        igv: data.igv || 0,
        total: data.total || data.Total || 0,
        placa: data.placa || "",
        marca: data.marca || "",
        modelo: data.modelo || "",
        km: data.km_ingreso || "",
        observaciones: data.observacion || data.motivo || data.observaciones || "",
        titulo: "",
      });
      descargarPDF(html, `documento_${data.serie || data.Nserie || ""}${data.numero || ""}.html`);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar PDF");
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
