import { X } from "lucide-react";
import DownloadPdfButton from "./DownloadPdfButton";

export default function DocumentPreviewModal({ title, data, fields, onClose, collection }) {
  console.log("[PDF-DIAG] modal abierto, collection:", collection, "dataId:", data?.id, "pdfUrl:", data?.pdfUrl);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto gmp-scroll bg-black/60 p-6">
      <div className="gmp-fade-in bg-[var(--surface-3)] rounded-lg w-full max-w-2xl mt-8 border border-[var(--line-soft)]">
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line-soft)]">
          <div>
            <h3 className="gmp-display text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {collection && data?.id && <DownloadPdfButton collection={collection} docId={data.id} pdfUrl={data.pdfUrl} />}
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><X size={18} /></button>
          </div>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto gmp-scroll">
          <table className="w-full text-sm">
            <tbody>
              {fields.map((f) => (
                <tr key={f.key} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="py-2.5 pr-4 text-[var(--muted)] font-medium w-1/3 align-top">{f.label}</td>
                  <td className="py-2.5 text-[var(--text)]">{data[f.key] ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items && data.items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-[var(--text)] mb-3 uppercase tracking-wide">Detalle</h4>
              <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">P. Unit.</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((li, i) => {
                      const desc = li.articulo || li.art || li.descripcion || li.servicio || "-";
                      const cant = li.cant ?? li.cantidad ?? 1;
                      const pu = li.pu ?? li.precioVenta ?? 0;
                      const tot = li.total ?? 0;
                      const tipo = li.tipo || "repuesto";
                      const badge = tipo === "mano_obra" ? "bg-purple-100 text-purple-700 M.O." : tipo === "servicio" ? "bg-green-100 text-green-700 Serv." : "bg-blue-100 text-blue-700 Art.";
                      const [bg, txt, label] = badge.split(" ");
                      return (
                        <tr key={i} className="border-t border-[var(--line-soft)]">
                          <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${bg} ${txt}`}>{label}</span></td>
                          <td className="px-4 py-3 font-medium">{desc}</td>
                          <td className="px-4 py-3 text-right gmp-mono">{cant}</td>
                          <td className="px-4 py-3 text-right gmp-mono">S/ {Number(pu).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right gmp-mono">S/ {Number(tot).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
