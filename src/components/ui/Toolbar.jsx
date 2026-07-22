import { Plus, Download } from "lucide-react";
import Btn from "./Btn";

export default function Toolbar({ title, count, onNew, onExport, newLabel = "Crear nuevo" }) {
  return (
    <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 className="gmp-display text-xl font-bold text-[var(--text)]">{title}</h1>
        {count !== undefined && <p className="text-xs text-[var(--muted)] mt-1">{count} registros</p>}
      </div>
      <div className="flex gap-2">
        {onExport && <Btn variant="ghost" icon={Download} onClick={onExport}>Descargar</Btn>}
        {onNew && <Btn icon={Plus} onClick={onNew}>{newLabel}</Btn>}
      </div>
    </div>
  );
}
