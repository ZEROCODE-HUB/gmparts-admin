import { useState, useEffect, useCallback } from "react";
import { getSession } from "../../store/auth";

// Quién registra la compra.
//
// Estaba escrito a fuego «GM Parts Admin» en los tres sitios donde se rellena el campo, así
// que TODAS las compras quedaban a nombre de la misma persona, la registrara quien la
// registrara. Comprobado: una compra hecha por el asesor de repuestos se guardó firmada por
// «GM Parts Admin».
function usuarioActual() {
  const s = getSession();
  return s?.displayName || s?.email || "";
}

import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Btn from "../ui/Btn";
import Field, { inputCls } from "../ui/Field";
import { useDebouncedCallback } from "../../lib/debounce";
import { useFirestoreCollection, mapDocKeyToCollection } from "../../store/firestoreDb";
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
import { desglosarIgv } from "../../lib/igv";

function findSeedById(id, docKey) {
  return db.getDocumentById(docKey, id);
}

// Unifica el valor de tipoIgv al canónico ("INCLUIDO"/"MAS") usado también por
// DocumentEditor/ServicioEditor, aceptando los valores legacy "INCLUIDO IGV"/"MAS IGV".
function normalizeIgv(v) {
  if (v === "INCLUIDO IGV" || v === "INCLUIDO") return "INCLUIDO";
  if (v === "MAS IGV" || v === "MAS") return "MAS";
  return v || "INCLUIDO";
}

function normalizeProvider(d) {
  return {
    id: d.id,
    nombre: d.nombre || "",
    documento: d.Documento || d.documento || "",
    razonSocial: d.razon_social || "",
    correo: d.correo || "",
    direccion: d.dirreccion_fiscal || d.direccion || "",
  };
}

