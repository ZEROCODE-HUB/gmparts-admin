import { useState, useCallback } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useFirestoreCollection, saveMaestro, deleteMaestro } from "../../store/firestoreDb";
import { fbCreateUser } from "../../store/auth";
import { hashPassword } from "../../lib/authLib";
import { where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { showToast } from "../../components/ui/Toast";

const COL = "users";

function fromFirestore(d) {
  return {
    id: d.id,
    auth_uid: d.auth_uid || '',
    codigo: d.codigo,
    nombre: d.display_name,
    documento: d.IdentityDocument,
    tipoDocumento: d.tipo_de_documento,
    tipoPersona: d.tipo_de_persona === "Persona" ? "Natural" : d.tipo_de_persona === "Empresa" ? "Jurídica" : d.tipo_de_persona || "Natural",
    email: d.email,
    telefono: d.phone_number,
    wsp: d.wsp,
    direccion: d.direccion,
    distrito: d.distrito,
    provincia: d.provincia,
    departamento: d.departamento,
    encargado: d.encargado,
    password: d.password_plain || '',
    created_time: d.created_time || "",
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
  codigo: "", nombre: "", documento: "", tipoDocumento: "DNI", tipoPersona: "Natural",
  email: "", telefono: "", wsp: "", direccion: "", distrito: "", provincia: "", departamento: "",
  encargado: "", password: "",
};

export default function ClientesList() {
  const raw = useFirestoreCollection(COL, [where("user_role", "==", "Cliente")]);
  const items = raw.map(fromFirestore);

  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("created_time");
  const [sortDir, setSortDir] = useState("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const rows = items
    .filter((c) =>
      (c.codigo + c.nombre + c.documento + c.direccion + c.email + c.distrito).toLowerCase().includes(q.toLowerCase())
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

  const closeModal = useCallback(() => setModalOpen(false), []);

  const cleanForm = (c) => {
    const clean = {};
    for (const k in empty) clean[k] = c[k] ?? empty[k];
    return clean;
  };
  const openNew = useCallback(() => { setSaving(false); setEditing(null); setForm(empty); setModalOpen(true); }, []);
  const openEdit = useCallback((c) => { setSaving(false); setEditing(c); setForm(cleanForm(c)); setModalOpen(true); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = toFirestore(form);
      if (form.password) {
        data.password_hash = await hashPassword(form.password);
        data.password_plain = form.password;
      }

      if (!editing && form.password) {
        const res = await fbCreateUser(form.email, form.password);
        if (!res.ok) { showToast(res.error || "Error al crear usuario", "error"); setSaving(false); return; }
        const { setDoc, doc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase");
        await setDoc(doc(db, COL, res.uid), { ...data, password_hash: data.password_hash || '', auth_uid: res.uid });
      } else {
        await saveMaestro(COL, { ...data, id: editing?.id });
      }

      closeModal();
      const pwd = form.password;
      showToast(pwd ? `Cliente guardado — Contraseña: ${pwd}` : "Cliente guardado");
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
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMaestro(COL, deleteTarget.id);
      try {
        const fn = httpsCallable(functions, "deleteAuthUser");
        await fn({ uid: deleteTarget.auth_uid || deleteTarget.id, email: deleteTarget.email });
      } catch { /* si no existe en Auth, ignorar */ }
      setDeleteTarget(null);
      showToast("Cliente eliminado");
    } catch {
      showToast("Error al eliminar cliente", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Toolbar title="Clientes" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Clientes")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar código, nombre, documento..." />
      <Table columns={["Código", "Documento", "Nombre", "Dirección", "Correo", "Teléfono", "Distrito", "Tipo", "Acción"]}
        sortable={[{key:"codigo",label:"Código"},{key:"nombre",label:"Nombre"},{key:"documento",label:"Documento"},{key:"direccion",label:"Dirección"},{key:"email",label:"Correo"},{key:"telefono",label:"Teléfono"},{key:"distrito",label:"Distrito"},{key:"tipoPersona",label:"Tipo"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
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
        <Modal title={editing ? "Editar Cliente" : "Nuevo Cliente"} onClose={closeModal}>
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
                {["Natural", "Jurídica"].map((o) => <option key={o} value={o}>{o}</option>)}
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
            <Field label={editing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"} span>
              <div className="flex gap-1">
                <input type={showPassword ? "text" : "password"} className={inputCls} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={editing ? "Dejar vacío para mantener" : "Asignar contraseña"} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" tabIndex={-1}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={closeModal} disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleSave} loading={saving}>{editing ? "Guardar cambios" : "Crear cliente"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar cliente" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar a {deleteTarget.nombre}?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmDelete} loading={deleting}>Eliminar</Btn>
          </div>
        </Modal>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}


