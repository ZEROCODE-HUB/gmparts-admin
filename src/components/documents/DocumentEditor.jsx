import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { where } from "firebase/firestore";
import Btn from "../ui/Btn";
import Field, { inputCls } from "../ui/Field";
import { useDebouncedCallback } from "../../lib/debounce";
import { useFirestoreCollection, useFirestoreDocuments, mapDocKeyToCollection } from "../../store/firestoreDb";
import { doc, getDoc } from "firebase/firestore";
import { db as fbDb } from "../../lib/firebase";
import { showToast, dismissAll } from "../ui/Toast";
import * as db from "../../store/db";

const ALMACENES = [
  { id: "w1", Nombre: "Almacén Principal" },
  { id: "w2", Nombre: "Almacén Secundario" },
  { id: "w3", Nombre: "Depósito Taller" },
];
import { searchArticles, firestoreSaveDocument } from "../../store/firestoreStock";

function findSeedById(id, key) {
  if (key) return db.getDocumentById(key, id);
  return null;
}

function normalizeClient(d) {
  const tp = d.tipo_de_persona || d.tipoPersona || "Natural";
  return {
    id: d.id,
    nombre: d.display_name || d.nombre || "",
    documento: d.IdentityDocument || d.documento || "",
    tipoDocumento: d.tipo_de_documento || d.tipoDocumento || "",
    tipoPersona: tp === "Persona" ? "Natural" : tp === "Empresa" ? "Jurídica" : tp,
    direccion: d.direccion || "",
    email: d.email || "",
  };
}

