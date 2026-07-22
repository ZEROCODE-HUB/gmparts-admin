import { useState } from "react";
import { Tags } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useCatalog } from "../../store/useCatalog";
import { addCatalogEntry, deleteCatalogEntry } from "../../store/firestoreDb";

const CATALOGS = [
  { key: "cat-marca", label: "Marcas de artículo", collection: "article_brand_marca" },
  { key: "cat-grupo", label: "Grupos", collection: "Group" },
  { key: "cat-subgrupo", label: "Subgrupos", collection: "subgroup" },
  { key: "cat-unidad", label: "Unidades de medida", collection: "measurement_unit" },
  { key: "cat-vehmarca", label: "Marcas de vehículo", collection: "vehicle_marca_brand" },
  { key: "cat-vehmodelo", label: "Modelos de vehículo", collection: "vehicle_model_modelo" },
  { key: "cat-encargado", label: "Encargados", collection: "encargados" },
];

function CatalogCard({ catalog }) {
  const options = useCatalog(catalog.key);
  const [value, setValue] = useState("");

  const handleAdd = async () => {
    const v = value.trim();
    if (!v) return;
    await addCatalogEntry(catalog.key, v);
    setValue("");
  };

  const handleDelete = async (opt) => {
    if (opt.seed) return; // los de semilla no se borran de Firestore
    await deleteCatalogEntry(catalog.key, opt.id);
  };

  return (
    <div className="bg-[var(--panel)] rounded-lg p-5 border border-[var(--line-soft)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text)]">{catalog.label}</h3>
        <span className="gmp-mono text-[10px] text-[var(--muted)]">{catalog.collection}</span>
      </div>
      <div className="flex gap-2 mb-3">
        <Field label="">
          <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nuevo valor" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        </Field>
        <Btn onClick={handleAdd}>Agregar</Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && <span className="text-xs text-[var(--muted)]">Sin registros</span>}
        {options.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-xs text-[var(--text)] border border-[var(--line-soft)]">
            {o.name}
            {!o.seed && (
              <button onClick={() => handleDelete(o)} className="text-[var(--muted)] hover:text-[var(--danger)]" aria-label="Eliminar">×</button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Catalogos() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]"><Tags size={18} /></div>
        <div>
          <h1 className="gmp-display text-xl font-bold">Catálogos</h1>
          <p className="text-xs text-[var(--muted)]">Maestros simples conectados a Firestore (Fase D1)</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATALOGS.map((c) => <CatalogCard key={c.key} catalog={c} />)}
      </div>
    </div>
  );
}
