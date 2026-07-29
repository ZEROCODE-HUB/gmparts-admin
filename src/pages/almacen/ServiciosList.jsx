import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { Pencil, Trash2 } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useFirestoreCollection, saveMaestro, deleteMaestro } from "../../store/firestoreDb";
import { useCatalog } from "../../store/useCatalog";
import { showToast } from "../../components/ui/Toast";

const COL = "service";

const empty = {
  Codigo: "", Descripcion: "", Precio: "", Currency: "PEN", Note: "", Alert_in_days: "",
  marcabrand: "", model: "", year: "", Sistema: "", Tipo_de_servicio: "", Categoria_MTC: "", Tipo_de_vehiculo: "", Carroceria: "",
};

export default function ServiciosList() {
  const items = useFirestoreCollection(COL);
  const marcaOpts = useCatalog("cat-vehmarca");
  const modeloOpts = useCatalog("cat-vehmodelo");

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = items.filter((s) =>
    (s.Codigo + s.Descripcion + s.marcabrand + s.model + s.Sistema + s.Tipo_de_servicio)
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...empty, ...s }); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMaestro(COL, { ...form, id: editing?.id || form.id });
      setModalOpen(false);
      showToast("Servicio guardado");
    } catch {
      showToast("Error al guardar servicio", "error");
    }
    setSaving(false);
  };
  const confirmDelete = async () => {
    try {
      await deleteMaestro(COL, deleteTarget.id);
      setDeleteTarget(null);
      showToast("Servicio eliminado");
    } catch {
      showToast("Error al eliminar servicio", "error");
    }
  };

  return (
    <div>
      <Toolbar title="Servicios" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Servicios")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar código, descripción, marca..." />
      <Table columns={["Código", "Descripción", "Precio", "Moneda", "Marca", "Modelo", "Año", "Sistema", "Tipo", "Cat. MTC", "Carrocería", "Acción"]}
        rows={pageRows}
        renderRow={(s) => (
          <>
            <Td><span className="gmp-mono text-[var(--muted)]">{s.Codigo}</span></Td>
            <Td className="font-medium">{s.Descripcion}</Td>
            <Td className="gmp-mono">{s.Precio}</Td>
            <Td className="text-[var(--muted)]">{s.Currency}</Td>
            <Td className="text-[var(--muted)]">{s.marcabrand}</Td>
            <Td className="text-[var(--muted)]">{s.model}</Td>
            <Td className="gmp-mono">{s.year}</Td>
            <Td className="text-[var(--muted)]">{s.Sistema}</Td>
            <Td className="text-[var(--muted)]">{s.Tipo_de_servicio}</Td>
            <Td className="text-[var(--muted)]">{s.Categoria_MTC}</Td>
            <Td className="text-[var(--muted)]">{s.Tipo_de_vehiculo}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {modalOpen && (
        <Modal title={editing ? "Editar Servicio" : "Nuevo Servicio"} onClose={() => setModalOpen(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código"><input className={inputCls} value={form.Codigo} onChange={(e) => set("Codigo", e.target.value)} /></Field>
            <Field label="Descripción" span><input className={inputCls} value={form.Descripcion} onChange={(e) => set("Descripcion", e.target.value)} required /></Field>
            <Field label="Precio"><input className={inputCls} value={form.Precio} onChange={(e) => set("Precio", e.target.value)} /></Field>
            <Field label="Moneda">
              <select className={inputCls} value={form.Currency} onChange={(e) => set("Currency", e.target.value)}>
                {["PEN", "USD"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Nota"><input className={inputCls} value={form.Note} onChange={(e) => set("Note", e.target.value)} /></Field>
            <Field label="Alerta (días)"><input className={inputCls} value={form.Alert_in_days} onChange={(e) => set("Alert_in_days", e.target.value)} /></Field>
            <Field label="Marca">
              <select className={inputCls} value={form.marcabrand} onChange={(e) => set("marcabrand", e.target.value)}>
                <option value="">Selecciona</option>
                {marcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Modelo">
              <select className={inputCls} value={form.model} onChange={(e) => set("model", e.target.value)}>
                <option value="">Selecciona</option>
                {modeloOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Año"><input className={inputCls} value={form.year} onChange={(e) => set("year", e.target.value)} /></Field>
            <Field label="Sistema"><input className={inputCls} value={form.Sistema} onChange={(e) => set("Sistema", e.target.value)} /></Field>
            <Field label="Tipo de servicio"><input className={inputCls} value={form.Tipo_de_servicio} onChange={(e) => set("Tipo_de_servicio", e.target.value)} /></Field>
            <Field label="Categoría MTC"><input className={inputCls} value={form.Categoria_MTC} onChange={(e) => set("Categoria_MTC", e.target.value)} /></Field>
            <Field label="Carrocería"><input className={inputCls} value={form.Tipo_de_vehiculo} onChange={(e) => set("Tipo_de_vehiculo", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleSave} loading={saving}>{editing ? "Guardar cambios" : "Crear servicio"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar servicio" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar {deleteTarget.Codigo}?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmDelete}>Eliminar</Btn>
          </div>
        </Modal>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
