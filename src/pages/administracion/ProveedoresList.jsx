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

const COL = "Proveedores";

function fromFirestore(d) {
  return {
    id: d.id,
    nombre: d.nombre,
    documento: d.Documento,
    razonSocial: d.razon_social,
    correo: d.correo,
    celular: d.celular,
    wps: d.wps,
    direccion: d.dirreccion_fiscal,
    distrito: d.distrito,
    provincia: d.provincia,
    departamento: d.departamento,
    website: d.website,
    categoria: d.categoria,
  };
}
function toFirestore(f) {
  return {
    nombre: f.nombre,
    Documento: f.documento,
    razon_social: f.razonSocial,
    ruc: f.razonSocial,
    correo: f.correo,
    celular: Number(f.celular) || 0,
    wps: f.wps,
    dirreccion_fiscal: f.direccion,
    distrito: f.distrito,
    provincia: f.provincia,
    departamento: f.departamento,
    website: f.website,
    categoria: f.categoria,
  };
}
const empty = {
  nombre: "", documento: "", razonSocial: "", correo: "", celular: "", wps: "",
  direccion: "", distrito: "", provincia: "", departamento: "", website: "", categoria: "",
};

export default function ProveedoresList() {
  const items = useFirestoreCollection(COL).map(fromFirestore);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const rows = items.filter((p) =>
    (p.nombre + p.documento + p.razonSocial + p.correo + p.direccion + p.distrito)
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p }); setModalOpen(true); };

  const handleSave = async () => {
    await saveMaestro(COL, { ...toFirestore(form), id: editing ? form.id : undefined });
    setModalOpen(false);
    setToast("Proveedor guardado");
    setTimeout(() => setToast(null), 2000);
  };
  const confirmDelete = async () => {
    if (deleteTarget) await deleteMaestro(COL, deleteTarget.id);
    setDeleteTarget(null);
    setToast("Proveedor eliminado");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div>
      <Toolbar title="Proveedores" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Proveedores")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, documento, RUC..." />
      <Table columns={["Nombre", "Documento", "Razón Social", "Correo", "Celular", "Dirección", "Distrito", "Acción"]}
        rows={pageRows}
        renderRow={(p) => (
          <>
            <Td className="font-medium">{p.nombre}</Td>
            <Td>{p.documento}</Td>
            <Td>{p.razonSocial}</Td>
            <Td className="text-[var(--muted)]">{p.correo}</Td>
            <Td className="gmp-mono">{p.celular}</Td>
            <Td className="text-[var(--muted)]">{p.direccion}</Td>
            <Td className="text-[var(--muted)]">{p.distrito}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {modalOpen && (
        <Modal title={editing ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={() => setModalOpen(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" span><input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required /></Field>
            <Field label="Documento"><input className={inputCls} value={form.documento} onChange={(e) => set("documento", e.target.value)} /></Field>
            <Field label="Razón Social" span><input className={inputCls} value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} /></Field>
            <Field label="Correo"><input className={inputCls} value={form.correo} onChange={(e) => set("correo", e.target.value)} /></Field>
            <Field label="Celular"><input type="number" className={inputCls} value={form.celular} onChange={(e) => set("celular", e.target.value)} /></Field>
            <Field label="WSP"><input className={inputCls} value={form.wps} onChange={(e) => set("wps", e.target.value)} /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Field>
            <Field label="Distrito"><input className={inputCls} value={form.distrito} onChange={(e) => set("distrito", e.target.value)} /></Field>
            <Field label="Provincia"><input className={inputCls} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></Field>
            <Field label="Departamento"><input className={inputCls} value={form.departamento} onChange={(e) => set("departamento", e.target.value)} /></Field>
            <Field label="Website"><input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
            <Field label="Categoría"><input className={inputCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>{editing ? "Guardar cambios" : "Crear proveedor"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar proveedor" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar a {deleteTarget.nombre}?</p>
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