export default function CompraEditor({ title, backPath, docKey, onSave, mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState({
    serie: "", numero: "", fecha: new Date().toISOString().split("T")[0],
    proveedor: "", proveedorDoc: "", tipoDoc: "RUC", direccion: "",
    formaPago: "Contado", moneda: "PEN", tipoIgv: "INCLUIDO IGV", almacen: "", usuario: usuarioActual(),
    actualizarStock: true, docRelacion: "",
  });
  const [items, setItems] = useState([]);
  const [artSearch, setArtSearch] = useState("");
  const [artResults, setArtResults] = useState([]);
  const [artQty, setArtQty] = useState(1);
  const allProviders = useFirestoreCollection("Proveedores").map(normalizeProvider);

  const isGuia = docKey === "c-guia";
  const isOrdenPago = docKey === "c-orden";
  const [docId, setDocId] = useState(id && id !== "nuevo" ? id : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || id === "nuevo" || !(isEdit || isView) || !docKey) return;
    (async () => {
      try {
        const colName = mapDocKeyToCollection(docKey);
        const ref = doc(fbDb, colName, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDocId(id);
          setForm({
            serie: data.serie || "",
            numero: data.numero || "",
            fecha: data.fecha || "",
            proveedor: data.proveedor || "",
            proveedorDoc: data.proveedorDoc || "",
            tipoDoc: data.tipoDoc || "RUC",
            direccion: data.direccion || "",
            formaPago: data.formaPago || "Contado",
            moneda: data.moneda || "PEN",
            tipoIgv: normalizeIgv(data.tipoIgv),
            almacen: data.almacen || "",
            usuario: data.usuario || usuarioActual(),
            actualizarStock: data.actualizarStock ?? true,
            docRelacion: data.docRelacion || "",
          });
          if (data.items) {
            setItems(data.items.map((li) => ({
              codigo: li.codigo || "",
              descripcion: li.descripcion || "",
              cant: li.cant ?? 1,
              pu: li.pu ?? 0,
              total: li.total ?? 0,
              precioCompra: li.precioCompra ?? 0,
              utilidad: li.utilidad ?? 0,
            })));
          }
          return;
        }
      } catch (e) { /* fallback below */ }
      const existing = findSeedById(id, docKey);
      if (existing) {
        setDocId(existing.id);
        setForm({
          serie: existing.serie || "",
          numero: existing.numero || "",
          fecha: existing.fecha || "",
          proveedor: existing.proveedor || "",
          proveedorDoc: existing.proveedorDoc || "",
          tipoDoc: existing.tipoDoc || "RUC",
          direccion: existing.direccion || "",
          formaPago: existing.formaPago || "Contado",
          moneda: existing.moneda || "PEN",
          tipoIgv: normalizeIgv(existing.tipoIgv),
          almacen: existing.almacen || "",
          usuario: existing.usuario || usuarioActual(),
          actualizarStock: existing.actualizarStock ?? true,
          docRelacion: existing.docRelacion || "",
        });
        if (existing.items) {
          setItems(existing.items.map((li) => ({
            codigo: li.codigo || "",
            descripcion: li.descripcion || "",
            cant: li.cant ?? 1,
            pu: li.pu ?? 0,
            total: li.total ?? 0,
            precioCompra: li.precioCompra ?? 0,
            utilidad: li.utilidad ?? 0,
          })));
        }
      }
    })();
  }, [id, isEdit, isView, docKey]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleProveedorChange = (nombre) => {
    const p = allProviders.find((pr) => (pr.nombre || pr.razonSocial) === nombre);
    if (p) {
      set("proveedor", p.nombre || p.razonSocial);
      set("proveedorDoc", p.documento || "");
      set("direccion", p.direccion || "");
    }
  };

  useEffect(() => {
    const term = artSearch.trim();
    if (term.length < 2) { setArtResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchArticles(term, { limit: 10 });
      setArtResults(r || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [artSearch]);

  const addItem = async () => {
    const raw = artSearch.trim();
    if (!raw) return;
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    if (found) {
      const qty = Math.max(1, artQty);
      const precioCompra = found.Precio_compra_Purchase_price || 0;
      const utilidad = found.Utilidad_Profit_Percentage || 0;
      // Flutter elegir_articulos_widget.dart (rama Compra):
      // precioVenta = precioCompra + (precioCompra * utilidad * 0.01)
      const pu = precioCompra + precioCompra * utilidad * 0.01;
      setItems((prev) => [...prev, {
        codigo: found.Codigo,
        articleId: found.id,
        descripcion: found.Nombre_name,
        cant: qty,
        pu,
        total: qty * pu,
        precioCompra,
        utilidad,
      }]);
      setArtSearch("");
      setArtQty(1);
    }
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const debouncedRecalc = useDebouncedCallback((idx, field, value) => {
    setItems((prev) => prev.map((li, i) => {
      if (i !== idx) return li;
      const next = { ...li, [field]: value };
      if (field === "cant") {
        next.total = next.cant * next.pu;
      } else if (field === "precioCompra" || field === "utilidad") {
        const pc = field === "precioCompra" ? value : next.precioCompra;
        const u = field === "utilidad" ? value : (next.utilidad ?? 0);
        next.pu = pc + pc * u * 0.01;
        next.total = next.cant * next.pu;
      }
      return next;
    }));
  }, 2000);

  const patchItem = (idx, field, value) => {
    setItems((prev) => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    debouncedRecalc(idx, field, value);
  };

  const updateItemQty = (idx, newQty) => patchItem(idx, "cant", Math.max(1, newQty));
  const updateItemPrecioCompra = (idx, val) => patchItem(idx, "precioCompra", Math.max(0, val));
  const updateItemUtilidad = (idx, val) => patchItem(idx, "utilidad", Math.max(0, val));

  const sumaItems = items.reduce((s, i) => s + i.total, 0);
  const { subtotal, igv, total } = desglosarIgv(
    sumaItems,
    form.tipoIgv === "INCLUIDO" || form.tipoIgv === "INCLUIDO IGV"
  );

  const validate = () => {
    if (!form.moneda) return "Seleccione Moneda";
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.formaPago) return "Seleccione condicion de pago";
    if (!form.tipoIgv) return "Seleccione tipo de IGV";
    if (!form.almacen) return "Seleccione almacen";
    if (!isOrdenPago && items.length === 0) return "Seleccione articulos";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { showToast(err, "error"); return; }
    dismissAll();
    setSaving(true);
    const doc = { ...form, items, subtotal, igv, total, estado: form.estado || "Registrado" };
    if (docId) doc.id = docId;
    try {
      if (docKey) await firestoreSaveDocument(docKey, doc);
      if (onSave) onSave(doc);
      navigate(backPath);
    } catch (saveErr) {
      console.error(saveErr);
    } finally {
      setSaving(false);
    }
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
                    <input type="number" className="w-16 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.cant} onChange={(e) => updateItemQty(i, Number(e.target.value))} min="1" />
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
            <Field label="Proveedor"><div className="text-sm py-2">{form.proveedor || "-"}</div></Field>
            <Field label="Documento"><div className="text-sm py-2">{form.proveedorDoc || "-"}</div></Field>
            <Field label="Dirección" span><div className="text-sm py-2">{form.direccion || "-"}</div></Field>
            <Field label="Moneda"><div className="text-sm py-2">{form.moneda || "-"}</div></Field>
            <Field label="Forma de pago"><div className="text-sm py-2">{form.formaPago || "-"}</div></Field>
            <Field label="Tipo IGV"><div className="text-sm py-2">{form.tipoIgv || "-"}</div></Field>
            <Field label="Almacén"><div className="text-sm py-2">{form.almacen || "-"}</div></Field>
            {isGuia && <Field label="Doc. Relación"><div className="text-sm py-2">{form.docRelacion || "-"}</div></Field>}
          </div>
        </div>
        {!isOrdenPago && (
          <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Detalle de artículos</h2>
            {renderItemTable(true)}
            <div className="flex flex-col items-end mt-4 gap-1 text-sm">
              <div className="flex gap-8"><span className="text-[var(--muted)]">Subtotal:</span><span className="gmp-mono w-24 text-right">S/ {subtotal.toFixed(2)}</span></div>
              <div className="flex gap-8"><span className="text-[var(--muted)]">IGV (18%):</span><span className="gmp-mono w-24 text-right">S/ {igv.toFixed(2)}</span></div>
              <div className="flex gap-8 font-bold text-base border-t border-[var(--line-soft)] pt-2 mt-1"><span>Total:</span><span className="gmp-mono w-24 text-right">S/ {total.toFixed(2)}</span></div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate(backPath)}>Volver</Btn>
        </div>
      </div>
    );
  }

  if (isOrdenPago) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
          <h1 className="gmp-display text-xl font-bold">{isEdit ? `Editar ${title}` : `Nuev${title.toLowerCase().startsWith("o") ? "a" : "o"} ${title}`}</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del documento</h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Serie"><input className={inputCls} value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ejem: OP01" /></Field>
              <Field label="Número"><input className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="000001" /></Field>
              <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
              <Field label="Proveedor">
                <select className={inputCls} value={form.proveedor} onChange={(e) => handleProveedorChange(e.target.value)}>
                  <option value="">Selecciona proveedor</option>
                  {allProviders.map((p) => <option key={p.id} value={p.nombre || p.razonSocial}>{p.nombre || p.razonSocial} - {p.documento}</option>)}
                </select>
              </Field>
              <Field label="Documento"><input className={inputCls} value={form.proveedorDoc} readOnly /></Field>
              <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Dirección del proveedor" /></Field>
              <Field label="Moneda">
                <select className={inputCls} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </Field>
              <Field label="Doc. Relación"><input className={inputCls} value={form.docRelacion} onChange={(e) => set("docRelacion", e.target.value)} placeholder="Factura relacionada" /></Field>
              <Field label="Monto total"><input type="number" className={inputCls} value={total || ""} onChange={(e) => {}} placeholder="S/ 0.00" readOnly /></Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => navigate(backPath)}>Cancelar</Btn>
            <Btn type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Generar orden de pago"}</Btn>
          </div>
        </form>
      </div>
    );
  }

  if (isGuia) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
          <h1 className="gmp-display text-xl font-bold">{isEdit ? `Editar ${title}` : `Nuev${title.toLowerCase().startsWith("g") ? "a" : "o"} ${title}`}</h1>
        </div>
        <form onSubmit={handleSubmit}>
            <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del documento</h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Serie"><input className={inputCls} value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ejem: GC01" /></Field>
              <Field label="Número"><input className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="000001" /></Field>
              <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
              <Field label="Proveedor">
                <select className={inputCls} value={form.proveedor} onChange={(e) => handleProveedorChange(e.target.value)}>
                  <option value="">Selecciona proveedor</option>
                  {allProviders.map((p) => <option key={p.id} value={p.nombre || p.razonSocial}>{p.nombre || p.razonSocial} - {p.documento}</option>)}
                </select>
              </Field>
              <Field label="Documento"><input className={inputCls} value={form.proveedorDoc} readOnly /></Field>
              <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Dirección del proveedor" /></Field>
              <Field label="Moneda">
                <select className={inputCls} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </Field>
              <Field label="Almacén">
                <select className={inputCls} value={form.almacen} onChange={(e) => set("almacen", e.target.value)}>
                  <option value="">Selecciona</option>
                  {ALMACENES.map((w) => <option key={w.id} value={w.Nombre}>{w.Nombre}</option>)}
                </select>
              </Field>
              <Field label="Doc. Relación"><input className={inputCls} value={form.docRelacion} onChange={(e) => set("docRelacion", e.target.value)} placeholder="Factura de referencia" /></Field>
            </div>
          </div>
          <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide flex items-center gap-2"><Package size={16} /> Detalle de artículos</h2>
            <div className="flex gap-3 items-end mb-4">
              <div className="flex-1">
                <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar artículo por nombre o código</label>
                <div className="flex gap-2">
                  <input className={inputCls} value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Nombre o código..." list="art-list-g" />
                  <button type="button" onClick={addItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar artículo"><Plus size={18} /></button>
                </div>
                <datalist id="art-list-g">
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
              <div className="flex gap-8 font-bold text-base border-t border-[var(--line-soft)] pt-2 mt-1"><span>Total artículos:</span><span className="gmp-mono w-24 text-right">{items.reduce((s, i) => s + i.cant, 0)} und.</span></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => navigate(backPath)}>Cancelar</Btn>
            <Btn type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Generar guía"}</Btn>
          </div>
        </form>
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
            <Field label="Serie"><input className={inputCls} value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ejem: FC01" /></Field>
            <Field label="Número"><input className={inputCls} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="000001" /></Field>
            <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
            <Field label="Proveedor">
              <select className={inputCls} value={form.proveedor} onChange={(e) => handleProveedorChange(e.target.value)}>
                <option value="">Selecciona proveedor</option>
                {allProviders.map((p) => <option key={p.id} value={p.nombre || p.razonSocial}>{p.nombre || p.razonSocial} - {p.documento}</option>)}
              </select>
            </Field>
            <Field label="Documento"><input className={inputCls} value={form.proveedorDoc} readOnly /></Field>
            <Field label="Dirección" span><input className={inputCls} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Dirección del proveedor" /></Field>
            <Field label="Moneda">
              <select className={inputCls} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <Field label="Forma de pago">
              <select className={inputCls} value={form.formaPago} onChange={(e) => set("formaPago", e.target.value)}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </select>
            </Field>
            <Field label="Tipo IGV">
              <select className={inputCls} value={form.tipoIgv} onChange={(e) => set("tipoIgv", e.target.value)}>
                <option value="INCLUIDO">INCLUIDO IGV</option>
                <option value="MAS">MAS IGV</option>
              </select>
            </Field>
            <Field label="Almacén">
              <select className={inputCls} value={form.almacen} onChange={(e) => set("almacen", e.target.value)}>
                <option value="">Selecciona</option>
                {ALMACENES.map((w) => <option key={w.id} value={w.Nombre}>{w.Nombre}</option>)}
              </select>
            </Field>
            <Field label="Usuario"><input className={inputCls} value={form.usuario} onChange={(e) => set("usuario", e.target.value)} /></Field>
            <label className="flex items-center gap-2 mt-6 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={form.actualizarStock} onChange={(e) => set("actualizarStock", e.target.checked)} className="accent-[var(--accent)] w-4 h-4" /> Actualizar stock
            </label>
          </div>
        </div>

        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide flex items-center gap-2"><Package size={16} /> Detalle de artículos</h2>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar artículo por nombre o código</label>
              <div className="flex gap-2">
                <input className={inputCls} value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Nombre o código..." list="art-list-c" />
                <button type="button" onClick={addItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar artículo"><Plus size={18} /></button>
              </div>
              <datalist id="art-list-c">
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
    </div>
  );
}
