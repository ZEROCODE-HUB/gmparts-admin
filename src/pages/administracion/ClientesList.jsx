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
import { where } from "firebase/firestore";

const COL = "users";

function fromFirestore(d) {
  return {
    id: d.id,
    codigo: d.codigo,
    nombre: d.display_name,
    documento: d.IdentityDocument,
    tipoDocumento: d.tipo_de_documento,
    tipoPersona: d.tipo_de_persona,
    email: d.email,
    telefono: d.phone_number,
    wsp: d.wsp,
    direccion: d.direccion,
    distrito: d.distrito,
    provincia: d.provincia,
    departamento: d.departamento,
    encargado: d.encargado,
  };
}
function toFirestore(f) {
  return {
    display_name: f.nombre,
    IdentityDocument: f.documento,
    tipo_de_documento: f.tipoDocumento,
    tipo_de_persona: f.tipoPersona,
    email: f.email,
    phone_number: f.telefono,
    wsp: f.wsp,
    direccion: f.direccion,
    distrito: f.distrito,
    provincia: f.provincia,
    departamento: f.departamento,
    codigo: f.codigo,
    encargado: f.encargado,
    user_role: "Cliente",
  };
}
const empty = {
  codigo: "", nombre: "", documento: "", tipoDocumento: "DNI", tipoPersona: "Persona",
  email: "", telefono: "", wsp: "", direccion: "", distrito: "", provincia: "", departamento: "", encargado: "",
};

export default function ClientesList() {
  const raw = useFirestoreCollection(COL, [where("user_role", "==", "Cliente")]);
  const items = raw.map(fromFirestore);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = items.filter((c) =>
    (c.codigo + c.nombre + c.documento + c.direccion + c.email + c.distrito)
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cleanForm = (c) => {
    const clean = {};
    for (const k in empty) clean[k] = c[k] ?? empty[k];
    return clean;
  };
  const openNew = () => { setError(""); setSaving(false); setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c) => { setError(""); setSaving(false); setEditing(c); setForm(cleanForm(c)); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveMaestro(COL, { ...toFirestore(form), id: editing ? form.id : undefined });
      setModalOpen(false);
      setToast("Cliente guardado");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("undefined")) setError("Completa todos los campos requeridos");
      else if (msg.includes("permission")) setError("No tienes permisos para realizar esta acci\u00f3n");
      else setError("Error al guardar. Verifica los datos e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (deleteTarget) await deleteMaestro(COL, deleteTarget.id);
    setDeleteTarget(null);
    setToast("Cliente eliminado");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div>
      <Toolbar title="Clientes" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Clientes")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar código, nombre, documento..." />
      <Table columns={["Código", "Documento", "Nombre", "Dirección", "Correo", "Teléfono", "Distrito", "Tipo", "Acción"]}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td><span className="gmp-mono text-[var(--muted)]">{c.codigo}</span></Td>
            <Td>{c.documento}</Td>
            <Td className="font-medium">{c.nombre}</Td>
            <Td className="text-[var(--muted)]">{c.direccion}</Td>
            <Td className="text-[var(--muted)]">{c.email}</Td>
            <Td className="gmp-mono">{c.telefono}</Td>
            <Td className="text-[var(--muted)]">{c.distrito}</Td>
            <Td className="text-[var(--muted)]">{c.tipoPersona}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {modalOpen && (
        <Modal title={editing ? "Editar Cliente" : "Nuevo Cliente"} onClose={() => setModalOpen(false)}>
          {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código"><input className={inputCls} value={form.codigo} onChange={(e) => set("codigo", e.target.value)} /></Field>
            <Field label="Nombre" span><input className={inputCls} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} required /></Field>
            <Field label="Documento"><input className={inputCls} value={form.documento} onChange={(e) => set("documento", e.target.value)} /></Field>
            <Field label="Tipo documento">
              <select className={inputCls} value={form.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value)}>
                {["DNI", "RUC", "CE"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Tipo persona">
              <select className={inputCls} value={form.tipoPersona} onChange={(e) => set("tipoPersona", e.target.value)}>
                {["Persona", "Empresa"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Correo"><input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
            <Field label="WSP"><input className={inputCls} value={form.wsp} onChange={(e) => set("wsp", e.target.value)} /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Field>
            <Field label="Distrito"><input className={inputCls} value={form.distrito} onChange={(e) => set("distrito", e.target.value)} /></Field>
            <Field label="Provincia"><input className={inputCls} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></Field>
            <Field label="Departamento"><input className={inputCls} value={form.departamento} onChange={(e) => set("departamento", e.target.value)} /></Field>
            <Field label="Encargado"><input className={inputCls} value={form.encargado} onChange={(e) => set("encargado", e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={handleSave} loading={saving}>{editing ? "Guardar cambios" : "Crear cliente"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar cliente" onClose={() => setDeleteTarget(null)}>
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


