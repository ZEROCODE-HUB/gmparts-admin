import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { useFirestoreCollection } from "../../store/firestoreDb";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function MovimientosList() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const rows = useFirestoreCollection("Almacen_movement");

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteDoc(doc(db, "Almacen_movement", deleteTarget.id));
    setDeleteTarget(null);
  };

  const warehouseName = (wh) => {
    if (wh === "w1" || wh === "Almacén Principal") return "Principal";
    if (wh === "w2" || wh === "Almacén Secundario") return "Secundario";
    if (wh === "w3" || wh === "Depósito Taller") return "Taller";
    return wh || "—";
  };

  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  return (
    <div>
      <Toolbar title="Movimientos de almacén" count={rows.length} onNew={() => navigate("/al-movimientos/nuevo")} onExport={() => exportToExcel(rows, "Movimientos")} />
      <Table columns={["Fecha", "Tipo", "Artículo", "Cantidad", "P. Unit.", "Total", "Documento", "Almacén", "Acción"]}
        rows={pageRows}
        renderRow={(m) => (
          <>
            <Td className="text-[var(--muted)]">{m.Date || m.fecha || "—"}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.Movement_type === "Ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{m.Movement_type}</span></Td>
            <Td className="font-medium">{m.Article_name || m.Article?.id || "—"}</Td>
            <Td className={`gmp-mono ${Number(m.Quantity) < 0 ? "text-[var(--danger)]" : "text-green-600"}`}>{m.Quantity}</Td>
            <Td className="gmp-mono">S/ {Number(m.Total_Price).toFixed(2)}</Td>
            <Td className="gmp-mono">S/ {Number(m.Total_Price).toFixed(2)}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{m.Document_Type === "Ingreso" ? "COMP-" : "VENT-"}{String(rows.indexOf(m) + 1).padStart(4, "0")}</Td>
            <Td className="text-[var(--muted)]">{warehouseName(m.Warehouse)}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => navigate(`/al-movimientos/${m.id}`)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
                <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />
      {deleteTarget && (
        <Modal title="Eliminar movimiento" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Estás seguro que deseas eliminar este movimiento?</p>
          <p className="font-medium mb-6">{deleteTarget.Description || deleteTarget.id}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>
          </div>
        </Modal>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}


