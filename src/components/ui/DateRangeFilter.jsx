import { X } from "lucide-react";
const inputCls = "bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] gmp-focus w-full";

export default function DateRangeFilter({ fechaDesde, fechaHasta, onChange }) {
  const setDesde = (v) => onChange(v, fechaHasta);
  const setHasta = (v) => onChange(fechaDesde, v);
  const limpiar = () => onChange("", "");

  return (
    <div className="flex items-center gap-2 mb-3">
      <input type="date" className={`${inputCls} w-36`} value={fechaDesde} onChange={(e) => setDesde(e.target.value)} placeholder="Desde" title="Fecha desde" />
      <span className="text-xs text-[var(--muted)]">→</span>
      <input type="date" className={`${inputCls} w-36`} value={fechaHasta} onChange={(e) => setHasta(e.target.value)} placeholder="Hasta" title="Fecha hasta" />
      {(fechaDesde || fechaHasta) && (
        <button onClick={limpiar} className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Limpiar filtro">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