export default function DocumentEditor({ title, backPath, onSave, mode = "create", docKey }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const [docId, setDocId] = useState(id && id !== "nuevo" ? id : null);
  const allClients = useFirestoreCollection("users", [where("user_role", "==", "Cliente")]).map(normalizeClient);

  const [form, setForm] = useState({
    serie: "", numero: "", fecha: new Date().toISOString().split("T")[0],
    cliente: "", clienteDoc: "", tipoDoc: "DNI", direccion: "", motivo: "",
    formaPago: "Contado", moneda: "PEN", tipoIgv: "INCLUIDO", almacen: "",
  });
  const [items, setItems] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [artSearch, setArtSearch] = useState("");
  const [artResults, setArtResults] = useState([]);
  const [artQty, setArtQty] = useState(1);
  const [cotizaciones] = useFirestoreDocuments("va-cotizacion");
  const [cotModal, setCotModal] = useState(false);
  const [cotFilter, setCotFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || id === "nuevo" || !(isEdit || isView)) return;
    (async () => {
      // Try Firebase first
      try {
        const colName = mapDocKeyToCollection(docKey);
        const ref = doc(fbDb, colName, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDocId(id);
          setForm({
            serie: data.serie || data.nserie || "",
            numero: data.numero || "",
            fecha: data.fecha || data.Fecha || "",
            cliente: data.cliente || data.razonSNombre || "",
            clienteDoc: data.clienteDoc || data.RUCempresa || "",
            tipoDoc: data.tipoDoc || "DNI",
            direccion: data.direccion || "",
            motivo: data.Observaciones_adicionales || data.motivo || data.observacion || "",
            formaPago: data.formaPago || data.FPago || "Contado",
            moneda: data.moneda || "PEN",
            tipoIgv: data.tipoIgv === "INCLUIDO IGV" ? "INCLUIDO" : data.tipoIgv === "MAS IGV" ? "MAS" : data.tipoIgv || "INCLUIDO",
            almacen: data.almacen || "",
          });
          if (data.items) {
            setItems(data.items.map((li) => ({
              tipo: "repuesto",
              codigo: li.codigo || li.Codigo || "",
              descripcion: li.art || li.descripcion || "",
              cant: li.cant ?? li.cantidad ?? 1,
              pu: li.pu ?? li.precioVenta ?? 0,
              total: li.total ?? 0,
              moneda: li.moneda || "PEN",
              stock: li.stock ?? null,
              precioCompra: li.precioCompra ?? 0,
              utilidad: li.utilidad ?? 0,
            })));
          }
          if (data.origen) setOrigen(data.origen);
          return;
        }
      } catch (e) { /* fallback below */ }
      // Fallback to localStorage
      const existing = findSeedById(id, docKey);
      if (existing) {
        setDocId(existing.id);
        setForm({
          serie: existing.serie || "",
          numero: existing.numero || "",
          fecha: existing.fecha || "",
          cliente: existing.cliente || "",
          clienteDoc: existing.clienteDoc || "",
          tipoDoc: existing.tipoDoc || "DNI",
          direccion: existing.direccion || "",
          motivo: existing.Observaciones_adicionales || existing.motivo || "",
          formaPago: existing.formaPago || "Contado",
          moneda: existing.moneda || "PEN",
          tipoIgv: existing.tipoIgv || "INCLUIDO",
          almacen: existing.almacen || "",
        });
        if (existing.items) {
          setItems(existing.items.map((li) => ({
            tipo: "repuesto",
            codigo: li.codigo || li.Codigo || "",
            descripcion: li.art || li.descripcion || "",
            cant: li.cant ?? li.cantidad ?? 1,
            pu: li.pu ?? li.precioVenta ?? 0,
            total: li.total ?? 0,
            moneda: li.moneda || existing.moneda || "PEN",
            stock: li.stock ?? null,
            precioCompra: li.precioCompra ?? 0,
            utilidad: li.utilidad ?? 0,
          })));
        }
        if (existing.origen) setOrigen(existing.origen);
      }
    })();
  }, [id, isEdit, isView, docKey]);

  useEffect(() => {
    const term = artSearch.trim();
    if (term.length < 2) { setArtResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchArticles(term, { limit: 10 });
      setArtResults(r || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [artSearch]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleClienteChange = (nombre) => {
    if (!nombre) return;
    const c = allClients.find((cl) => cl.nombre === nombre);
    if (c) {
      set("cliente", c.nombre);
      set("clienteDoc", c.documento);
      set("tipoDoc", c.tipoDocumento);
      set("direccion", c.direccion);
    }
  };

  const addItem = async () => {
    const raw = artSearch.trim();
    if (!raw) return;
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    if (found) {
      // Flutter elegir_articulos_widget.dart línea 285: en Venta, si stock <= 0
      // se bloquea la selección (snackbar "No hay stock disponible").
      if (found.Stock <= 0) {
        showToast("No hay stock disponible", "error");
        return;
      }
      const qty = Math.max(1, artQty);
      const pu = found.Precio_Venta_Sale_price;
      setItems((prev) => [...prev, {
        tipo: "repuesto",
        codigo: found.Codigo,
        articleId: found.id,
        descripcion: found.Nombre_name,
        cant: qty,
        pu,
        total: qty * pu,
        moneda: form.moneda || "PEN",
        stock: found.Stock || 0,
        precioCompra: found.Precio_compra_Purchase_price || 0,
        utilidad: found.Utilidad_Profit_Percentage || 0,
      }]);
        setArtSearch("");
        setArtQty(1);
      }
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // Flutter crearfactura_widget.dart:1716 "Agregar Cotizacion" -> CotizacionesWidget
  // que vuelca ítems con addToCrearFacturas y devuelve condpago (widget.action, :1296).
  const loadFromCotizacion = (cot) => {
    setItems(cot.items.map((it) => ({
      tipo: "repuesto",
      codigo: "",
      descripcion: it.art || it.descripcion || "",
      cant: it.cant ?? 1,
      pu: it.pu ?? 0,
      total: it.total ?? (it.cant ?? 1) * (it.pu ?? 0),
      moneda: form.moneda || "PEN",
      stock: null,
      precioCompra: 0,
      utilidad: 0,
    })));
    set("condPago", cot.formaPago || cot.condPago || form.formaPago);
    if (!form.cliente) {
      set("cliente", cot.cliente || "");
      set("clienteDoc", cot.clienteDoc || "");
      set("tipoDoc", cot.tipoDoc || "");
    }
    setOrigen({ tipo: "cotizacion", ref: `${cot.serie}-${cot.numero}` });
    setCotModal(false);
    setCotFilter("");
    setError("");
  };

  // Debounce 2000ms (Flutter: EasyDebounce.debounce Duration(milliseconds:2000)).
  // Aplica el parche de campo y recalcula totales según el tipo (row_articles_widget.dart).
  const debouncedRecalc = useDebouncedCallback((idx, field, value) => {
    setItems((prev) => prev.map((li, i) => {
      if (i !== idx) return li;
      const next = { ...li, [field]: value };
      if (field === "cant") {
        next.total = next.cant * next.pu;
      } else if (field === "precioCompra" || field === "utilidad") {
        const pc = field === "precioCompra" ? value : next.precioCompra;
        const u = field === "utilidad" ? value : (next.utilidad ?? 0);
        next.pu = u >= 100 ? pc : pc / (1 - u / 100);
        next.total = next.cant * next.pu;
      }
      return next;
    }));
  }, 2000);

  // Cambio inmediato del valor crudo (para que el input refleje lo escrito) + recálculo debounced.
  const patchItem = (idx, field, value) => {
    setItems((prev) => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    debouncedRecalc(idx, field, value);
  };

  const updateItemQty = (idx, newQty) => patchItem(idx, "cant", Math.max(1, newQty));
  const updateItemPrecioCompra = (idx, val) => patchItem(idx, "precioCompra", Math.max(0, val));
  const updateItemUtilidad = (idx, val) => patchItem(idx, "utilidad", Math.max(0, val));

  const sumaItems = items.reduce((s, i) => s + i.total, 0);
  const { subtotal, igv, total } = form.tipoIgv === "INCLUIDO"
    ? { subtotal: sumaItems / 1.18, igv: sumaItems - sumaItems / 1.18, total: sumaItems }
    : { subtotal: sumaItems, igv: sumaItems * 0.18, total: sumaItems * 1.18 };

  // Valida campos obligatorios y tipo de cliente (crearfactura_compra_widget.dart).
  const validate = () => {
    if (!form.moneda) return "Seleccione Moneda";
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.formaPago) return "Seleccione condicion de pago";
    if (!form.tipoIgv) return "Seleccione tipo de IGV";
    if (!form.almacen) return "Seleccione almacen";
    if (items.length === 0) return "Seleccione articulos";
    const c = allClients.find((cl) => cl.nombre === form.cliente);
    if (title.toLowerCase().startsWith("factura") && c && c.tipoPersona !== "Jurídica") {
      return "Persona debe ser Jurídica para generar Factura";
    }
    if (title.toLowerCase().startsWith("boleta") && c && c.tipoPersona !== "Natural") {
      return "Persona debe ser Natural para generar Boleta";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    console.log("[D3-DIAG] handleSubmit ENTER", { title, docKey, docId, itemsLength: items.length });
    e.preventDefault();
    console.log("[D3-DIAG] form state before validate:", { moneda: form.moneda, fecha: form.fecha, formaPago: form.formaPago, tipoIgv: form.tipoIgv, almacen: form.almacen, cliente: form.cliente });
    const err = validate();
    console.log("[D3-DIAG] validate result:", err || "(passed)");
    if (err) { console.log("[D3-DIAG] validation FAILED, setting error"); showToast(err, "error"); return; }
    dismissAll();
    setSaving(true);
    const doc = { ...form, id: docId, items, subtotal, igv, total, origen, estado: form.estado || "Emitida" };
    console.log("[D3-DIAG] doc built, calling firestoreSaveDocument", { docKey, hasDocId: !!docId });
    if (docKey) {
      try {
        await firestoreSaveDocument(docKey, doc);
        console.log("[D3-DIAG] firestoreSaveDocument OK");
      } catch (saveErr) {
        console.error("[D3-DIAG] firestoreSaveDocument ERROR:", saveErr);
        throw saveErr;
      } finally {
        setSaving(false);
      }
    }
    if (onSave) onSave(doc);
    console.log("[D3-DIAG] navigating to", backPath);
    navigate(backPath);
  };

  const renderItemTable = (readonly) => {
    if (items.length === 0) return <p className="text-sm text-[var(--muted)] py-4">Sin detalle. Use el buscador de arriba para agregar artículos.</p>;
    return (
      <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Artículo</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">P. Venta</th>
              <th className="px-4 py-3 text-right">P. Compra</th>
              <th className="px-4 py-3 text-right">Utilidad %</th>
              <th className="px-4 py-3 text-right">Total</th>
              {!readonly && <th className="px-4 py-3 text-center"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((li, i) => (
              <tr key={i} className="border-t border-[var(--line-soft)]">
                <td className="px-4 py-3 gmp-mono text-[var(--muted)]">{li.codigo}</td>
                <td className="px-4 py-3 font-medium">{li.descripcion}</td>
                <td className="px-4 py-3 text-right gmp-mono">
                  {readonly ? (
                    li.cant
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="number" className="w-16 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.cant} onChange={(e) => updateItemQty(i, Number(e.target.value))} min="1" />
                      {!readonly && li.stock != null && Number(li.cant) > Number(li.stock) && (
                        <span className="text-[10px] text-[var(--danger)] mt-0.5">No tienes stock disponible</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.pu).toFixed(2)}</td>
                {readonly ? (
                  <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.precioCompra || 0).toFixed(2)}</td>
                ) : (
                  <td className="px-4 py-3 text-right">
                    <input type="number" step="0.01" className="w-20 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.precioCompra || 0} onChange={(e) => updateItemPrecioCompra(i, Number(e.target.value))} min="0" />
                  </td>
                )}
                {readonly ? (
                  <td className="px-4 py-3 text-right gmp-mono">{Number(li.utilidad || 0).toFixed(0)}%</td>
                ) : (
                  <td className="px-4 py-3 text-right">
                    <input type="number" step="0.01" className="w-16 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.utilidad || 0} onChange={(e) => updateItemUtilidad(i, Number(e.target.value))} min="0" />
                  </td>
                )}
                <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.total).toFixed(2)}</td>
                {!readonly && (
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => removeItem(i)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Eliminar línea"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isView) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
          <h1 className="gmp-display text-xl font-bold">Ver {title}</h1>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del documento</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Serie"><div className="text-sm py-2">{form.serie || "-"}</div></Field>
            <Field label="Número"><div className="text-sm py-2">{form.numero || "-"}</div></Field>
            <Field label="Fecha"><div className="text-sm py-2">{form.fecha || "-"}</div></Field>
            {origen && (
              <Field label="Documento de origen" span><div className="text-sm py-2 font-semibold text-[var(--accent)]">Origen: {origen.tipo} {origen.ref}</div></Field>
            )}
            <Field label="Cliente"><div className="text-sm py-2">{form.cliente || "-"}</div></Field>
            <Field label="Documento"><div className="text-sm py-2">{form.clienteDoc || "-"}</div></Field>
            <Field label="Tipo doc."><div className="text-sm py-2">{form.tipoDoc || "-"}</div></Field>
            <Field label="Dirección" span><div className="text-sm py-2">{form.direccion || "-"}</div></Field>
            <Field label="Motivo / Obs."><div className="text-sm py-2">{form.motivo || "-"}</div></Field>
            <Field label="Forma de pago"><div className="text-sm py-2">{form.formaPago || "-"}</div></Field>
            <Field label="Moneda"><div className="text-sm py-2">{form.moneda || "-"}</div></Field>
            <Field label="Tipo IGV"><div className="text-sm py-2">{form.tipoIgv || "-"}</div></Field>
            <Field label="Almacén"><div className="text-sm py-2">{form.almacen || "-"}</div></Field>
          </div>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Detalle de artículos</h2>
          {renderItemTable(true)}
          <div className="flex flex-col items-end mt-4 gap-1 text-sm">
            <div className="flex gap-8"><span className="text-[var(--muted)]">Subtotal:</span><span className="gmp-mono w-24 text-right">S/ {subtotal.toFixed(2)}</span></div>
            <div className="flex gap-8"><span className="text-[var(--muted)]">IGV (18%):</span><span className="gmp-mono w-24 text-right">S/ {igv.toFixed(2)}</span></div>
            <div className="flex gap-8 font-bold text-base border-t border-[var(--line-soft)] pt-2 mt-1"><span>Total:</span><span className="gmp-mono w-24 text-right">S/ {total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate(backPath)}>Volver</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
        <h1 className="gmp-display text-xl font-bold">{isEdit ? `Editar ${title}` : `Nuev${title.toLowerCase().startsWith("f") ? "a" : "o"} ${title}`}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del documento</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Serie"><input className={inputCls} value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ejem: F001" /></Field>
            <Field label="Número"><input className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="000001" /></Field>
            <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
            <Field label="Cliente">
              <select className={inputCls} value={form.cliente} onChange={(e) => handleClienteChange(e.target.value)}>
                <option value="">Selecciona cliente</option>
                {allClients.filter((c, i, a) => a.findIndex((x) => x.nombre === c.nombre) === i).map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre} - {c.documento}</option>
                ))}
                {form.cliente && !allClients.some((c) => c.nombre === form.cliente) && (
                  <option value={form.cliente}>{form.cliente}</option>
                )}
              </select>
            </Field>
            <Field label="Documento"><input className={inputCls} value={form.clienteDoc} readOnly /></Field>
            <Field label="Tipo doc."><input className={inputCls} value={form.tipoDoc} readOnly /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Field>
            <Field label="Motivo / Obs."><input className={inputCls} value={form.motivo} onChange={(e) => set("motivo", e.target.value)} placeholder="Escribe aquí" /></Field>
            <Field label="Forma de pago">
              <select className={inputCls} value={form.formaPago} onChange={(e) => set("formaPago", e.target.value)}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </select>
            </Field>
            <Field label="Moneda">
              <select className={inputCls} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <Field label="Tipo IGV">
              <select className={inputCls} value={form.tipoIgv} onChange={(e) => set("tipoIgv", e.target.value)}>
                <option value="INCLUIDO">INCLUIDO IGV</option>
                <option value="MAS">MÁS IGV</option>
              </select>
            </Field>
            <Field label="Almacén">
              <select className={inputCls} value={form.almacen} onChange={(e) => set("almacen", e.target.value)}>
                <option value="">Selecciona</option>
                {ALMACENES.map((w) => <option key={w.id} value={w.Nombre}>{w.Nombre}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2"><Package size={16} /> Detalle de artículos</h2>
            <div className="flex items-center gap-2">
              {origen && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-semibold">Origen: {origen.tipo} {origen.ref}</span>
              )}
              <button type="button" onClick={() => setCotModal(true)} className="shrink-0 px-3 py-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)] text-xs font-semibold flex items-center gap-1"><Plus size={14} /> Agregar Cotización</button>
            </div>
          </div>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar artículo por nombre o código</label>
              <div className="flex gap-2">
                <input className={inputCls} value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Nombre o código..." list="art-list" />
                <button type="button" onClick={addItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar artículo"><Plus size={18} /></button>
              </div>
              <datalist id="art-list">
                {artResults.map((a) => <option key={a.id} value={`${a.Codigo} - ${a.Nombre_name}`} />)}
              </datalist>
            </div>
            <div className="w-24">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Cantidad</label>
              <input type="number" className={inputCls} value={artQty} onChange={(e) => setArtQty(Number(e.target.value))} min="1" />
            </div>
          </div>
          {renderItemTable(false)}
          <div className="flex flex-col items-end mt-4 gap-1 text-sm">
            <div className="flex gap-8"><span className="text-[var(--muted)]">Subtotal:</span><span className="gmp-mono w-24 text-right">S/ {subtotal.toFixed(2)}</span></div>
            <div className="flex gap-8"><span className="text-[var(--muted)]">IGV (18%):</span><span className="gmp-mono w-24 text-right">S/ {igv.toFixed(2)}</span></div>
            <div className="flex gap-8 font-bold text-base border-t border-[var(--line-soft)] pt-2 mt-1"><span>Total:</span><span className="gmp-mono w-24 text-right">S/ {total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate(backPath)}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Generar documento"}</Btn>
        </div>
      </form>

      {cotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCotModal(false)}>
          <div className="bg-[var(--panel)] rounded-xl border border-[var(--line-soft)] w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-soft)]">
              <h3 className="font-semibold text-[var(--text)]">Seleccionar Cotización</h3>
              <button type="button" onClick={() => setCotModal(false)} className="p-1 rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
            </div>
            <div className="px-5 py-3">
              <input className={inputCls} value={cotFilter} onChange={(e) => setCotFilter(e.target.value)} placeholder="Filtrar por cliente..." />
            </div>
            <div className="overflow-y-auto max-h-[55vh] px-5 pb-5">
              {cotizaciones.filter((c) => {
                const name = c.cliente || c.razonSNombre || c.RazonSNombre || c.nombre_cliente || "";
                return name.toLowerCase().includes(cotFilter.trim().toLowerCase());
              }).map((c) => {
                const name = c.cliente || c.razonSNombre || c.RazonSNombre || c.nombre_cliente || "";
                return (
                <button key={c.id} type="button" onClick={() => loadFromCotizacion(c)} className="w-full text-left flex items-center justify-between gap-3 px-3 py-3 mb-2 rounded-lg border border-[var(--line-soft)] hover:bg-[var(--surface-2)]">
                  <div>
                    <div className="font-medium text-[var(--text)]">{c.serie || c.nserie}-{c.numero} · {name}</div>
                    <div className="text-xs text-[var(--muted)]">{c.fecha || c.Fecha} · {(c.items || []).length} ítem(s)</div>
                  </div>
                  <div className="gmp-mono text-sm">S/ {Number(c.total || c.Total).toFixed(2)}</div>
                </button>
              );})}
              {cotizaciones.filter((c) => {
                const name = c.cliente || c.razonSNombre || c.RazonSNombre || c.nombre_cliente || "";
                return name.toLowerCase().includes(cotFilter.trim().toLowerCase());
              }).length === 0 && (
                <p className="text-sm text-[var(--muted)] py-4 text-center">Sin cotizaciones</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
