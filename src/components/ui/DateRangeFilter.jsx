import { X } from "lucide-react";

export default function DateRangeFilter({ fechaDesde, fechaHasta, onChange }) {
  const setDesde = (v) => onChange(v, fechaHasta);
  const setHasta = (v) => onChange(fechaDesde, v);
  const limpiar = () => onChange("", "");

  if (!fechaDesde && !fechaHasta) {
    return (
      <div className="flex items-center gap-2 mb-3">
        <input type="date" className="gmp-input text-xs w-36" value={fechaDesde} onChange={(e) => setDesde(e.target.value)} placeholder="Desde" title="Fecha desde" />
        <span className="text-xs text-[var(--muted)]">→</span>
        <input type="date" className="gmp-input text-xs w-36" value={fechaHasta} onChange={(e) => setHasta(e.target.value)} placeholder="Hasta" title="Fecha hasta" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-3">
      <input type="date" className="gmp-input text-xs w-36" value={fechaDesde} onChange={(e) => setDesde(e.target.value)} title="Fecha desde" />
      <span className="text-xs text-[var(--muted)]">→</span>
      <input type="date" className="gmp-input text-xs w-36" value={fechaHasta} onChange={(e) => setHasta(e.target.value)} title="Fecha hasta" />
      <button onClick={limpiar} className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Limpiar filtro">
        <X size={14} />
      </button>
    </div>
  );
}
