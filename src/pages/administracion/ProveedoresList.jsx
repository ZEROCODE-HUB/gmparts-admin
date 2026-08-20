import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { validarDocumento } from "../../lib/documentos";
// Faltaba: el manejador de errores ya llamaba a showToast sin importarlo, así que un fallo
// al guardar un proveedor lanzaba «showToast is not defined» en vez de avisar.
import { showToast } from "../../components/ui/Toast";
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
    ruc: f.documento,
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
  const [sortField, setSortField] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = items
    .filter((p) =>
      (p.nombre + p.documento + p.razonSocial + p.correo + p.direccion + p.distrito).toLowerCase().includes(q.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      const va = a[sortField] ?? "", vb = b[sortField] ?? "";
      return String(va).localeCompare(String(vb)) * (sortDir === "asc" ? 1 : -1);
    });
  const handleSort = (k, d) => { setSortField(k); setSortDir(d); };
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const cleanForm = (c) => {
    const clean = {};
    for (const k in empty) clean[k] = c[k] ?? empty[k];
    return clean;
  };
  const openNew = () => { setSaving(false); setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p) => { setSaving(false); setEditing(p); setForm(cleanForm(p)); setModalOpen(true); };

  const handleSave = async () => {
    // Un proveedor emite facturas a nombre de la empresa, así que su documento es siempre un
    // RUC. Sin esta comprobación se cuela cualquier cosa y el problema aparece más tarde, al
    // registrar la compra.
    const doc = validarDocumento("RUC", form.documento);
    if (!doc.ok) { showToast(doc.error, "error"); return; }

    setSaving(true);
    try {
      await saveMaestro(COL, { ...toFirestore(form), id: editing?.id });
      setModalOpen(false);
      setToast("Proveedor guardado");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("undefined")) showToast("Completa todos los campos requeridos", "error");
      else if (msg.includes("permission")) showToast("No tienes permisos para realizar esta acción", "error");
      else showToast("Error al guardar. Verifica los datos e intenta de nuevo.", "error");
    } finally {
      setSaving(false);
    }
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
        sortable={[{key:"nombre",label:"Nombre"},{key:"documento",label:"Documento"},{key:"razonSocial",label:"Razón Social"},{key:"correo",label:"Correo"},{key:"celular",label:"Celular"},{key:"direccion",label:"Dirección"},{key:"distrito",label:"Distrito"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        
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
            <Btn onClick={handleSave} loading={saving}>{editing ? "Guardar cambios" : "Crear proveedor"}</Btn>
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


