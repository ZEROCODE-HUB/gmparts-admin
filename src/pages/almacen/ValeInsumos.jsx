import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { useStoreCollection } from "../../store/useStoreCollection";
import { useFirestoreDocuments, useFirestoreCollection } from "../../store/firestoreDb";
const ALMACENES = [
  { id: "w1", Nombre: "Almacén Principal" },
  { id: "w2", Nombre: "Almacén Secundario" },
  { id: "w3", Nombre: "Depósito Taller" },
];
import * as db from "../../store/db";
import { searchArticles } from "../../store/firestoreStock";

export default function ValeInsumos() {
  const [vales, { refresh }] = useStoreCollection("al-vale");
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

  const submit = () => {
    if (repuestos.length === 0) { setError("Agregue al menos un repuesto"); return; }
    db.saveVale({ ...form, repuestos, id: db.nextDocId("al-vale"), usuario: "GM Parts Admin" });
    setForm({ fecha: new Date().toISOString().split("T")[0], almacen: "w1", recepcionRef: "", observacion: "" });
    setRepuestos([]);
    setError("");
    setOpen(false);
    refresh();
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

