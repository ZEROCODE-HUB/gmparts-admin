import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, Repeat, Plus, Trash2 as TrashIcon } from "lucide-react";
import PrintButton from "../../../components/documents/PrintButton";
import Toolbar from "../../../components/ui/Toolbar";
import SearchBox from "../../../components/ui/SearchBox";
import Table, { Td } from "../../../components/ui/Table";
import Modal from "../../../components/ui/Modal";
import Btn from "../../../components/ui/Btn";
import Field, { inputCls } from "../../../components/ui/Field";
import DocumentPreviewModal from "../../../components/documents/DocumentPreviewModal";
import { useFirestoreDocuments } from "../../../store/firestoreDb";
import { db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { getNextCorrelative } from "../../../store/firestoreStock";

const previewFields = [
  { key: "nserie", label: "Serie" }, { key: "numero", label: "N\u00famero" },
  { key: "Fecha", label: "Fecha" }, { key: "razonSNombre", label: "Cliente" },
  { key: "clienteDoc", label: "Documento" }, { key: "subtotal", label: "Subtotal" },
  { key: "igv", label: "IGV" }, { key: "total", label: "Total" }, { key: "Estado", label: "Estado" },
];

export default function RegistroNotaVentasList() {
  const navigate = useNavigate();
  const [items, { remove }] = useFirestoreDocuments("vs-notas");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const [canjeTarget, setCanjeTarget] = useState(null);
  const [tipoDestino, setTipoDestino] = useState("Factura");
  const [canjeItems, setCanjeItems] = useState([]);
  const [canjeando, setCanjeando] = useState(false);

  const rows = items.filter((c) =>
    ((c.cliente || "") + (c.serie || "") + (c.numero || "")).toLowerCase().includes(q.toLowerCase())
  );

  const abrirCanje = (nota) => {
    setCanjeTarget(nota);
    setTipoDestino("Factura");
    setCanjeItems((nota.items || []).map((it) => ({ ...it, cant: it.cant ?? it.cantidad ?? 1 })));
  };

  const updateCanjeItem = (i, field, val) => {
    setCanjeItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };

  const removeCanjeItem = (i) => {
    setCanjeItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const subtotalCanje = canjeItems.reduce((s, it) => s + (Number(it.pu) || 0) * (Number(it.cant) || 0), 0);
  const totalCanje = subtotalCanje; // IGV incluido por defecto (INCLUIDO)

  const ejecutarCanje = async () => {
    if (!canjeTarget || canjeItems.length === 0) return;
    setCanjeando(true);
    try {
      const nextNum = await getNextCorrelative("vs-" + tipoDestino.toLowerCase(), "");
      const now = new Date().toISOString().split("T")[0];
      const docData = {
        razonSNombre: canjeTarget.cliente || canjeTarget.razonSNombre || "",
        nserie: String(nextNum).padStart(6, "0"),
        numero: String(nextNum).padStart(6, "0"),
        Fecha: now,
        total: totalCanje,
        subtotal: subtotalCanje,
        igv: 0,
        FPago: canjeTarget.formaPago || canjeTarget.FPago || "Contado",
        fPago: canjeTarget.formaPago || canjeTarget.FPago || "Contado",
        moneda: canjeTarget.moneda || "PEN",
        tipoIgv: "INCLUIDO",
        clienteDoc: canjeTarget.clienteDoc || "",
        NumCotizacion: canjeTarget.numero || "",
        usuario: canjeTarget.usuario || "",
        Estado: "Completado",
        tipofactura: tipoDestino,
        items: canjeItems.map((it) => ({
          descripcion: it.descripcion || "",
          codigo: it.codigo || "",
          cant: Number(it.cant) || 1,
          pu: Number(it.pu) || 0,
          total: (Number(it.pu) || 0) * (Number(it.cant) || 1),
          tipo: "repuesto",
          articleId: it.articleId || "",
        })),
        _docType: "vs-" + tipoDestino.toLowerCase(),
        origen: { tipo: "notaventa", ref: (canjeTarget.nserie || canjeTarget.serie || "") + "-" + (canjeTarget.numero || "") },
      };
      await addDoc(collection(db, "Facturas"), docData);
      // No aplicar stock: la Nota de Venta original ya descontó stock al crearse.
      // El canje solo cambia la forma del documento (NV → Factura/Boleta).
      // Flutter confirma: canjearnotaventa_widget.dart:99-120 hace set() sin stock.
      setCanjeTarget(null);
      setCanjeItems([]);
    } catch (err) {
      console.error("Error en canje:", err);
    } finally {
      setCanjeando(false);
    }
  };

  return (
    <div>
      <Toolbar title="Registro de Notas de Venta" count={rows.length} onNew={() => navigate("/vs-notas/nuevo")} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Serie", "N\u00famero", "Fecha", "Cliente", "Documento", "Servicio", "Total", "Acci\u00f3n"]}
        rows={rows}
        renderRow={(c) => (
          <>
            <Td className="gmp-mono text-[var(--muted)]">{c.serie || c.nserie || ""}</Td>
            <Td className="gmp-mono">{c.numero || ""}</Td>
            <Td className="text-[var(--muted)]">{c.fecha || ""}</Td>
            <Td className="font-medium">{c.cliente || c.razonSNombre || ""}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{c.clienteDoc || ""}</Td>
            <Td className="text-[var(--muted)]">{(c.items && c.items[0] && c.items[0].descripcion) || "\u2014"}</Td>
            <Td className="gmp-mono">S/ {Number(c.total || 0).toFixed(2)}</Td>
            <Td>
              <div className="flex gap-1">
                <button onClick={() => setPreview(c)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]" title="Ver detalle"><Eye size={15} /></button>
                <button onClick={() => navigate(`/vs-notas/${c.id}`)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Editar"><Pencil size={15} /></button>
                <PrintButton title="Comprobante" data={c} />
                <button onClick={() => abrirCanje(c)} className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-dim)]" title="Canjear"><Repeat size={15} /></button>
                <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Anular"><Trash2 size={15} /></button>
              </div>
            </Td>
          </>
        )}
      />

      {deleteTarget && (
        <Modal title="Anular nota" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">\u00bfEst\u00e1s seguro de anular esta nota?</p>
          <p className="font-medium mb-6">{deleteTarget.serie}-{deleteTarget.numero}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => { remove(deleteTarget.id); setDeleteTarget(null); }}>Anular</Btn>
          </div>
        </Modal>
      )}

      {preview && <DocumentPreviewModal title="Vista previa - Nota de Venta" data={preview} fields={previewFields} collection="Facturas" onClose={() => setPreview(null)} />}

      {canjeTarget && (
        <Modal title="Canjear Nota de Venta" onClose={() => setCanjeTarget(null)} wide>
          <div className="mb-4 p-3 bg-[var(--surface-2)] rounded-lg text-sm">
            <p><strong>Nota original:</strong> {canjeTarget.serie || ""}-{canjeTarget.numero || ""} &middot; {canjeTarget.cliente || ""} &middot; {canjeTarget.fecha || ""}</p>
            <p><strong>Total original:</strong> S/ {Number(canjeTarget.total || 0).toFixed(2)}</p>
          </div>

          <div className="flex gap-4 mb-4">
            <Field label="Documento destino">
              <select className={inputCls} value={tipoDestino} onChange={(e) => setTipoDestino(e.target.value)}>
                <option value="Factura">Factura</option>
                <option value="Boleta">Boleta</option>
              </select>
            </Field>
          </div>

          <p className="text-sm font-semibold text-[var(--text)] mb-2">Art\u00edculos ({canjeItems.length})</p>
          <div className="bg-[var(--surface-2)] rounded-lg p-3 mb-4 max-h-64 overflow-y-auto">
            {canjeItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input className={`${inputCls} flex-1`} value={it.descripcion || ""} onChange={(e) => updateCanjeItem(i, "descripcion", e.target.value)} placeholder="Descripci\u00f3n" />
                <input type="number" className={`${inputCls} w-20`} value={it.cant} onChange={(e) => updateCanjeItem(i, "cant", Number(e.target.value))} min="1" />
                <input type="number" className={`${inputCls} w-24`} value={it.pu || 0} onChange={(e) => updateCanjeItem(i, "pu", Number(e.target.value))} min="0" step="0.01" />
                <span className="gmp-mono text-sm w-20 text-right">S/ {((Number(it.pu) || 0) * (Number(it.cant) || 1)).toFixed(2)}</span>
                <button onClick={() => removeCanjeItem(i)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><TrashIcon size={13} /></button>
              </div>
            ))}
            {canjeItems.length === 0 && <p className="text-sm text-[var(--muted)] py-2">Sin art\u00edculos.</p>}
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-[var(--muted)]">Total: <strong className="text-[var(--text)] gmp-mono">S/ {totalCanje.toFixed(2)}</strong></span>
          </div>

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setCanjeTarget(null)}>Cancelar</Btn>
            <Btn onClick={ejecutarCanje} loading={canjeando}>Generar {tipoDestino}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
