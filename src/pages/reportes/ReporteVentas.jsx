import { useState, useMemo } from "react";
import { Download, Eye } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import Field from "../../components/ui/Field";
import { inputCls } from "../../components/ui/Field";
import Table, { Td } from "../../components/ui/Table";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";
import * as db from "../../store/db";

const VENTA_KEYS = ["va-factura", "va-boleta", "vs-factura", "vs-boleta"];

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const previewFields = [
  { key: "serie", label: "Serie" }, { key: "numero", label: "Número" },
  { key: "fecha", label: "Fecha" }, { key: "cliente", label: "Cliente" },
  { key: "clienteDoc", label: "Documento" }, { key: "formaPago", label: "Forma de pago" },
  { key: "total", label: "Total" },
];

export default function ReporteVentas() {
  const [ruc, setRuc] = useState("");
  const [cliente, setCliente] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [preview, setPreview] = useState(null);

  const docs = useMemo(() => {
    const out = [];
    for (const key of VENTA_KEYS) {
      const tipo = key.includes("boleta") ? "Boleta" : "Factura";
      for (const d of db.getDocuments(key)) {
        out.push({
          id: d.id, tipo, serie: d.serie, numero: d.numero, fecha: d.fecha,
          cliente: d.cliente || "", clienteDoc: d.clienteDoc || "",
          formaPago: d.formaPago || "Contado", total: d.total || 0, items: d.items || [],
        });
      }
    }
    return out;
  }, []);

  const filtered = useMemo(() => docs.filter((d) => {
    if (ruc && !d.clienteDoc.toLowerCase().includes(ruc.toLowerCase())) return false;
    if (cliente && !d.cliente.toLowerCase().includes(cliente.toLowerCase())) return false;
    if (fechaDesde && d.fecha < fechaDesde) return false;
    if (fechaHasta && d.fecha > fechaHasta) return false;
    return true;
  }), [docs, ruc, cliente, fechaDesde, fechaHasta]);

  const conditions = useMemo(() => {
    const map = {};
    for (const d of filtered) {
      const k = `${d.formaPago}|${d.tipo}`;
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map).map(([k, cantidad]) => {
      const [condicion, tipo] = k.split("|");
      return { condicion, tipo, cantidad };
    });
  }, [filtered]);

  const exportCsv = () => {
    const rows = [["Serie", "Número", "Fecha", "Cliente", "Documento", "Forma de pago", "Total"]];
    for (const d of filtered) rows.push([d.serie, d.numero, d.fecha, d.cliente, d.clienteDoc, d.formaPago, d.total]);
    downloadCsv("reporte_ventas.csv", rows);
  };

  return (
    <div>
      <Toolbar title="Reporte de ventas" onExport={exportCsv} />
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Filtros</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="RUC/DNI"><input className={inputCls} value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="Buscar por RUC/DNI" /></Field>
          <Field label="Cliente"><input className={inputCls} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Buscar por cliente" /></Field>
          <Field label="Fecha desde"><input type="date" className={inputCls} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></Field>
          <Field label="Fecha hasta"><input type="date" className={inputCls} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} /></Field>
        </div>
      </div>
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Condiciones de pago</h2>
        <Table columns={["Condición de pago", "Tipo de documento", "Cantidad"]}
          rows={conditions}
          renderRow={(r) => (
            <>
              <Td>{r.condicion}</Td>
              <Td><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.tipo}</span></Td>
              <Td className="gmp-mono">{r.cantidad}</Td>
            </>
          )}
        />
      </div>
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Documentos electrónicos</h2>
        <Table columns={["Serie", "Cliente", "Fecha", "Total", "Excel", "Vista"]}
          rows={filtered}
          renderRow={(r) => (
            <>
              <Td className="gmp-mono">{r.serie}-{r.numero}</Td>
              <Td className="font-medium">{r.cliente}</Td>
              <Td className="text-[var(--muted)]">{r.fecha}</Td>
              <Td className="gmp-mono">S/ {Number(r.total).toFixed(2)}</Td>
              <Td><button className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Descargar Excel" onClick={() => downloadCsv(`venta_${r.serie}-${r.numero}.csv`, [["Serie", "Número", "Fecha", "Cliente", "Documento", "Forma de pago", "Total"], [r.serie, r.numero, r.fecha, r.cliente, r.clienteDoc, r.formaPago, r.total]])}><Download size={15} /></button></Td>
              <Td><button className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle" onClick={() => setPreview({ ...r, total: "S/ " + Number(r.total).toFixed(2) })}><Eye size={15} /></button></Td>
            </>
          )}
        />
      </div>
      {preview && <DocumentPreviewModal title="Vista previa - Documento" data={preview} fields={previewFields} onClose={() => setPreview(null)} />}
    </div>
  );
}
