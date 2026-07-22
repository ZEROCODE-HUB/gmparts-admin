import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2, FileText } from "lucide-react";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import PrintDocument from "../../../components/documents/PrintDocument";
import { useFirestoreDocuments } from "../../../store/firestoreDb";
import * as db from "../../../store/db";

const previewFields = [
  { key: "numeroorden", label: "N� OT" }, { key: "cliente", label: "Cliente" },
  { key: "placa", label: "Placa" }, { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" }, { key: "estado", label: "Estado" },
  { key: "facturado", label: "Facturado" },
];

const estadoColor = (e) => ({
  "Recepci�n": "bg-gray-100 text-gray-700",
  "Diagn�stico": "bg-blue-100 text-blue-700",
  "Reparaci�n": "bg-amber-100 text-amber-700",
  "Finalizado": "bg-green-100 text-green-700",
}[e] || "bg-gray-100 text-gray-700");

export default function OrdenTrabajoList() {
  const navigate = useNavigate();
  const [items, { remove }] = useFirestoreDocuments("vs-orden");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const rows = items.filter((c) =>
    (`${c.cliente} ${c.serie || ""} ${c.numero || ""} ${c.placa || ""}`).toLowerCase().includes(q.toLowerCase())
  );

  const facturar = (ot) => {
    const itemsFact = db.getOTFacturaItems(ot);
    navigate("/vs-factura/nuevo", { state: { fromOT: ot.id, cliente: ot.cliente, clienteDoc: ot.clienteDoc, placa: ot.placa, items: itemsFact } });
  };

  return (
    <div>
      <Toolbar title="Orden de Trabajo" count={rows.length} onNew={() => navigate("/vs-orden/nuevo")} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Cliente", "Placa", "Estado", "Facturado", "Total", "Acci�n"]}
        rows={rows}
        renderRow={(c) => (
          <>
            <Td className="font-medium">{c.cliente || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placa || "�"}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColor(c.estado)}`}>{c.estado || ""}</span></Td>
            <Td>{c.facturado ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">S�</span> : <span className="text-[11px] text-[var(--muted)]">No</span>}</Td>
            <Td className="gmp-mono">S/ {(c.total || 0).toFixed(2)}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
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
          <p className="font-medium mb-6">{deleteTarget.cliente} � {deleteTarget.placa}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Orden de Trabajo" data={{ ...preview, numeroorden: preview.numeroorden, facturado: preview.facturado ? "S�" : "No" }} fields={previewFields} collection="Facturas" onClose={() => setPreview(null)} />}
      {printTarget && <PrintDocument data={printTarget} onClose={() => setPrintTarget(null)} />}
    </div>
  );
}



