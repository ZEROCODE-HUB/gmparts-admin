import { useState, useCallback } from "react";
import Pagination from "../../../components/ui/Pagination";
import { exportToExcel } from "../../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2, FileText } from "lucide-react";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import PrintDocument from "../../../components/documents/PrintDocument";
import { useFirestoreCollection } from "../../../store/firestoreDb";
import { db as fbDb } from "../../../lib/firebase";
import { deleteDoc, doc, collection, getDocs } from "firebase/firestore";
import * as db from "../../../store/db";

const previewFields = [
  { key: "codeCT", label: "Documento" }, { key: "numeroorden", label: "N� OT" },
  { key: "nombre_cliente", label: "Cliente" }, { key: "placa", label: "Placa" },
  { key: "marca", label: "Marca" }, { key: "modelo", label: "Modelo" },
  { key: "status", label: "Estado" }, { key: "facturado", label: "Facturado" },
];

const ffecha = (ts) => {
  if (!ts) return "";
  if (typeof ts === "string") return ts.slice(0, 10);
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
  return "";
};

const estadoColor = (e) => ({
  "Recepci�n": "bg-gray-100 text-gray-700",
  "Diagn�stico": "bg-blue-100 text-blue-700",
  "Cotizaci�n": "bg-purple-100 text-purple-700",
  "Reparaci�n": "bg-amber-100 text-amber-700",
  "Finalizado": "bg-green-100 text-green-700",
}[e] || "bg-gray-100 text-gray-700");

export default function OrdenTrabajoList() {
  const navigate = useNavigate();
  const items = useFirestoreCollection("recepciones");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const openPreview = async (c) => {
    try {
      const snap = await getDocs(collection(fbDb, "recepciones", c.id, "diagnosticos"));
      const diags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPreview({ ...c, diagnosticos: diags });
    } catch { setPreview(c); }
  };

  const remove = useCallback(async (id) => {
    if (id) await deleteDoc(doc(fbDb, "recepciones", id));
  }, []);

  const rows = items.filter((c) =>
    (`${c.nombre_cliente || c.Razon_social || ""} ${c.codeCT || ""} ${c.numeroorden || ""} ${c.placa || ""}`).toLowerCase().includes(q.toLowerCase())
  ).sort((a, b) => ((a.fecha_creacion || "") > (b.fecha_creacion || "") ? -1 : 1));
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const facturar = (ot) => {
    const itemsFact = db.getOTFacturaItems(ot);
    navigate("/vs-factura/nuevo", { state: { fromOT: ot.id, cliente: ot.nombre_cliente || ot.Razon_social, clienteDoc: ot.RUCempresa || ot.DNI || "", placa: ot.placa, items: itemsFact } });
  };

  return (
    <div>
      <Toolbar title="Orden de Trabajo" count={rows.length} onNew={() => navigate("/vs-orden/nuevo")} onExport={() => exportToExcel(rows, "OrdenesTrabajo")} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Documento", "Cliente", "Placa", "Estado", "Facturado", "Acci�n"]}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.codeCT || ""}</Td>
            <Td className="font-medium">{c.nombre_cliente || c.Razon_social || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placa || "�"}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColor(c.status)}`}>{c.status || ""}</span></Td>
            <Td>{c.facturado ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">S�</span> : <span className="text-[11px] text-[var(--muted)]">No</span>}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-orden/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <button onClick={() => setPrintTarget(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                {!c.facturado && <button onClick={() => facturar(c)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Generar factura"><FileText size={15} /></button>}
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular orden" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">�Est�s seguro de anular esta orden?</p>
          <p className="font-medium mb-6">{deleteTarget.nombre_cliente || deleteTarget.Razon_social} � {deleteTarget.placa}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Orden de Trabajo" data={{ ...preview, numeroorden: preview.numeroorden, facturado: preview.facturado ? "S�" : "No" }} fields={previewFields} collection="recepciones" onClose={() => setPreview(null)} />}
      {printTarget && <PrintDocument data={printTarget} onClose={() => setPrintTarget(null)} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}





