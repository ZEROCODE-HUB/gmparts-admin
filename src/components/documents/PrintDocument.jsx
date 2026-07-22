import { X, Printer } from "lucide-react";
import Btn from "../ui/Btn";

function Field({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// Layout de impresión de comprobante (front-only). El PDF real vía Firebase custom
// function se implementa en el backend (Fase C). Aquí solo se prepara el documento
// imprimible con window.print() y reglas @media print en index.css.
export default function PrintDocument({ title = "Documento", data, onClose }) {
  const items = data?.items || data?.diagnosticos || [];
  const isOT = !!data?.diagnosticos;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto gmp-scroll bg-black/60 p-6">
      <div className="bg-white text-black w-full max-w-2xl mt-4 rounded shadow-lg print-area">
        <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200">
          <div>
            <p className="font-bold text-lg leading-none">GM PARTS S.A.C.</p>
            <p className="text-[10px] tracking-wide text-gray-500">RUC: 20601234567</p>
            <p className="text-[10px] tracking-wide text-gray-500">Av. Principal 1234 - Lima</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{title}</p>
            <p className="text-sm">{data?.nserie || data?.serie || ""} {data?.numero || ""}</p>
            {data?.numeroorden ? <p className="text-sm">OT N° {data.numeroorden}</p> : null}
          </div>
        </div>

        <div className="px-8 py-5 grid grid-cols-2 gap-4">
          <Field label="Serie" value={data?.nserie || data?.serie} />
          <Field label="N\u00famero" value={data?.numero} />
          <Field label="Fecha" value={data?.Fecha || data?.fecha || data?.fecha_creacion} />
          <Field label="Cliente" value={data?.razonSNombre || data?.cliente} />
          <Field label="RUC/DNI" value={data?.clienteDoc} />
          <Field label="Estado" value={data?.Estado || data?.estado} />
          <Field label="Forma de pago" value={data?.FPago || data?.formaPago} />
          <Field label="Almac\u00e9n" value={data?.almacen} />
          <Field label="Placa" value={data?.placa} />
        </div>

        <div className="px-8 pb-6">
          {isOT ? (
            <table className="w-full text-sm border-t border-gray-200">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-500">
                  <th className="py-2">Diagnóstico</th><th className="py-2">Solución</th><th className="py-2 text-right">M.O.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2">{d.nombreFalla}</td>
                    <td className="py-2">{d.solucion}</td>
                    <td className="py-2 text-right">S/ {Number(d.manoDeObra || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : items.length > 0 ? (
            <table className="w-full text-sm border-t border-gray-200">
              <thead>
                <tr className="text-left text-[11px] uppercase text-gray-500">
                  <th className="py-2">C\u00f3digo</th><th className="py-2">Descripci\u00f3n</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">P. Unit.</th><th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 gmp-mono">{it.codigo || ""}</td>
                    <td className="py-2">{it.descripcion || it.articulo || ""}</td>
                    <td className="py-2 text-right">{it.cant ?? it.cantidad ?? 1}</td>
                    <td className="py-2 text-right">S/ {Number(it.pu || 0).toFixed(2)}</td>
                    <td className="py-2 text-right">S/ {Number(it.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <div className="flex flex-col items-end mt-4 gap-1 text-sm">
            {data?.subtotal != null && <div className="flex gap-8"><span className="text-gray-500">Subtotal:</span><span className="w-24 text-right">S/ {Number(data.subtotal).toFixed(2)}</span></div>}
            {data?.igv != null && <div className="flex gap-8"><span className="text-gray-500">IGV (18%):</span><span className="w-24 text-right">S/ {Number(data.igv).toFixed(2)}</span></div>}
            {data?.total != null && <div className="flex gap-8 font-bold border-t border-gray-200 pt-1 mt-1"><span>Total:</span><span className="w-24 text-right">S/ {Number(data.total).toFixed(2)}</span></div>}
          </div>
        </div>

        <div className="px-8 py-4 border-t border-gray-200 text-[11px] text-gray-500 no-print flex items-center justify-between">
          <span>GM Parts Admin — Documento generado en sistema</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2 no-print">
        <Btn onClick={() => window.print()}>Imprimir</Btn>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/90 hover:bg-white text-black"><X size={18} /></button>
      </div>
    </div>
  );
}
