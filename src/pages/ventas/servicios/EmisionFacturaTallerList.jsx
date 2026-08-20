import { useState } from "react";
import Pagination from "../../../components/ui/Pagination";
import { exportToExcel } from "../../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import EnviarSunatButton from "../../../components/documents/EnviarSunatButton";
import AnularComprobanteModal from "../../../components/documents/AnularComprobanteModal";
import PrintDocument from "../../../components/documents/PrintDocument";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import DateRangeFilter from "../../../components/ui/DateRangeFilter";
import { useFirestoreDocuments } from "../../../store/firestoreDb";

const previewFields = [
  { key: "Nserie", label: "Serie" }, { key: "NumCotizacion", label: "N\u00famero" },
  { key: "Fecha", label: "Fecha" }, { key: "RazonSNombre", label: "Cliente" },
  { key: "clienteDoc", label: "RUC" }, { key: "subtotal", label: "Subtotal" },
  { key: "igv", label: "IGV" }, { key: "Total", label: "Total" }, { key: "Estado", label: "Estado" },
];

export default function EmisionFacturaTallerList() {
  const navigate = useNavigate();
  const [items] = useFirestoreDocuments("vs-factura");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("Fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const rows = items
    .filter((c) => {
      const f = c.Fecha || c.fecha || "";
      if (fechaDesde && f < fechaDesde) return false;
      if (fechaHasta && f > fechaHasta) return false;
      return ((c.RazonSNombre || c.razonSNombre || c.cliente || "") + (c.Nserie || c.nserie || c.serie || "") + (c.NumCotizacion || c.numero || "")).toLowerCase().includes(q.toLowerCase());
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
      <Toolbar title="Emisi\u00f3n Factura Taller" count={rows.length} onNew={() => navigate("/vs-factura/nuevo")} onExport={() => exportToExcel(rows, "FacturasTaller")} />
      <SearchBox value={q} onChange={setQ} />
      <DateRangeFilter fechaDesde={fechaDesde} fechaHasta={fechaHasta} onChange={(d, h) => { setFechaDesde(d); setFechaHasta(h); }} />
      <Table columns={["Serie", "Número", "Fecha", "Cliente", "RUC", "Servicio", "Total", "Acción"]}
        sortable={[{key:"Nserie",label:"Serie"},{key:"numero",label:"N\u00famero"},{key:"Fecha",label:"Fecha"},{key:"cliente",label:"Cliente"},{key:"total",label:"Total"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.Nserie || c.nserie || c.serie || ""}</Td>
            <Td className="gmp-mono">{c.NumCotizacion || c.numero || ""}</Td>
            <Td className="text-[var(--muted)]">{c.Fecha || c.fecha || ""}</Td>
            <Td className="font-medium">{c.RazonSNombre || c.razonSNombre || c.cliente || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.clienteDoc || ""}</Td>
            <Td className="text-[var(--muted)]">{(c.items && c.items[0] && c.items[0].descripcion) || "?"}</Td>
            <Td className="gmp-mono">S/ {Number(c.Total || c.total || 0).toFixed(2)}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-factura/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <EnviarSunatButton docKey="vs-factura" id={c.id} estadoActual={c.estadoSunat || c.estadoFactura} esPrueba={c.sunatEsPrueba} reintentable={c.sunatReintentable} correoEnviado={c.correoEnviadoA} />
                <button onClick={() => setPrintTarget(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <AnularComprobanteModal docKey="vs-factura" id={deleteTarget.id} onClose={() => setDeleteTarget(null)} />
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Factura Taller" data={preview} fields={previewFields} collection="Facturas" onClose={() => setPreview(null)} />}
      {printTarget && <PrintDocument title="Comprobante" data={printTarget} onClose={() => setPrintTarget(null)} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}





