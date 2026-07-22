import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil,Trash2 } from "lucide-react";
import PrintButton from "../../../components/documents/PrintButton";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import { useFirestoreDocuments } from "../../../store/firestoreDb";

const previewFields = [
  { key: "nserie", label: "Serie" }, { key: "numero", label: "N?mero" },
  { key: "Fecha", label: "Fecha" }, { key: "razonSNombre", label: "Cliente" },
  { key: "placa", label: "Placa" }, { key: "subtotal", label: "Subtotal" },
  { key: "igv", label: "IGV" }, { key: "total", label: "Total" }, { key: "Estado", label: "Estado" },
];

export default function CotizacionServicioList() {
  const navigate = useNavigate();
  const [items, { remove }] = useFirestoreDocuments("vs-cotizacion");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);

  const rows = items.filter((c) =>
    ((c.razonSNombre || c.cliente || "") + (c.nserie || c.serie || "") + (c.numero || "")).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <Toolbar title="Cotizaci?n de Servicio" count={rows.length} onNew={() => navigate("/vs-cotizacion/nuevo")} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Serie", "N?mero", "Fecha", "Cliente", "Placa", "Servicio", "Total", "Acci?n"]}
        rows={rows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.nserie || c.serie || ""}</Td>
            <Td className="gmp-mono">{c.numero || ""}</Td>
            <Td className="text-[var(--muted)]">{c.Fecha || c.fecha || ""}</Td>
            <Td className="font-medium">{c.razonSNombre || c.cliente || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placa || ""}</Td>
            <Td className="text-[var(--muted)]">{(c.items && c.items[0] && c.items[0].descripcion) || "?"}</Td>
            <Td className="gmp-mono">S/ {Number(c.total || 0).toFixed(2)}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-cotizacion/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <PrintButton title="Comprobante" data={c} />
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular cotizaci?n" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">?Est?s seguro de anular esta cotizaci?n?</p>
          <p className="font-medium mb-6">{deleteTarget.serie}-{deleteTarget.numero}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Cotizaci?n de Servicio" data={preview} fields={previewFields} collection="Facturas" onClose={() => setPreview(null)} />}
    </div>
  );
}



