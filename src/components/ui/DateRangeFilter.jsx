import { X } from "lucide-react";
const inputDate = "bg-[var(--panel-2)] rounded-lg px-2 py-1.5 text-xs text-[var(--text)] gmp-focus";

export default function DateRangeFilter({ fechaDesde, fechaHasta, onChange }) {
  const setDesde = (v) => onChange(v, fechaHasta);
  const setHasta = (v) => onChange(fechaDesde, v);
  const limpiar = () => onChange("", "");

  return (
    <div className="flex items-center gap-1.5 mb-3">
      <input type="date" className={inputDate} value={fechaDesde} onChange={(e) => setDesde(e.target.value)} title="Fecha desde" style={{ width: 130 }} />
      <span className="text-[10px] text-[var(--muted)]">→</span>
      <input type="date" className={inputDate} value={fechaHasta} onChange={(e) => setHasta(e.target.value)} title="Fecha hasta" style={{ width: 130 }} />
      {(fechaDesde || fechaHasta) && (
        <button onClick={limpiar} className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Limpiar filtro">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
