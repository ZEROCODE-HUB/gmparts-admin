import { useState, useCallback } from "react";
import { getSession } from "../../../store/auth";
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
import DateRangeFilter from "../../../components/ui/DateRangeFilter";
import { useFirestoreCollection } from "../../../store/firestoreDb";
import { db as fbDb } from "../../../lib/firebase";
import { deleteDoc, doc, collection, getDocs } from "firebase/firestore";
import { getOTFacturaItems } from "../../../store/firestoreStock";
import { showToast } from "../../../components/ui/Toast";

const previewFields = [
  { key: "codeCT", label: "Documento" }, { key: "numeroorden", label: "N° OT" },
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
  "Cita programada": "bg-slate-100 text-slate-700",
  "Recepción": "bg-gray-100 text-gray-700",
  "Diagnóstico": "bg-blue-100 text-blue-700",
  "Cotización": "bg-purple-100 text-purple-700",
  "Esperando aprobación": "bg-indigo-100 text-indigo-700",
  "Programado": "bg-cyan-100 text-cyan-700",
  "Reparación": "bg-amber-100 text-amber-700",
  "Listo para entrega": "bg-teal-100 text-teal-700",
  "Finalizado": "bg-green-100 text-green-700",
}[e] || "bg-gray-100 text-gray-700");

