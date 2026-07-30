import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { inputCls } from "../../components/ui/Field";
import { useFirestoreCollection, deleteMaestro } from "../../store/firestoreDb";

const COL = "Vehiculos";

export default function VehiculosList() {
  const items = useFirestoreCollection(COL);
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("Placa");
  const [sortDir, setSortDir] = useState("asc");
  const [idSearch, setIdSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const rows = items
    .filter((v) => {
      const matchId = !idSearch || (v.Placa || "").toLowerCase().includes(idSearch.toLowerCase());
      const matchQ = !q || (v.Placa + v.Propietario_name + v.Marca + v.Modelo + v.Estado).toLowerCase().includes(q.toLowerCase());
      const matchEst = estadoFilter === "Todos" || v.Estado === estadoFilter;
      return matchId && matchQ && matchEst;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const va = a[sortField] ?? "", vb = b[sortField] ?? "";
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  const handleSort = (k, d) => { setSortField(k); setSortDir(d); };

  const confirmDelete = async () => {
    if (deleteTarget) await deleteMaestro(COL, deleteTarget.id);
    setDeleteTarget(null);
    setToast("Vehículo eliminado");
    setTimeout(() => setToast(null), 2000);
  };

  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  return (
    <div>
      <Toolbar title="Vehículos" count={rows.length} onNew={() => navigate("/al-vehiculos/nuevo")} onExport={() => exportToExcel(rows, "Vehiculos")} />
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="text-[11px] text-[var(--muted)] block mb-1">Buscar</label>
          <input className={`${inputCls} pl-9`} placeholder="Placa, propietario, marca..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[var(--muted)] block mb-1">Placa</label>
          <input className={inputCls} placeholder="Filtrar por placa" value={idSearch} onChange={(e) => setIdSearch(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[var(--muted)] block mb-1">Estado</label>
          <select className={inputCls} value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
            {["Todos", "Activo", "Inactivo", "En Taller"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <Table columns={["Placa", "Propietario", "Marca", "Modelo", "Año", "Estado", "Acción"]}
        sortable={[{key:"Placa",label:"Placa"},{key:"Propietario_name",label:"Propietario"},{key:"Marca",label:"Marca"},{key:"Modelo",label:"Modelo"},{key:"anio_de_fabricion",label:"Año"},{key:"Estado",label:"Estado"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        rows={pageRows}
        renderRow={(v) => (
          <>
            <Td><span className="gmp-mono text-[var(--muted)]">{v.Placa}</span></Td>
            <Td className="font-medium">{v.Propietario_name}</Td>
            <Td className="text-[var(--muted)]">{v.Marca}</Td>
            <Td className="text-[var(--muted)]">{v.Modelo}</Td>
            <Td className="gmp-mono">{v.anio_de_fabricion}</Td>
            <Td className="text-[var(--muted)]">{v.Estado}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => navigate("/al-vehiculos/" + v.id)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />
      {deleteTarget && (
        <Modal title="Eliminar vehículo" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Eliminar {deleteTarget.Placa}?</p>
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


