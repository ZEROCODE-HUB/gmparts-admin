import { useState } from "react";
import { Printer } from "lucide-react";
import PrintDocument from "./PrintDocument";

// Botón reutilizable que abre el layout de impresión de un documento.
export default function PrintButton({ title, data }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
      {open && <PrintDocument title={title} data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
