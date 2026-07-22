import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";
import PrintButton from "../../components/documents/PrintButton";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";
import { useFirestoreDocuments } from "../../store/firestoreDb";

const previewFields = [
  { key: "serie", label: "Serie" }, { key: "numero", label: "N�mero" },
  { key: "fecha", label: "Fecha" }, { key: "cliente", label: "Cliente" },
  { key: "clienteDoc", label: "Doc. Cliente" }, { key: "almacen", label: "Almac�n" },
  { key: "subtotal", label: "Subtotal" }, { key: "igv", label: "IGV" },
  { key: "total", label: "Total" }, { key: "estado", label: "Estado" },
];

export default function NotaVenta() {
  const navigate = useNavigate();
  const [items, { remove }] = useFirestoreDocuments("al-notaventa");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);

  const rows = items.filter((c) =>
    `${(c.cliente || "") + (c.serie || "") + (c.numero || c.id)}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <Toolbar title="Nota de Venta" count={rows.length} onNew={() => navigate("/al-nota-venta/nuevo")} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar cliente, n�mero..." />
      <Table columns={["Serie", "N�mero", "Fecha", "Cliente", "Documento", "Almac�n", "Total", "Estado", "Acci�n"]}
        rows={rows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.serie || "NV"}</Td>
            <Td className="gmp-mono">{c.numero || c.id}</Td>
            <Td className="text-[var(--muted)]">{c.fecha || ""}</Td>
            <Td className="font-medium">{c.cliente || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.clienteDoc || ""}</Td>
            <Td className="text-[var(--muted)]">{c.almacen || ""}</Td>
            <Td className="gmp-mono">S/ {Number(c.total || 0).toFixed(2)}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.estado === "Anulado" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{c.estado || "�"}</span></Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/al-nota-venta/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <PrintButton title="Comprobante" data={c} />
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />
      {deleteTarget && (
        <Modal title="Anular nota de venta" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">�Est�s seguro de anular esta nota de venta? Se revertir� el stock consumido.</p>
          <p className="font-medium mb-6">{(deleteTarget.serie || "NV")}-{deleteTarget.numero || deleteTarget.id} - {deleteTarget.cliente}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}
      {preview && <DocumentPreviewModal title="Vista previa - Nota de Venta" data={preview} fields={previewFields} onClose={() => setPreview(null)} />}
    </div>
  );
}



