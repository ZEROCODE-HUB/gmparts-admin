import { X, Download, Printer } from "lucide-react";
import { generarFacturaPDF, descargarPDF, imprimirPDF } from "../../lib/pdfGenerator";

export default function PrintDocument({ title = "Documento", data, onClose }) {
  if (!data) return null;

  const getHTML = () => generarFacturaPDF({
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
    titulo: title || "DOCUMENTO",
  });

  const handleDownload = () => {
    descargarPDF(getHTML(), `${title}_${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    onClose();
  };

  const handlePrint = () => {
    imprimirPDF(getHTML());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--panel)] rounded-lg p-6 flex flex-col gap-3 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-sm mb-2">{title}</h3>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Download size={16} /> Descargar PDF</button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Printer size={16} /> Imprimir</button>
        <button onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--text)] mt-2">Cancelar</button>
      </div>
    </div>
  );
}
