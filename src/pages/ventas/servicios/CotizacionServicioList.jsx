import { useState, useCallback, useMemo } from "react";
import Pagination from "../../../components/ui/Pagination";
import { exportToExcel } from "../../../lib/exportExcel";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import PrintDocument from "../../../components/documents/PrintDocument";
import DateRangeFilter from "../../../components/ui/DateRangeFilter";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import { useFirestoreCollection, useFirestoreDocuments } from "../../../store/firestoreDb";
import { db as fbDb } from "../../../lib/firebase";
import { deleteDoc, doc, collection, getDocs, where } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Esta pantalla mostraba SOLO la colección `recepciones` —el flujo que alimenta la app
// móvil— mientras que su propio botón «Crear nuevo» escribe en `Facturas` con
// `tipofactura: "Cotizacion"`. Resultado: cada cotización hecha desde el panel se guardaba
// bien y desaparecía de la vista, sin ningún aviso. Comprobado creando una: quedó en
// Facturas/4LUx7QyB8FllNT1RBuhQ y la lista seguía diciendo que no existía.
//
// Además el filtro por `status` tapaba el problema: los documentos del panel no llevan ese
// campo (llevan `Estado`), así que ni siquiera podían aparecer.
//
// Ahora la lista une los dos orígenes y lo dice en una columna, porque son dos documentos
// distintos que comparten esta entrada de menú:
//   · Taller — la recepción que abre la app móvil, con su Nº de OT y su estado de flujo.
//   · Panel  — la cotización comercial con serie, número, importes e IGV.
// Cada fila se edita, imprime y anula en el sitio que le corresponde.
// ─────────────────────────────────────────────────────────────────────────────

