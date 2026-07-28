import { useState } from "react";
import { Tags, Edit2, Search } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import { useCatalog } from "../../store/useCatalog";
import { addCatalogEntry, editCatalogEntry, deleteCatalogEntry } from "../../store/firestoreDb";
import { showToast } from "../../components/ui/Toast";

const CATALOGS = [
  { key: "cat-marca", label: "Marcas de artículo", desc: "Marcas comerciales de productos y repuestos" },
  { key: "cat-grupo", label: "Grupos", desc: "Grupos de artículos (Frenos, Filtros, Motor…)" },
  { key: "cat-subgrupo", label: "Subgrupos", desc: "Subgrupos asociados a un grupo",
    parentKey: "cat-grupo", parentLabel: "Grupo", parentField: "grupo" },
  { key: "cat-unidad", label: "Unidades de medida", desc: "Unidad, Litro, Kilogramo, Caja…" },
  { key: "cat-vehmarca", label: "Marcas de vehículo", desc: "Toyota, Nissan, Ford…" },
  { key: "cat-vehmodelo", label: "Modelos de vehículo", desc: "Modelos asociados a una marca",
    parentKey: "cat-vehmarca", parentLabel: "Marca", parentField: "marca" },
  { key: "cat-encargado", label: "Encargados", desc: "Personas responsables" },
];

function resolveParent(item, field) {
  if (item.seed) return item[field] || "";
  const v = item.raw?.[field];
  if (v) return v;
  if (field === "grupo") return item.raw?.groupname || "";
  return "";
}

function displayLabel(item, catalog) {
  if (!catalog.parentField) return item.name;
  const p = resolveParent(item, catalog.parentField);
  return p ? `${item.name} (${p})` : item.name;
}

function CatalogPanel({ catalog }) {
  const items = useCatalog(catalog.key);
  const parentItems = useCatalog(catalog.parentKey || "");

  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const filtered = search.trim()
    ? items.filter((o) => displayLabel(o, catalog).toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleAdd = async () => {
    const v = newName.trim();
    if (!v) return;
    setAdding(true);
    try {
      const extra = catalog.parentField && newParent ? { [catalog.parentField]: newParent } : {};
      await addCatalogEntry(catalog.key, v, extra);
      setNewName("");
      setNewParent("");
      showToast("Creado");
    } catch {
      showToast("Error al crear", "error");
    }
    setAdding(false);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditName(item.name);
    if (catalog.parentField) setEditParent(resolveParent(item, catalog.parentField));
  };

  const handleEdit = async () => {
    const v = editName.trim();
    if (!v) return;
    setSavingEdit(true);
    try {
      const extra = catalog.parentField && editParent ? { [catalog.parentField]: editParent } : {};
      await editCatalogEntry(catalog.key, editItem.id, v, extra);
      setEditItem(null);
      showToast("Actualizado");
    } catch {
      showToast("Error al actualizar", "error");
    }
    setSavingEdit(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      await deleteCatalogEntry(catalog.key, item.id);
      showToast("Eliminado");
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  return (
    <div className="bg-[var(--panel)] rounded-lg border border-[var(--line-soft)]">
      <div className="px-5 py-4 border-b border-[var(--line-soft)]">
        <h3 className="text-sm font-semibold">{catalog.label}</h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">{catalog.desc}</p>
      </div>

      <div className="px-5 py-4 border-b border-[var(--line-soft)]">
        <div className="flex gap-2 items-end">
          {catalog.parentField && (
            <Field label={catalog.parentLabel}>
              <select className={inputCls} value={newParent} onChange={(e) => setNewParent(e.target.value)}>
                <option value="">Selecciona {catalog.parentLabel}</option>
                {parentItems.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="">
            <input
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </Field>
          <Btn onClick={handleAdd} loading={adding}>Agregar</Btn>
        </div>
      </div>

      <div className="px-5 py-4">
        {items.length > 8 && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className={`${inputCls} pl-8`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {filtered.length === 0 && (
            <span className="text-xs text-[var(--muted)] py-2">
              {search ? "Sin resultados" : "Sin registros"}
            </span>
          )}
          {filtered.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-xs text-[var(--text)] border border-[var(--line-soft)] group"
            >
              {displayLabel(o, catalog)}
              {!o.seed && (
                <>
                  <button
                    onClick={() => openEdit(o)}
                    className="text-[var(--muted)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(o)}
                    className="text-[var(--muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Eliminar"
                  >
                    ×
                  </button>
                </>
              )}
            </span>
          ))}
        </div>
      </div>

      {editItem && (
        <Modal title={`Editar`} subtitle={catalog.label.slice(0, -1)} onClose={() => setEditItem(null)}>
          {catalog.parentField && (
            <Field label={catalog.parentLabel}>
              <select className={inputCls} value={editParent} onChange={(e) => setEditParent(e.target.value)}>
                <option value="">Selecciona {catalog.parentLabel}</option>
                {parentItems.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Nombre">
            <input
              className={inputCls}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
          </Field>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
            <Btn variant="ghost" onClick={() => setEditItem(null)}>Cancelar</Btn>
            <Btn onClick={handleEdit} loading={savingEdit}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function Catalogos() {
  const [activeKey, setActiveKey] = useState(CATALOGS[0].key);
  const activeCatalog = CATALOGS.find((c) => c.key === activeKey);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]"><Tags size={18} /></div>
        <div>
          <h1 className="gmp-display text-xl font-bold">Catálogos</h1>
          <p className="text-xs text-[var(--muted)]">Administración de maestros simples</p>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="w-44 flex-shrink-0">
          <div className="bg-[var(--panel)] rounded-lg border border-[var(--line-soft)] overflow-hidden">
            {CATALOGS.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveKey(c.key)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-[var(--line-soft)] last:border-b-0 ${
                  activeKey === c.key
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] font-semibold"
                    : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {activeCatalog && <CatalogPanel key={activeCatalog.key} catalog={activeCatalog} />}
        </div>
      </div>
    </div>
  );
}