export default function OrdenTrabajoList() {
  const navigate = useNavigate();
  const items = useFirestoreCollection("recepciones");
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("fecha_creacion");
  const [sortDir, setSortDir] = useState("desc");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Un técnico abre esta pantalla para ver el trabajo que tiene encima, no el taller entero.
  // Se le filtra por sus órdenes de entrada, pero con la casilla a la vista para levantar el
  // filtro: en un taller pequeño hace falta poder mirar la cola de todos, y esconderla sin
  // avisar sería peor que no filtrar.
  const sesion = getSession();
  const esTecnico = sesion?.userRole === "Tecnico Mecanico";
  const [soloMias, setSoloMias] = useState(esTecnico);

  // Agenda: las citas de la etapa 01, ordenadas por el día acordado y no por la fecha en que
  // se apuntaron. Es la pregunta que un taller hace cada mañana —«¿qué tenemos hoy?»— y no se
  // podía responder: las citas quedaban mezcladas con las 48 órdenes en curso.
  const [soloAgenda, setSoloAgenda] = useState(false);

  const aFecha = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v.slice(0, 10);
    if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
    if (typeof v.toDate === "function") return v.toDate().toISOString().slice(0, 10);
    return "";
  };

  const esMia = useCallback((c) => {
    if (!sesion) return true;
    const porReferencia = c.tecnicoservicioRef?.id && c.tecnicoservicioRef.id === sesion.uid;
    const nombre = String(c.tecnico_servicio || "").trim().toLowerCase();
    const mio = String(sesion.displayName || "").trim().toLowerCase();
    return porReferencia || (!!nombre && nombre === mio);
  }, [sesion]);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  const fetchDiags = async (c) => {
    try {
      const snap = await getDocs(collection(fbDb, "recepciones", c.id, "diagnosticos"));
      const diags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { ...c, diagnosticos: diags };
    } catch { return c; }
  };

  const openPreview = async (c) => setPreview(await fetchDiags(c));
  const openPrint = async (c) => setPrintTarget(await fetchDiags(c));

  const remove = useCallback(async (id) => {
    if (id) await deleteDoc(doc(fbDb, "recepciones", id));
  }, []);

  const rows = items
    .filter((c) => {
      if (soloMias && !esMia(c)) return false;
      if (fechaDesde && (c.fecha_creacion || "") < fechaDesde) return false;
      if (fechaHasta && (c.fecha_creacion || "") > fechaHasta) return false;
      return (`${c.nombre_cliente || c.Razon_social || ""} ${c.codeCT || ""} ${c.numeroorden || ""} ${c.placa || ""}`).toLowerCase().includes(q.toLowerCase());
    })
    .filter((c) => !soloAgenda || c.status === "Cita programada")
    .sort((a, b) => {
      // En la agenda manda el día acordado: lo demás da igual.
      if (soloAgenda) return aFecha(a.fechaCita).localeCompare(aFecha(b.fechaCita));
      if (!sortField) { const fa = a.fecha_creacion || "", fb = b.fecha_creacion || ""; return fa > fb ? -1 : fa < fb ? 1 : 0; }
      const va = a[sortField] ?? "", vb = b[sortField] ?? "";
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  const handleSort = (k, d) => { setSortField(k); setSortDir(d); };
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  const facturar = async (ot) => {
    const itemsFact = await getOTFacturaItems(ot);
    if (itemsFact.length === 0) {
      showToast("Esta orden no tiene diagnósticos con importe: agrega mano de obra o repuestos antes de facturar.", "error");
      return;
    }
    navigate("/vs-factura/nuevo", { state: { fromOT: ot.id, cliente: ot.nombre_cliente || ot.Razon_social, clienteDoc: ot.RUCempresa || ot.DNI || "", placa: ot.placa, direccion: ot.direccion || "", marca: ot.marca || "", modelo: ot.modelo || "", color: ot.color || "", combustible: ot.combustible || "", kilometraje: ot.kilometraje || ot.km_ingreso || "", anioFabricacion: ot.anioFabricacion || ot.Ano_fabricacion || "", items: itemsFact } });
  };

  return (
    <div>
      <Toolbar title="Orden de Trabajo" count={rows.length} onNew={() => navigate("/vs-orden/nuevo")} onExport={() => exportToExcel(rows, "OrdenesTrabajo")} />
      <SearchBox value={q} onChange={setQ} />
      <DateRangeFilter fechaDesde={fechaDesde} fechaHasta={fechaHasta} onChange={(d, h) => { setFechaDesde(d); setFechaHasta(h); }} />
      <label className="flex items-center gap-2 text-sm text-[var(--muted)] mb-3 cursor-pointer select-none">
        <input type="checkbox" checked={soloAgenda} onChange={(e) => setSoloAgenda(e.target.checked)} />
        Ver solo la agenda (citas programadas, por día)
      </label>
      {esTecnico && (
        <label className="flex items-center gap-2 text-sm text-[var(--muted)] mb-3 cursor-pointer select-none">
          <input type="checkbox" checked={soloMias} onChange={(e) => setSoloMias(e.target.checked)} />
          Solo mis órdenes
        </label>
      )}
      <Table columns={["Documento", "Cliente", "Placa", "Estado", "Facturado", "Acci\u00f3n"]}
        sortable={[{key:"codeCT",label:"Documento"},{key:"fecha_creacion",label:"Fecha"},{key:"nombre_cliente",label:"Cliente"},{key:"placa",label:"Placa"},{key:"status",label:"Estado"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.codeCT || ""}</Td>
            <Td className="font-medium">{c.nombre_cliente || c.Razon_social || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placa || "—"}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColor(c.status)}`}>{c.status || ""}</span></Td>
            <Td>{c.facturado ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sí</span> : <span className="text-[11px] text-[var(--muted)]">No</span>}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-orden/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <button onClick={() => openPrint(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                {!c.facturado && <button onClick={() => facturar(c)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Generar factura"><FileText size={15} /></button>}
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular orden" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Estás seguro de anular esta orden?</p>
          <p className="font-medium mb-6">{deleteTarget.nombre_cliente || deleteTarget.Razon_social} — {deleteTarget.placa}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Orden de Trabajo" data={{ ...preview, numeroorden: preview.numeroorden, facturado: preview.facturado ? "Sí" : "No" }} fields={previewFields} collection="recepciones" onClose={() => setPreview(null)} />}
      {printTarget && <PrintDocument data={printTarget} onClose={() => setPrintTarget(null)} />}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}





