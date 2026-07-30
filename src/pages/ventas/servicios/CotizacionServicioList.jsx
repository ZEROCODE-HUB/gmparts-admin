import { useState, useCallback } from "react";
import Pagination from "../../../components/ui/Pagination";
import { exportToExcel } from "../../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import PrintDocument from "../../../components/documents/PrintDocument";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import { useFirestoreCollection } from "../../../store/firestoreDb";
import { db as fbDb } from "../../../lib/firebase";
import { deleteDoc, doc, where } from "firebase/firestore";

const previewFields = [
  { key: "codeCT", label: "Documento" }, { key: "numeroorden", label: "N� OT" },
  { key: "fecha_creacion", label: "Fecha" }, { key: "nombre_cliente", label: "Cliente" },
  { key: "placa", label: "Placa" }, { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" }, { key: "status", label: "Estado" },
];

const estadoColor = (e) => ({
  "Recepci\u00f3n": "bg-yellow-100 text-yellow-700",
  "Diagn\u00f3stico": "bg-blue-100 text-blue-700",
  "Cotizaci\u00f3n": "bg-purple-100 text-purple-700",
  "Reparaci\u00f3n": "bg-orange-100 text-orange-700",
  "Finalizado": "bg-green-100 text-green-700",
}[e] || "bg-gray-100 text-gray-700");

const ffecha = (ts) => {
  if (!ts) return "";
  if (typeof ts === "string") return ts.slice(0, 10);
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
  return "";
};

export default function CotizacionServicioList() {
  const navigate = useNavigate();
  const items = useFirestoreCollection("recepciones", [where("status", "in", ["Reparaci\u00f3n", "Finalizado", "Cotizaci\u00f3n", "Recepci\u00f3n"])]);
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const remove = useCallback(async (id) => {
    if (id) await deleteDoc(doc(fbDb, "recepciones", id));
  }, []);

  const rows = items.filter((c) =>
    ((c.nombre_cliente || c.Razon_social || "") + (c.codeCT || "") + (c.placa || "")).toLowerCase().includes(q.toLowerCase())
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  return (
    <div>
      <Toolbar title="Cotizaci?n de Servicio" count={rows.length} onNew={() => navigate("/vs-cotizacion/nuevo")} onExport={() => exportToExcel(rows, "CotizacionesServicio")} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Documento", "N� OT", "Fecha", "Cliente", "Placa", "Servicio", "Estado", "Acci�n"]}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.codeCT || ""}</Td>
            <Td className="gmp-mono">{c.numeroorden || ""}</Td>
            <Td className="text-[var(--muted)]">{ffecha(c.fecha_creacion)}</Td>
            <Td className="font-medium">{c.nombre_cliente || c.Razon_social || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placa || ""}</Td>
            <Td className="text-[var(--muted)]">{c.tipo_servicio || "?"}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColor(c.status)}`}>{c.status || ""}</span></Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-cotizacion/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <button onClick={() => setPrintTarget(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular cotizaci�n" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">�Est�s seguro de anular esta cotizaci�n?</p>
          <p className="font-medium mb-6">{deleteTarget.codeCT || deleteTarget.id}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {printTarget && <PrintDocument title="Comprobante" data={printTarget} onClose={() => setPrintTarget(null)} />}
      {preview && <DocumentPreviewModal title="Vista previa - Cotizaci�n de Servicio" data={preview} fields={previewFields} collection="recepciones" onClose={() => setPreview(null)} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}





