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

const COL = "Almacen";
const empty = { Nombre: "", Direccion: "", Ciudad: "" };

export default function AlmacenesList() {
  const items = useFirestoreCollection(COL);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const rows = items.filter((a) =>
    (a.Nombre + a.Direccion + a.Ciudad).toLowerCase().includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (a) => { setEditing(a); setForm({ ...empty, ...a }); setModalOpen(true); };

  const handleSave = async () => {
    await saveMaestro(COL, { ...form, id: editing ? form.id : undefined });
    setModalOpen(false);
    setToast("Almacén guardado");
    setTimeout(() => setToast(null), 2000);
  };
  const confirmDelete = async () => {
    if (deleteTarget) await deleteMaestro(COL, deleteTarget.id);
    setDeleteTarget(null);
    setToast("Almacén eliminado");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div>
      <Toolbar title="Almacenes" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Almacenes")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, ciudad..." />
      <Table columns={["Nombre", "Dirección", "Ciudad", "Acción"]}
        rows={pageRows}
        renderRow={(a) => (
          <>
            <Td className="font-medium">{a.Nombre}</Td>
            <Td className="text-[var(--muted)]">{a.Direccion}</Td>
            <Td className="text-[var(--muted)]">{a.Ciudad}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {modalOpen && (
        <Modal title={editing ? "Editar Almacén" : "Nuevo Almacén"} onClose={() => setModalOpen(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" span><input className={inputCls} value={form.Nombre} onChange={(e) => set("Nombre", e.target.value)} required /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.Direccion} onChange={(e) => set("Direccion", e.target.value)} /></Field>
            <Field label="Ciudad"><input className={inputCls} value={form.Ciudad} onChange={(e) => set("Ciudad", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>{editing ? "Guardar cambios" : "Crear almacén"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar almacén" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar {deleteTarget.Nombre}?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmDelete}>Eliminar</Btn>
          </div>
        </Modal>
      )}

      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}


