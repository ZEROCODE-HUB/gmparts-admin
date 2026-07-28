import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Wrench, Package } from "lucide-react";
import { where } from "firebase/firestore";
import Btn from "../../../components/ui/Btn";
import Field, { inputCls } from "../../../components/ui/Field";
import { useFirestoreCollection } from "../../../store/firestoreDb";
import * as db from "../../../store/db";
import { searchArticles, firestoreSaveDocument } from "../../../store/firestoreStock";
import { useCatalog } from "../../../store/useCatalog";

const ESTADOS = ["Recepción", "Diagnóstico", "Reparación", "Finalizado"];

export default function OrdenTrabajoEditor({ backPath, mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const clientesOpts = useFirestoreCollection("users", [where("user_role", "==", "Cliente")]).map((d) => ({
    id: d.id,
    nombre: d.display_name || d.nombre || "",
    documento: d.IdentityDocument || d.documento || "",
  }));
  const [docId, setDocId] = useState(id && id !== "nuevo" ? id : null);

  const [form, setForm] = useState({
    numeroorden: "", cliente: "", clienteDoc: "", placa: "", marca: "", modelo: "",
    km_ingreso: "", tecnico: "", tipoServicio: "", motivo_ingreso: "", observaciones: "",
    estado: "Recepción", fecha_creacion: new Date().toISOString().split("T")[0],
  });
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const vehMarcaOpts = useCatalog("cat-vehmarca");
  const vehModeloOpts = useCatalog("cat-vehmodelo");
  const encargadoOpts = useCatalog("cat-encargado");

  useEffect(() => {
    if (id && id !== "nuevo" && isEdit) {
      const existing = db.getDocumentById("vs-orden", id);
      if (existing) {
        setDocId(existing.id);
        setForm((prev) => ({ ...prev, ...existing, fecha_creacion: existing.fecha_creacion || prev.fecha_creacion }));
        if (existing.diagnosticos) setDiagnosticos(existing.diagnosticos.map((d) => ({ ...d, repuestos: d.repuestos ? d.repuestos.map((r) => ({ ...r })) : [] })));
      }
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const addDiagnostico = () => setDiagnosticos((prev) => [...prev, { id: `d${Date.now()}`, nombreFalla: "", solucion: "", horasTrabajo: 1, manoDeObra: 0, repuestos: [] }]);

  const updateDiag = (i, field, value) => setDiagnosticos((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  const removeDiagnostico = (i) => setDiagnosticos((prev) => prev.filter((_, idx) => idx !== i));

  const addRepuesto = async (i, term) => {
    const raw = (term || "").trim();
    if (!raw) return "";
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    setDiagnosticos((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      const rep = found
        ? { descripcion: found.Nombre_name, codigo: found.Codigo, articleId: found.id, cantidad: 1 }
        : { descripcion: raw, codigo: "", articleId: "", cantidad: 1 };
      return { ...d, repuestos: [...d.repuestos, rep] };
    }));
    return "";
  };

  const updateRepuesto = (i, ri, field, value) => setDiagnosticos((prev) => prev.map((d, idx) => idx === i ? { ...d, repuestos: d.repuestos.map((r, j) => j === ri ? { ...r, [field]: value } : r) } : d));
  const removeRepuesto = (i, ri) => setDiagnosticos((prev) => prev.map((d, idx) => idx === i ? { ...d, repuestos: d.repuestos.filter((_, j) => j !== ri) } : d));

  const generarFactura = () => {
    const ot = { ...form, diagnosticos };
    const items = db.getOTFacturaItems(ot);
    navigate("/vs-factura/nuevo", { state: { fromOT: docId, cliente: form.cliente, clienteDoc: form.clienteDoc, placa: form.placa, items } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente) { setError("Seleccione un cliente"); return; }
    setError("");
    setSaving(true);
    const doc = { ...form, diagnosticos, numeroorden: form.numeroorden || db.getDocuments("vs-orden").length + 1, facturado: false, stockConsumed: false };
    if (docId) doc.id = docId;
    try {
      await firestoreSaveDocument("vs-orden", doc);
      navigate(backPath);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputMono = `${inputCls} w-full`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(backPath)} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
          <h1 className="gmp-display text-xl font-bold">{isEdit ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}</h1>
        </div>
        {isEdit && !form.facturado && (
          <Btn variant="accent" onClick={generarFactura}>Generar factura</Btn>
        )}
      </div>
      {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-dim)] px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}

      <form onSubmit={handleSubmit}>

      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Recepción de vehículo</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Cliente">
            <select className={inputMono} value={form.cliente} onChange={(e) => { const c = clientesOpts.find((x) => x.nombre === e.target.value); set("cliente", e.target.value); if (c) set("clienteDoc", c.documento); }}>
              <option value="">Selecciona cliente</option>
              {clientesOpts.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Documento"><input className={inputMono} value={form.clienteDoc} readOnly /></Field>
          <Field label="Placa"><input className={inputMono} value={form.placa} onChange={(e) => set("placa", e.target.value)} placeholder="ABC-123" /></Field>
          <Field label="Marca">
            <select className={inputMono} value={form.marca} onChange={(e) => set("marca", e.target.value)}>
              <option value="">Selecciona</option>
              {vehMarcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Modelo">
            <select className={inputMono} value={form.modelo} onChange={(e) => set("modelo", e.target.value)}>
              <option value="">Selecciona</option>
              {vehModeloOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="KM ingreso"><input type="number" className={inputMono} value={form.km_ingreso} onChange={(e) => set("km_ingreso", e.target.value)} /></Field>
          <Field label="Técnico asignado">
            <select className={inputMono} value={form.tecnico} onChange={(e) => set("tecnico", e.target.value)}>
              <option value="">Sin asignar</option>
              {encargadoOpts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo de servicio"><input className={inputMono} value={form.tipoServicio} onChange={(e) => set("tipoServicio", e.target.value)} /></Field>
          <Field label="Estado">
            <select className={inputMono} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fecha ingreso"><input type="date" className={inputMono} value={form.fecha_creacion} onChange={(e) => set("fecha_creacion", e.target.value)} /></Field>
          <Field label="Motivo de ingreso" span><input className={inputMono} value={form.motivo_ingreso} onChange={(e) => set("motivo_ingreso", e.target.value)} placeholder="Ejem: falla de frenos" /></Field>
          <Field label="Observaciones" span><input className={inputMono} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} /></Field>
        </div>
      </div>

      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2"><Wrench size={16} /> Diagnóstico y repuestos</h2>
          <button type="button" onClick={addDiagnostico} className="shrink-0 px-3 py-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)] text-xs font-semibold flex items-center gap-1"><Plus size={14} /> Agregar diagnóstico</button>
        </div>
        {diagnosticos.length === 0 && <p className="text-sm text-[var(--muted)] py-4">Sin diagnósticos. Agregue uno para registrar falla, solución, mano de obra y repuestos.</p>}
        <div className="flex flex-col gap-4">
          {diagnosticos.map((d, i) => (
            <div key={d.id} className="bg-[var(--surface-2)] rounded-lg p-4 border border-[var(--line-soft)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Diagnóstico #{i + 1}</p>
                <button type="button" onClick={() => removeDiagnostico(i)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]" title="Eliminar"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Nombre de falla"><input className={inputCls} value={d.nombreFalla} onChange={(e) => updateDiag(i, "nombreFalla", e.target.value)} /></Field>
                <Field label="Solución"><input className={inputCls} value={d.solucion} onChange={(e) => updateDiag(i, "solucion", e.target.value)} /></Field>
                <Field label="Horas de trabajo"><input type="number" className={inputCls} value={d.horasTrabajo} onChange={(e) => updateDiag(i, "horasTrabajo", Number(e.target.value))} min="0" /></Field>
                <Field label="Mano de obra (S/)"><input type="number" className={inputCls} value={d.manoDeObra} onChange={(e) => updateDiag(i, "manoDeObra", Number(e.target.value))} min="0" step="0.01" /></Field>
              </div>
              <p className="text-[12px] text-[var(--muted)] mb-1.5 flex items-center gap-1"><Package size={13} /> Repuestos consumidos</p>
              <div className="flex flex-col gap-2">
                {d.repuestos.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <input className={`${inputCls} flex-1`} value={`${r.codigo} - ${r.descripcion}`} onChange={(e) => {
                        const parts = e.target.value.split(" - ");
                        updateRepuesto(i, ri, "codigo", parts[0] || "");
                        updateRepuesto(i, ri, "descripcion", parts.slice(1).join(" - ") || "");
                      }} placeholder="Código - Nombre" />
                      <input type="number" className={`${inputCls} w-20`} value={r.cantidad} onChange={(e) => updateRepuesto(i, ri, "cantidad", Number(e.target.value))} min="1" />
                      <button type="button" onClick={() => removeRepuesto(i, ri)} className="p-1 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={13} /></button>
                    </div>
                ))}
                <RepuestoAdder onAdd={(term) => addRepuesto(i, term)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={() => navigate(backPath)}>Cancelar</Btn>
        <Btn type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Crear orden"}</Btn>
      </div>
      </form>
    </div>
  );
}

function RepuestoAdder({ onAdd }) {
  const [term, setTerm] = useState("");
  const [termResults, setTermResults] = useState([]);
  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) { setTermResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchArticles(t, { limit: 10 });
      setTermResults(r || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);
  return (
    <div className="flex items-center gap-2">
      <input className={inputCls} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar artículo y agregar..." list="ot-art-list" />
      <datalist id="ot-art-list">
        {termResults.map((a) => <option key={a.id} value={`${a.Codigo} - ${a.Nombre_name}`} />)}
      </datalist>
      <button type="button" onClick={async () => { await addRepuestoTerm(term); setTerm(""); }} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]"><Plus size={16} /></button>
    </div>
  );
  async function addRepuestoTerm(t) { await onAdd(t); }
}