const previewFieldsTaller = [
  { key: "codeCT", label: "Documento" }, { key: "numeroorden", label: "N° OT" },
  { key: "fecha_creacion", label: "Fecha" }, { key: "nombre_cliente", label: "Cliente" },
  { key: "placa", label: "Placa" }, { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" }, { key: "status", label: "Estado" },
];

const previewFieldsPanel = [
  { key: "nserie", label: "Serie" }, { key: "numero", label: "Número" },
  { key: "Fecha", label: "Fecha" }, { key: "razonSNombre", label: "Cliente" },
  { key: "clienteDoc", label: "Documento" }, { key: "placa", label: "Placa" },
  { key: "subtotal", label: "Subtotal" }, { key: "igv", label: "IGV" },
  { key: "total", label: "Total" }, { key: "Estado", label: "Estado" },
];

const estadoColor = (e) => ({
  "Recepción": "bg-yellow-100 text-yellow-700",
  "Diagnóstico": "bg-blue-100 text-blue-700",
  "Cotización": "bg-purple-100 text-purple-700",
  "Reparación": "bg-orange-100 text-orange-700",
  "Listo para entrega": "bg-teal-100 text-teal-700",
  "Finalizado": "bg-green-100 text-green-700",
  "Emitida": "bg-purple-100 text-purple-700",
}[e] || "bg-gray-100 text-gray-700");

const ffecha = (ts) => {
  if (!ts) return "";
  if (typeof ts === "string") return ts.slice(0, 10);
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
  return "";
};

// Este filtro va contra el servidor: un estado que falte aquí deja las órdenes
// INVISIBLES en esta pantalla, sin ningún aviso.
const ESTADOS_TALLER = ["Reparación", "Listo para entrega", "Finalizado",
  "Cotización", "Recepción"];

export default function CotizacionServicioList() {
  const navigate = useNavigate();

  const recepciones = useFirestoreCollection("recepciones", [where("status", "in", ESTADOS_TALLER)]);
  const [cotizacionesPanel] = useFirestoreDocuments("vs-cotizacion");

  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  // Las dos procedencias se llevan a una misma forma para poder ordenarlas y buscarlas
  // juntas. `_origen` es lo que decide después a dónde lleva cada botón.
  const items = useMemo(() => {
    const deTaller = recepciones.map((c) => ({
      ...c,
      _origen: "Taller",
      documento: c.codeCT || "",
      ot: c.numeroorden || "",
      fecha: ffecha(c.fecha_creacion),
      cliente: c.nombre_cliente || c.Razon_social || "",
      placaTxt: c.placa || "",
      servicio: c.tipo_servicio || "",
      estado: c.status || "",
    }));

    const delPanel = cotizacionesPanel.map((c) => ({
      ...c,
      _origen: "Panel",
      documento: [c.nserie || c.serie || "", c.numero || ""].filter(Boolean).join("-"),
      ot: "",
      fecha: ffecha(c.Fecha || c.fecha),
      cliente: c.razonSNombre || c.RazonSNombre || c.cliente || "",
      placaTxt: c.placa || "",
      servicio: "",
      estado: c.Estado || c.estado || "",
    }));

    return [...deTaller, ...delPanel];
  }, [recepciones, cotizacionesPanel]);

  const fetchDiags = async (c) => {
    if (c._origen !== "Taller") return c;
    try {
      const snap = await getDocs(collection(fbDb, "recepciones", c.id, "diagnosticos"));
      const diags = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { ...c, diagnosticos: diags };
    } catch { return c; }
  };

  const openPreview = async (c) => setPreview(await fetchDiags(c));
  const openPrint = async (c) => setPrintTarget(await fetchDiags(c));

  // Cada origen vive en su colección: borrar en la equivocada no fallaba, simplemente no
  // borraba nada.
  const remove = useCallback(async (fila) => {
    if (!fila?.id) return;
    await deleteDoc(doc(fbDb, fila._origen === "Taller" ? "recepciones" : "Facturas", fila.id));
  }, []);

  // La recepción del taller se edita en Orden de Trabajo, que es la pantalla que sabe leerla.
  // Antes todas las filas iban a /vs-cotizacion/{id}, que busca en `Facturas`: para una
  // recepción abría un formulario vacío.
  const irAEditar = (c) =>
    navigate(c._origen === "Taller" ? `/vs-orden/${c.id}` : `/vs-cotizacion/${c.id}`);

  const rows = items
    .filter((c) => {
      if (fechaDesde && (c.fecha || "") < fechaDesde) return false;
      if (fechaHasta && (c.fecha || "") > fechaHasta) return false;
      return ((c.cliente || "") + (c.documento || "") + (c.placaTxt || "")).toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const va = a[sortField] ?? "", vb = b[sortField] ?? "";
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (k, d) => { setSortField(k); setSortDir(d); };
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / 20);
  const pageRows = rows.slice(page * 20, (page + 1) * 20);

  return (
    <div>
      <Toolbar title="Cotización de Servicio" count={rows.length} onNew={() => navigate("/vs-cotizacion/nuevo")} onExport={() => exportToExcel(rows, "CotizacionesServicio")} />
      <SearchBox value={q} onChange={setQ} />
      <DateRangeFilter fechaDesde={fechaDesde} fechaHasta={fechaHasta} onChange={(d, h) => { setFechaDesde(d); setFechaHasta(h); }} />
      <Table columns={["Documento", "Origen", "Nº OT", "Fecha", "Cliente", "Placa", "Servicio", "Estado", "Acción"]}
        sortable={[{key:"documento",label:"Documento"},{key:"fecha",label:"Fecha"},{key:"cliente",label:"Cliente"},{key:"placaTxt",label:"Placa"},{key:"estado",label:"Estado"}]}
        sortField={sortField} sortDir={sortDir} onSort={handleSort}
        rows={pageRows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.documento}</Td>
            <Td className="text-[var(--muted)] text-[11px]">{c._origen}</Td>
            <Td className="gmp-mono">{c.ot}</Td>
            <Td className="text-[var(--muted)]">{c.fecha}</Td>
            <Td className="font-medium">{c.cliente}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.placaTxt}</Td>
            <Td className="text-[var(--muted)]">{c.servicio}</Td>
            <Td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoColor(c.estado)}`}>{c.estado}</span></Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => openPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => irAEditar(c)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <button onClick={() => openPrint(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Imprimir"><Printer size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular cotización" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Estás seguro de anular esta cotización?</p>
          <p className="font-medium mb-6">{deleteTarget.documento || deleteTarget.id}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {printTarget && <PrintDocument title="Comprobante" data={printTarget} onClose={() => setPrintTarget(null)} />}
      {preview && (
        <DocumentPreviewModal
          title="Vista previa - Cotización de Servicio"
          data={preview}
          fields={preview._origen === "Taller" ? previewFieldsTaller : previewFieldsPanel}
          collection={preview._origen === "Taller" ? "recepciones" : "Facturas"}
          onClose={() => setPreview(null)}
        />
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
