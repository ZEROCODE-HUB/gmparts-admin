import { useState } from "react";
import Pagination from "../../components/ui/Pagination";
import { exportToExcel } from "../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import EnviarSunatButton from "../../components/documents/EnviarSunatButton";
import PrintDocument from "../../components/documents/PrintDocument";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";
import DateRangeFilter from "../../components/ui/DateRangeFilter";
import { useFirestoreDocuments } from "../../store/firestoreDb";

const previewFields = [
  { key: "serie", label: "Serie" }, { key: "numero", label: "N?mero" },
  { key: "fecha", label: "Fecha" }, { key: "proveedor", label: "Proveedor" },
  { key: "proveedorDoc", label: "Doc. Proveedor" }, { key: "docRelacion", label: "Doc. Relaci?n" },
  { key: "total", label: "Total" }, { key: "estado", label: "Estado" },
];

export default function OrdenPagoList() {
  const navigate = useNavigate();
  const [items, { remove }] = useFirestoreDocuments("c-orden");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const rows = items
    .filter((c) => {
      if (fechaDesde && (c.fecha || "") < fechaDesde) return false;
      if (fechaHasta && (c.fecha || "") > fechaHasta) return false;
      return ((c.proveedor || "") + (c.serie || "") + (c.numero || "")).toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const va = a[sortField] ?? "", vb = b[sortField] ?? "";
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const handleSort = (k, d) => { setSortField(k); setSortDir(d); };

  return (
    <div>
      <Toolbar title="Compra - Orden de Pago" count={rows.length} onNew={() => navigate("/c-orden/nuevo")} onExport={() => exportToExcel(rows, "OrdenesPago")} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar proveedor, serie..." />
      <DateRangeFilter fechaDesde={fechaDesde} fechaHasta={fechaHasta} onChange={(d, h) => { setFechaDesde(d); setFechaHasta(h); }} />
      <Table columns={["Serie", "N?mero", "Fecha", "Proveedor", "Documento", "Doc. Relaci?n", "Total", "Estado", "Acci?n"]}
        sortable={[{key:"serie",label:"Serie"},{key:"numero",label:"N\u00famero"},{key:"fecha",label:"Fecha"},{key:"proveedor",label:"Proveedor"},{key:"total",label:"Total"},{key:"estado",label:"Estado"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.serie || ""}</Td>
            <Td className="gmp-mono">{c.numero || ""}</Td>
            <Td className="text-[var(--muted)]">{c.fecha || ""}</Td>
            <Td className="font-medium">{c.proveedor || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.proveedorDoc || ""}</Td>
            <Td className="text-[var(--muted)]">{c.docRelacion || "-"}</Td>
            <Td className="gmp-mono">S/ {(c.total ?? 0).toFixed(2)}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.estado === "Pagado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.estado || "?"}</span></Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/c-orden/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <EnviarSunatButton docKey="c-orden" id={c.id} estadoActual={c.estadoFactura} />
                <button onClick={() => setPrintTarget(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />
      {deleteTarget && (
        <Modal title="Anular orden de pago" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">?Est?s seguro de anular esta orden de pago?</p>
          <p className="font-medium mb-6">{deleteTarget.serie}-{deleteTarget.numero} - {deleteTarget.proveedor}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}
      {preview && <DocumentPreviewModal title="Vista previa - Orden de Pago" data={preview} fields={previewFields} collection="FacturasVentasCompras" onClose={() => setPreview(null)} />}
      {printTarget && <PrintDocument title="Comprobante" data={printTarget} onClose={() => setPrintTarget(null)} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}







