import { useState, useCallback } from "react";
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
import { EMPLOYEE_ROLES, fbCreateUser } from "../../store/auth";
import { hashPassword } from "../../lib/authLib";
import { where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { showToast } from "../../components/ui/Toast";

const COL = "users";

// users_record.dart -> React
function fromFirestore(d) {
  return {
    id: d.id,
    auth_uid: d.auth_uid || '',
    displayName: d.display_name,
    email: d.email,
    telefono: d.phone_number,
    wsp: d.wsp,
    DNI: d.DNI,
    direccion: d.direccion,
    distrito: d.distrito,
    provincia: d.provincia,
    departamento: d.departamento,
    fechaNacimiento: d.fecha_de_nacimiento,
    edad: d.edad,
    sexo: d.sexo,
    cargoEmpleado: d.cargo_empleado,
    userRole: d.user_role,
  };
}

// React -> users_record.dart
function toFirestore(f) {
  return {
    display_name: f.displayName,
    email: f.email,
    phone_number: f.telefono,
    wsp: f.wsp,
    DNI: f.DNI,
    direccion: f.direccion,
    distrito: f.distrito,
    provincia: f.provincia,
    departamento: f.departamento,
    fecha_de_nacimiento: f.fechaNacimiento,
    edad: f.edad,
    sexo: f.sexo,
    cargo_empleado: f.cargoEmpleado,
  };
}

const empty = {
  displayName: "", email: "", telefono: "", wsp: "", DNI: "", direccion: "",
  distrito: "", provincia: "", departamento: "", fechaNacimiento: "", edad: "",
  sexo: "Masculino", cargoEmpleado: "", password: "",
};

export default function PersonalList() {
  const raw = useFirestoreCollection(COL, [where("user_role", "in", EMPLOYEE_ROLES)]);
  const items = raw.map(fromFirestore);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rows = items.filter((p) =>
    (p.displayName + p.email + p.DNI + p.direccion + p.cargoEmpleado + p.userRole)
      .toLowerCase()
      .includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const closeModal = useCallback(() => setModalOpen(false), []);
  const openNew = useCallback(() => { setEditing(null); setForm(empty); setModalOpen(true); }, []);
  const openEdit = useCallback((p) => { setEditing(p); setForm({ ...empty, ...p }); setModalOpen(true); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = toFirestore(form);
      if (!editing) {
        data.user_role = form.cargoEmpleado;
      }
      if (form.password) {
        data.password_hash = await hashPassword(form.password);
      }
      const newId = await saveMaestro(COL, { ...data, id: editing?.id });

      if (form.password && !editing) {
        const res = await fbCreateUser(form.email, form.password, editing?.id || newId);
        if (!res.ok) showToast(res.error || "Error al crear usuario en Auth", "error");
      }

      closeModal();
      showToast("Personal guardado");
    } catch {
      showToast("Error al guardar personal", "error");
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
      } catch (e) { console.warn("deleteAuthUser:", e); }
      setDeleteTarget(null);
      showToast("Personal eliminado");
    } catch {
      showToast("Error al eliminar personal", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Toolbar title="Personal" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "Personal")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, correo, DNI..." />
      <Table columns={["Nombre", "Correo", "Teléfono", "WSP", "DNI", "Dirección", "Distrito", "Cargo", "Rol", "Acción"]}
        rows={pageRows}
        renderRow={(p) => (
          <>
            <Td className="font-medium">{p.displayName}</Td>
            <Td className="text-[var(--muted)]">{p.email}</Td>
            <Td className="gmp-mono">{p.telefono}</Td>
            <Td>{p.wsp}</Td>
            <Td className="gmp-mono">{p.DNI}</Td>
            <Td className="text-[var(--muted)]">{p.direccion}</Td>
            <Td className="text-[var(--muted)]">{p.distrito}</Td>
            <Td className="text-[var(--muted)]">{p.cargoEmpleado}</Td>
            <Td className="text-[var(--muted)]">{p.userRole}</Td>
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
        <Modal title={editing ? "Editar Personal" : "Nuevo Personal"} onClose={closeModal}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" span><input className={inputCls} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} required /></Field>
            <Field label="Correo"><input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Teléfono"><input className={inputCls} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} /></Field>
            <Field label="WSP"><input className={inputCls} value={form.wsp} onChange={(e) => set("wsp", e.target.value)} /></Field>
            <Field label="DNI"><input className={inputCls} value={form.DNI} onChange={(e) => set("DNI", e.target.value)} /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Field>
            <Field label="Distrito"><input className={inputCls} value={form.distrito} onChange={(e) => set("distrito", e.target.value)} /></Field>
            <Field label="Provincia"><input className={inputCls} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></Field>
            <Field label="Departamento"><input className={inputCls} value={form.departamento} onChange={(e) => set("departamento", e.target.value)} /></Field>
            <Field label="Fecha nacimiento"><input className={inputCls} value={form.fechaNacimiento} onChange={(e) => set("fechaNacimiento", e.target.value)} /></Field>
            <Field label="Edad"><input type="number" className={inputCls} value={form.edad} onChange={(e) => set("edad", e.target.value)} /></Field>
            <Field label="Sexo">
              <select className={inputCls} value={form.sexo} onChange={(e) => set("sexo", e.target.value)}>
                {["Masculino", "Femenino", "Otro"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Cargo / Rol" span>
              <select className={inputCls} value={form.cargoEmpleado} onChange={(e) => set("cargoEmpleado", e.target.value)}>
                <option value="">Selecciona un cargo</option>
                {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={editing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"} span>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={editing ? "Dejar vacío para mantener" : "Asignar contraseña"} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={closeModal} disabled={saving}>Cancelar</Btn>
            <Btn onClick={handleSave} loading={saving}>{editing ? "Guardar cambios" : "Crear personal"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar personal" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar a {deleteTarget.displayName}?</p>
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


