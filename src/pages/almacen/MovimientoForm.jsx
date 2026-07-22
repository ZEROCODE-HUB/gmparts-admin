import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import almacenesSeed from "../../mock/seed.almacenes";
import * as db from "../../store/db";
import { searchArticles, updateArticleStockByCode } from "../../store/firestoreStock";
import { db as firestore } from "../../lib/firebase";
import { collection, addDoc, setDoc, doc as fDoc } from "firebase/firestore";
import { useCatalog } from "../../store/useCatalog";

const docTypes = ["Ingreso", "Salida", "Ajuste", "Transferencia"];

export default function MovimientoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id && id !== "nuevo";
  const [form, setForm] = useState({
    document_type: "Ingreso", serialnumber: "", date: new Date().toISOString().split("T")[0],
    warehouse: "", comment: "", vendedor: "",
  });
  const [lineItems, setLineItems] = useState([]);
  const [artSearch, setArtSearch] = useState("");
  const [artResults, setArtResults] = useState([]);
  const [artQty, setArtQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const encargadoOpts = useCatalog("cat-encargado");

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!isEdit) return;
    const k = db.getKardex().find((x) => x.id === id);
    if (!k) return;
    const tipo = k.Document_Type === "Ingreso" ? "Ingreso" : k.Document_Type === "Salida" ? "Salida" : "Ajuste";
    const cant = Math.abs(Number(k.Quantity) || 0);
    setForm((prev) => ({
      ...prev,
      document_type: tipo,
      serialnumber: k.Code_Id || String(k.Document_Number ?? ""),
      date: k.Date || prev.date,
      warehouse: k.Warehouse || "",
      comment: k.Description || "",
      vendedor: "",
    }));
    setLineItems([
      {
        id: k.Article,
        Codigo: k.Code_Id || "",
        Nombre_name: k.Article_name || "",
        Precio_compra_Purchase_price: Number(k.PricePerUnit) || 0,
        lineaCant: cant,
        lineaTotal: cant * (Number(k.PricePerUnit) || 0),
      },
    ]);
  }, [id, isEdit]);

  useEffect(() => {
    const term = artSearch.trim();
    if (term.length < 2) { setArtResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchArticles(term, { limit: 10 });
      setArtResults(r || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [artSearch]);

  const addLineItem = async () => {
    const raw = artSearch.trim();
    if (!raw) return;
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    if (found) {
      setLineItems((prev) => [...prev, { ...found, lineaCant: artQty, lineaTotal: artQty * found.Precio_compra_Purchase_price }]);
      setArtSearch("");
      setArtQty(1);
    }
  };

  const removeLineItem = (idx) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const updateLineQty = (idx, newQty) => {
    const q = Math.max(1, newQty);
    setLineItems((prev) => prev.map((li, i) => i === idx ? { ...li, lineaCant: q, lineaTotal: q * li.Precio_compra_Purchase_price } : li));
  };

  const totalMovimiento = lineItems.reduce((s, li) => s + li.lineaTotal, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0) return;
    setSaving(true);
    const isIngreso = form.document_type === "Ingreso";
    const now = new Date().toISOString();
    try {
      for (const li of lineItems) {
        const data = {
          Article: li.Codigo || "",
          Quantity: isIngreso ? li.lineaCant : -li.lineaCant,
          Total_Price: li.lineaTotal,
          Movement_type: form.document_type,
          Date: form.date || now.split("T")[0],
          Warehouse: form.warehouse,
          Description: form.comment || "",
          Document_Number: form.serialnumber || "",
          Article_name: li.Nombre_name || "",
          Code_Id: li.Codigo || "",
        };
        if (isEdit && li.id) {
          await setDoc(fDoc(firestore, "Almacen_movement", li.id), data, { merge: true });
        } else {
          await addDoc(collection(firestore, "Almacen_movement"), data);
        }
        const delta = isIngreso ? li.lineaCant : -li.lineaCant;
        await updateArticleStockByCode(li.Codigo, delta);
      }
      navigate("/al-movimientos");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/al-movimientos")} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
        <h1 className="gmp-display text-xl font-bold">{isEdit ? "Editar movimiento" : "Nuevo movimiento"}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos del movimiento</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Tipo de documento">
              <select className={inputCls} value={form.document_type} onChange={(e) => set("document_type", e.target.value)}>
                {docTypes.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="N° de serie / Doc. Referencia"><input className={inputCls} value={form.serialnumber} onChange={(e) => set("serialnumber", e.target.value)} placeholder="Serie / N°" required /></Field>
            <Field label="Fecha de registro"><input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Vendedor">
              <select className={inputCls} value={form.vendedor} onChange={(e) => set("vendedor", e.target.value)}>
                <option value="">Selecciona</option>
                {encargadoOpts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Almacén">
              <select className={inputCls} value={form.warehouse} onChange={(e) => set("warehouse", e.target.value)}>
                <option value="">Selecciona</option>
                {almacenesSeed.map((w) => <option key={w.id} value={w.id}>{w.Nombre}</option>)}
              </select>
            </Field>
            <Field label="Comentario"><input className={inputCls} value={form.comment} onChange={(e) => set("comment", e.target.value)} placeholder="Escribe aquí" /></Field>
          </div>

          <h2 className="text-sm font-semibold text-[var(--text)] mt-8 mb-4 uppercase tracking-wide">Líneas de artículo</h2>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar artículo</label>
              <input className={inputCls} value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Nombre o código..." list="art-list" />
              <datalist id="art-list">
                {artResults.map((a) => <option key={a.id} value={`${a.Codigo} - ${a.Nombre_name}`} />)}
              </datalist>
            </div>
            <div className="w-24">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Cantidad</label>
              <input type="number" className={inputCls} value={artQty} onChange={(e) => setArtQty(Number(e.target.value))} min="1" />
            </div>
            <button type="button" onClick={addLineItem} className="mb-0.5 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"><Plus size={18} /></button>
          </div>

          {lineItems.length > 0 && (
            <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Artículo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">P. Compra</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => (
                    <tr key={i} className="border-t border-[var(--line-soft)]">
                      <td className="px-4 py-3 gmp-mono text-[var(--muted)]">{li.Codigo}</td>
                      <td className="px-4 py-3 font-medium">{li.Nombre_name}</td>
                      <td className="px-4 py-3 text-right gmp-mono"><input type="number" className="w-16 text-right bg-[var(--surface)] border border-[var(--line-soft)] rounded px-1.5 py-0.5 text-sm" value={li.lineaCant} min="1" onChange={(e) => updateLineQty(i, Number(e.target.value))} /></td>
                      <td className="px-4 py-3 text-right gmp-mono">S/ {li.Precio_compra_Purchase_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right gmp-mono">S/ {li.lineaTotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeLineItem(i)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[var(--line-soft)] bg-[var(--panel)] font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right gmp-mono">S/ {totalMovimiento.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate("/al-movimientos")}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>Guardar movimiento</Btn>
        </div>
      </form>
    </div>
  );
}
