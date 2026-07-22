import { useState } from "react";
import { Download } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import Table, { Td } from "../../components/ui/Table";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useFirestoreCollection } from "../../store/firestoreDb";
import { collection, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function KardexList() {
  const [filtroArticulo, setFiltroArticulo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const rows = useFirestoreCollection("Kardex_element", []);

  const filtered = rows.filter((k) => {
    if (filtroArticulo && !(k.Article_name || "").toLowerCase().includes(filtroArticulo.toLowerCase())) return false;
    if (filtroTipo && k.Document_Type !== filtroTipo) return false;
    return true;
  });

  const options = [...new Set(rows.map((k) => k.Article_name).filter(Boolean))];

  return (
    <div>
      <Toolbar title="Lista Kardex" count={filtered.length} onExport={() => {}} />
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <Field label="Producto">
          <select className={inputCls} value={filtroArticulo} onChange={(e) => setFiltroArticulo(e.target.value)}>
            <option value="">Todos</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select className={inputCls} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Salida">Salida</option>
          </select>
        </Field>
        <Btn variant="ghost" icon={Download}>R. Inv. Excel</Btn>
      </div>
      <Table columns={["Fecha", "Documento", "Artículo", "Descripción", "Cantidad", "Und", "P. Unit.", "Total", "OEM"]}
        rows={filtered}
        renderRow={(k) => (
          <>
            <Td className="text-[var(--muted)] text-xs">{k.Date}</Td>
            <Td className="gmp-mono text-xs">{k.Document_Type === "Ingreso" ? "COM" : "VEN"}-{String(k.Document_Number || 0).padStart(4, "0")}</Td>
            <Td className="font-medium">{k.Article_name || k.Code_Id || "—"}</Td>
            <Td className="text-[var(--muted)] text-xs max-w-[200px] truncate">{k.Description}</Td>
            <Td className={`gmp-mono ${Number(k.Quantity) < 0 ? "text-[var(--danger)]" : "text-green-600"}`}>{k.Quantity}</Td>
            <Td className="text-[var(--muted)]">{k.Unit}</Td>
            <Td className="gmp-mono">S/ {Number(k.PricePerUnit).toFixed(2)}</Td>
            <Td className="gmp-mono">S/ {Math.abs(Number(k.Total_Price)).toFixed(2)}</Td>
            <Td className="text-[var(--muted)] gmp-mono text-xs">{k.OEM}</Td>
          </>
        )}
      />
    </div>
  );
}
