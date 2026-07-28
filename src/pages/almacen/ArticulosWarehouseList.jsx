import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useFirestoreCollection, saveMaestro, deleteMaestro } from "../../store/firestoreDb";
const ALMACENES = [
  { id: "w1", Nombre: "Almacén Principal" },
  { id: "w2", Nombre: "Almacén Secundario" },
  { id: "w3", Nombre: "Depósito Taller" },
];

const COL = "Articles_Warehouse";
const DOC_TYPES = ["Ingreso", "Salida", "Ajuste", "Transferencia"];

const emptyLine = () => ({ Code: "", Quantity: 1, PricePerUnit: 0, TotalPrice: 0 });
const empty = () => ({
  Document_Type: "Ingreso",
  Serial_Number: "",
  Register_date: new Date().toISOString().split("T")[0],
  Warehouse: "",
  Observation: "",
  Articale_List: [],
});

export default function ArticulosWarehouseList() {
  const items = useFirestoreCollection(COL);

  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const rows = items.filter((a) =>
    (a.Document_Type + a.Serial_Number + a.Warehouse + a.Observation)
      .toLowerCase().includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      Document_Type: a.Document_Type || "Ingreso",
      Serial_Number: a.Serial_Number || "",
      Register_date: a.Register_date || new Date().toISOString().split("T")[0],
      Warehouse: a.Warehouse || "",
      Observation: a.Observation || "",
      Articale_List: (a.Articale_List || []).map((li) => ({ ...li })),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    await saveMaestro(COL, { ...form, id: editing ? form.id : undefined });
    setModalOpen(false);
    setToast("Movimiento de almacén guardado");
    setTimeout(() => setToast(null), 2000);
  };

  const confirmDelete = async () => {
    if (deleteTarget) await deleteMaestro(COL, deleteTarget.id);
    setDeleteTarget(null);
    setToast("Movimiento eliminado");
    setTimeout(() => setToast(null), 2000);
  };

  const addLine = () => {
    const line = emptyLine();
    setForm((p) => ({ ...p, Articale_List: [...(p.Articale_List || []), line] }));
  };

  const removeLine = (idx) => {
    setForm((p) => ({ ...p, Articale_List: p.Articale_List.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx, field, value) => {
    setForm((p) => {
      const list = [...(p.Articale_List || [])];
      list[idx] = { ...list[idx], [field]: value };
      if (field === "Quantity" || field === "PricePerUnit") {
        list[idx].TotalPrice = (Number(list[idx].Quantity) || 0) * (Number(list[idx].PricePerUnit) || 0);
      }
      return { ...p, Articale_List: list };
    });
  };

  return (
    <div>
      <Toolbar title="Movimientos por Almacén (Stock)" count={rows.length} onNew={openNew} onExport={() => exportToExcel(rows, "ArticulosWarehouse")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar tipo, serie, almacén..." />
      <Table columns={["Tipo", "Serie", "Fecha", "Almacén", "Artículos", "Observación", "Acción"]}
        rows={pageRows}
        renderRow={(a) => (
          <>
            <Td><span className="font-medium">{a.Document_Type}</span></Td>
            <Td className="gmp-mono text-[var(--muted)]">{a.Serial_Number}</Td>
            <Td className="text-[var(--muted)]">{a.Register_date || "-"}</Td>
            <Td className="text-[var(--muted)]">{a.Warehouse}</Td>
            <Td className="text-[var(--muted)]">{(a.Articale_List || []).length} ítem(s)</Td>
            <Td className="text-[var(--muted)] max-w-[200px] truncate">{a.Observation}</Td>
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
        <Modal title={editing ? "Editar Movimiento" : "Nuevo Movimiento"} onClose={() => setModalOpen(false)} wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Tipo de documento">
              <select className={inputCls} value={form.Document_Type} onChange={(e) => set("Document_Type", e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Número de serie">
              <input className={inputCls} value={form.Serial_Number} onChange={(e) => set("Serial_Number", e.target.value)} placeholder="Ej: ING-001" />
            </Field>
            <Field label="Fecha de registro">
              <input type="date" className={inputCls} value={form.Register_date} onChange={(e) => set("Register_date", e.target.value)} />
            </Field>
            <Field label="Almacén">
              <select className={inputCls} value={form.Warehouse} onChange={(e) => set("Warehouse", e.target.value)}>
                <option value="">Selecciona</option>
                {ALMACENES.map((w) => <option key={w.id} value={w.Nombre}>{w.Nombre}</option>)}
              </select>
            </Field>
            <Field label="Observación" span>
              <input className={inputCls} value={form.Observation} onChange={(e) => set("Observation", e.target.value)} placeholder="Observaciones..." />
            </Field>
          </div>

          <div className="border-t border-[var(--line-soft)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">Artículos</h3>
              <button type="button" onClick={addLine} className="text-xs px-3 py-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)] flex items-center gap-1"><Plus size={14} /> Agregar línea</button>
            </div>
            {(form.Articale_List || []).length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-3">Sin artículos. Agregue líneas al movimiento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
                      <th className="px-3 py-2">Código</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-right">Precio Unit.</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.Articale_List || []).map((li, i) => (
                      <tr key={i} className="border-t border-[var(--line-soft)]">
                        <td className="px-3 py-2">
                          <input className={`${inputCls} w-32`} value={li.Code} onChange={(e) => updateLine(i, "Code", e.target.value)} placeholder="Código" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className={`${inputCls} w-20 text-right`} value={li.Quantity} onChange={(e) => updateLine(i, "Quantity", Number(e.target.value))} min="1" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" className={`${inputCls} w-24 text-right`} value={li.PricePerUnit} onChange={(e) => updateLine(i, "PricePerUnit", Number(e.target.value))} min="0" />
                        </td>
                        <td className="px-3 py-2 text-right gmp-mono">S/ {Number(li.TotalPrice).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeLine(i)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t border-[var(--line-soft)] pt-4">
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>{editing ? "Guardar cambios" : "Crear movimiento"}</Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Eliminar movimiento" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar {deleteTarget.Serial_Number || deleteTarget.Document_Type}?</p>
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


