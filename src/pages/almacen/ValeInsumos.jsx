import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";

import { db } from "../../lib/firebase";
import { collection, getDocs, doc, writeBatch, increment } from "firebase/firestore";
import { useFirestoreDocuments, useFirestoreCollection } from "../../store/firestoreDb";
const ALMACENES = [
  { id: "w1", Nombre: "Almacén Principal" },
  { id: "w2", Nombre: "Almacén Secundario" },
  { id: "w3", Nombre: "Depósito Taller" },
];
import { searchArticles, getArticleRefByCode } from "../../store/firestoreStock";
import { getSession } from "../../store/auth";
import { showToast } from "../../components/ui/Toast";

export default function ValeInsumos() {
  const [vales, setVales] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const col = collection(db, "ValeInsumos");
        const snap = await getDocs(col);
        setVales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    })();
  }, []);
  const [otsFactura] = useFirestoreDocuments("vs-orden");
  const otsRecepcion = useFirestoreCollection("recepciones");
  const ots = useMemo(() => {
    const map = new Map();
    for (const o of otsFactura) map.set(o.id, o);
    for (const o of otsRecepcion) if (!map.has(o.id)) map.set(o.id, o);
    return [...map.values()];
  }, [otsFactura, otsRecepcion]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0], almacen: "w1", recepcionRef: "", observacion: "",
  });
  const [repuestos, setRepuestos] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = vales.filter((v) => (v.observacion || v.recepcionRef || "").toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchArticles(term, { limit: 10 });
      setSearchResults(r || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addRepuesto = async () => {
    const raw = search.trim();
    if (!raw) return;
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    setRepuestos((prev) => [...prev, found ? { descripcion: found.Nombre_name, codigo: found.Codigo, cantidad: 1, precioCompra: found.Precio_compra_Purchase_price } : { descripcion: raw, codigo: "", cantidad: 1, precioCompra: 0 }]);
    setSearch("");
  };

  // El vale lo firma quien lo emite. Estaba escrito a fuego «GM Parts Admin», así que
  // todos los vales salían a nombre de la misma persona.
  const currentUsuario = getSession()?.displayName || getSession()?.email || "";

  const submit = async () => {
    if (repuestos.length === 0) { setError("Agregue al menos un repuesto"); return; }
    setSaving(true);
    try {
      // Todo en un solo lote: o se guarda el vale CON su descuento y su movimiento, o no se
      // guarda nada.
      //
      // Antes se escribía en tres pasos sueltos y el primero era el vale. Si el descuento
      // fallaba —le pasaba al jefe de taller, que no tenía permiso sobre las existencias—,
      // el vale quedaba en la base y los repuestos seguían contados en el almacén. Se
      // encontró uno así, huérfano, al probar este flujo.
      const referencias = [];
      for (const r of repuestos) {
        if (!r.codigo) continue;
        const ref = await getArticleRefByCode(r.codigo, r.articleId);
        if (ref) referencias.push({ ref, cantidad: r.cantidad });
      }

      const lote = writeBatch(db);
      const valeRef = doc(collection(db, "ValeInsumos"));
      lote.set(valeRef, {
        ...form, repuestos, usuario: currentUsuario, fechaCreacion: new Date().toISOString(),
      });
      for (const { ref, cantidad } of referencias) {
        lote.update(ref, { Stock: increment(-cantidad) });
      }
      lote.set(doc(collection(db, "Almacen_movement")), {
        Movement_type: "Salida",
        Article_name: repuestos.map((r) => r.descripcion).join(", "),
        Code_Id: repuestos.map((r) => r.codigo).join(", "),
        Quantity: -repuestos.reduce((s, r) => s + r.cantidad, 0),
        Total_Price: repuestos.reduce((s, r) => s + (r.precioCompra || 0) * r.cantidad, 0),
        Date: form.fecha,
        Warehouse: form.almacen,
        Description: form.observacion || "Vale de insumos",
        Document_Number: valeRef.id,
      });

      await lote.commit();
      setForm({ fecha: new Date().toISOString().split("T")[0], almacen: "w1", recepcionRef: "", observacion: "" });
      setRepuestos([]);
      setError("");
      setOpen(false);
      showToast("Vale creado");
      const snap = await getDocs(collection(db, "ValeInsumos"));
      setVales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Se dice QUÉ falló. El mensaje genérico anterior no distinguía entre un problema de
      // permisos y un dato mal puesto, y encima se tragaba el error sin dejar rastro.
      console.error("Vale de insumos:", e);
      const msg = String(e?.message || "");
      showToast(
        msg.includes("permission")
          ? "No tienes permisos para descontar existencias del almacén."
          : "No se pudo crear el vale. Revisa los datos e inténtalo de nuevo.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Toolbar title="Vale de insumos" count={vales.length} onNew={() => setOpen(true)} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Fecha", "Almacén", "OT", "Repuestos", "Observación"]}
        rows={rows}
        renderRow={(v) => (
          <>
            <Td className="gmp-mono">{v.fecha || ""}</Td>
            <Td>{(ALMACENES.find((a) => a.id === v.almacen) || {}).Nombre || v.almacen}</Td>
            <Td className="gmp-mono text-[var(--muted)]">{v.recepcionRef || "—"}</Td>
            <Td>{(v.repuestos || []).length} ítem(s)</Td>
            <Td className="text-[var(--muted)]">{v.observacion || "—"}</Td>
          </>
        )}
      />

      {open && (
        <Modal title="Nuevo vale de insumos" onClose={() => setOpen(false)} wide>
          {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Almacén">
              <select className={inputCls} value={form.almacen} onChange={(e) => setForm({ ...form, almacen: e.target.value })}>
                {ALMACENES.map((a) => <option key={a.id} value={a.id}>{a.Nombre}</option>)}
              </select>
            </Field>
            <Field label="Orden de trabajo (opcional)">
              <select className={inputCls} value={form.recepcionRef} onChange={(e) => setForm({ ...form, recepcionRef: e.target.value })}>
                <option value="">Sin OT</option>
                {ots.filter((o) => !o.facturado).map((o) => <option key={o.id} value={o.id}>{o.placa} — {o.nombre_cliente || o.Razon_social || o.cliente || o.razonSNombre || ""}</option>)}
              </select>
            </Field>
            <Field label="Observación"><input className={inputCls} value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Motivo del vale" /></Field>
          </div>
          <div className="mb-4">
            <label className="text-[12px] text-[var(--muted)] block mb-1.5 flex items-center gap-1"><Package size={13} /> Repuestos</label>
            <div className="flex items-center gap-2 mb-2">
              <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar artículo..." list="vale-art-list" />
              <datalist id="vale-art-list">
                {searchResults.map((a) => <option key={a.id} value={`${a.Codigo} - ${a.Nombre_name}`} />)}
              </datalist>
              <button type="button" onClick={addRepuesto} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]"><Plus size={16} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {repuestos.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputCls} flex-1`} value={r.descripcion} readOnly />
                  <input className={`${inputCls} w-24`} value={r.codigo} readOnly />
                  <input type="number" className={`${inputCls} w-20`} value={r.cantidad} onChange={(e) => setRepuestos((prev) => prev.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) } : x))} min="1" />
                  <button type="button" onClick={() => setRepuestos((prev) => prev.filter((_, j) => j !== i))} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={13} /></button>
                </div>
              ))}
              {repuestos.length === 0 && <p className="text-sm text-[var(--muted)] py-2">Sin repuestos.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancelar</Btn>
            <Btn onClick={submit}>Guardar vale</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

