import { useState, useMemo } from "react";
import { Download, Eye } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import Field from "../../components/ui/Field";
import { inputCls } from "../../components/ui/Field";
import Table, { Td } from "../../components/ui/Table";
import DocumentPreviewModal from "../../components/documents/DocumentPreviewModal";
import * as db from "../../store/db";

const ALL_KEYS = [
  "va-factura", "va-boleta", "va-cotizacion", "va-guia", "va-notacredito",
  "vs-factura", "vs-boleta", "vs-cotizacion", "vs-orden", "vs-notas",
  "c-factura", "c-boleta", "c-guia", "c-notas", "c-orden",
];

function classifyTipo(key) {
  if (key.includes("factura")) return "Factura";
  if (key.includes("boleta")) return "Boleta";
  if (key.includes("notacredito")) return "Nota de crédito";
  if (key.includes("cotizacion")) return "Cotización";
  if (key.includes("guia")) return "Guía";
  if (key.includes("orden")) return "Orden";
  if (key.includes("notas")) return "Nota";
  return "Otro";
}

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
  { key: "fecha", label: "Fecha" }, { key: "contraparte", label: "Cliente/Proveedor" },
  { key: "tipo", label: "Tipo" }, { key: "total", label: "Total" },
];

export default function ReporteDocElect() {
  const [documento, setDocumento] = useState("Todo");
  const [anio, setAnio] = useState("");
  const [preview, setPreview] = useState(null);

  const docs = useMemo(() => {
    const out = [];
    for (const key of ALL_KEYS) {
      const tipo = classifyTipo(key);
      for (const d of db.getDocuments(key)) {
        const fecha = d.fecha || "";
        out.push({
          id: d.id, key, tipo, serie: d.serie, numero: d.numero, fecha,
          contraparte: d.cliente || d.proveedor || "",
          total: d.total || 0, items: d.items || [],
          year: fecha.slice(0, 4), month: fecha.slice(5, 7),
        });
      }
    }
    return out;
  }, []);

  const years = useMemo(() => [...new Set(docs.map((d) => d.year).filter(Boolean))].sort(), [docs]);

  const filtered = useMemo(() => docs.filter((d) => {
    if (documento !== "Todo" && d.tipo !== documento) return false;
    if (anio && d.year !== anio) return false;
    return true;
  }), [docs, documento, anio]);

  const resumen = useMemo(() => {
    const map = {};
    for (const d of filtered) {
      const k = `${d.year}-${d.month}|${d.tipo}`;
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map).map(([k, cantidad]) => {
      const [ym, tipo] = k.split("|");
      return { periodo: ym, tipo, cantidad };
    }).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [filtered]);

  const exportCsv = () => {
    const rows = [["Serie", "Número", "Fecha", "Tipo", "Cliente/Proveedor", "Total"]];
    for (const d of filtered) rows.push([d.serie, d.numero, d.fecha, d.tipo, d.contraparte, d.total]);
    downloadCsv("reporte_documentos.csv", rows);
  };

  return (
    <div>
      <Toolbar title="Reporte documentos electrónicos" onExport={exportCsv} />
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Filtros</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Documento">
            <select className={inputCls} value={documento} onChange={(e) => setDocumento(e.target.value)}>
              <option value="Todo">Todo</option>
              <option value="Factura">Factura</option>
              <option value="Boleta">Boleta</option>
              <option value="Nota de crédito">Nota de crédito</option>
            </select>
          </Field>
          <Field label="Año">
            <select className={inputCls} value={anio} onChange={(e) => setAnio(e.target.value)}>
              <option value="">Todos</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Resumen por periodo</h2>
        <Table columns={["Periodo", "Tipo", "Cantidad"]}
          rows={resumen}
          renderRow={(r) => (
            <>
              <Td className="gmp-mono">{r.periodo}</Td>
              <Td><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.tipo}</span></Td>
              <Td className="gmp-mono">{r.cantidad}</Td>
            </>
          )}
        />
      </div>
      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Documentos</h2>
        <Table columns={["Serie", "Contraparte", "Fecha", "Total", "Excel", "Vista"]}
          rows={filtered}
          renderRow={(r) => (
            <>
              <Td className="gmp-mono">{r.serie}-{r.numero}</Td>
              <Td className="font-medium">{r.contraparte}</Td>
              <Td className="text-[var(--muted)]">{r.fecha}</Td>
              <Td className="gmp-mono">S/ {Number(r.total).toFixed(2)}</Td>
              <Td><button className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Descargar Excel" onClick={() => downloadCsv(`doc_${r.serie}-${r.numero}.csv`, [["Serie", "Número", "Fecha", "Tipo", "Cliente/Proveedor", "Total"], [r.serie, r.numero, r.fecha, r.tipo, r.contraparte, r.total]])}><Download size={15} /></button></Td>
              <Td><button className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle" onClick={() => setPreview({ ...r, total: "S/ " + Number(r.total).toFixed(2) })}><Eye size={15} /></button></Td>
            </>
          )}
        />
      </div>
      {preview && <DocumentPreviewModal title="Vista previa - Documento" data={preview} fields={previewFields} onClose={() => setPreview(null)} />}
    </div>
  );
}
