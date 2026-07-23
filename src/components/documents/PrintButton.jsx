import { useState } from "react";
import { Printer, Download } from "lucide-react";
import { generarFacturaPDF, descargarPDF, imprimirPDF } from "../../lib/pdfGenerator";

export default function PrintButton({ title, data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const getDocDef = () => generarFacturaPDF({
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
    observaciones: data.observacion || data.motivo || "",
    titulo: title || "DOCUMENTO",
  });

  const handleDownload = () => {
    descargarPDF(getDocDef(), `${title || "documento"}_${data.serie || data.Nserie || ""}${data.numero || ""}.pdf`);
    setOpen(false);
  };

  const handlePrint = () => {
    imprimirPDF(getDocDef());
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir / PDF"><Printer size={15} /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-[var(--panel)] rounded-lg p-6 flex flex-col gap-3 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Download size={16} /> Descargar PDF</button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--surface-2)] text-sm font-medium"><Printer size={16} /> Imprimir</button>
            <button onClick={() => setOpen(false)} className="text-sm text-[var(--muted)] hover:text-[var(--text)] mt-2">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
