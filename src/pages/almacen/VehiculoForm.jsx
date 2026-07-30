import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { saveMaestro, deleteMaestro } from "../../store/firestoreDb";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { where } from "firebase/firestore";
import { useFirestoreCollection } from "../../store/firestoreDb";
import { useCatalog } from "../../store/useCatalog";

const COL = "Vehiculos";

const defaultForm = {
  Placa: "", Propietario_Type: "Natural", Propietario_name: "", Propietario_Document: "",
  Marca: "", Modelo: "", Version: "", anio_de_fabricion: "", aniodemodelo: "",
  Color: "", TipoMotor: "", NroMotor: "", Transmision: "", VIN_Serie: "", TipoCombustible: "",
  Categoria: "", Carroceria: "", FormRodante: "", Descripcion: "",
  SOAT_Expiration: "", ITV_Expiration: "", GNV_Expiration: "", Estado: "Activo",
};

export default function VehiculoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "nuevo";

  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const vehMarcaOpts = useCatalog("cat-vehmarca");
  const vehModeloOpts = useCatalog("cat-vehmodelo");
  const clientesRaw = useFirestoreCollection("users", [where("user_role", "==", "Cliente")]);
  const clientesOpts = clientesRaw.map((d) => ({
    id: d.id,
    nombre: d.display_name || d.nombre || "",
    documento: d.IdentityDocument || d.documento || "",
  }));
  const filteredModelos = useMemo(() => {
    if (!form.Marca) return [];
    return vehModeloOpts.filter((m) => {
      const marca = m.seed ? m.marca : m.raw?.marca;
      return marca === form.Marca;
    });
  }, [form.Marca, vehModeloOpts]);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    setLoading(true);
    getDoc(doc(db, COL, id)).then((snap) => {
      if (!active) return;
      if (snap.exists()) {
        const data = snap.data();
        setForm({ ...defaultForm, ...data, id,
          SOAT_Expiration: toDateStr(data.SOAT_Expiration),
          ITV_Expiration: toDateStr(data.ITV_Expiration),
          GNV_Expiration: toDateStr(data.GNV_Expiration),
        });
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, isEdit]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isDelete = window.location.pathname.includes("/delete/");

  const [saving, setSaving] = useState(false);

  function toDateStr(val) {
    if (!val) return "";
    if (typeof val === "string") return val.includes("/") ? val.split("/").reverse().join("-") : val.slice(0, 10);
    if (val.seconds) return new Date(val.seconds * 1000).toISOString().slice(0, 10);
    return "";
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = { ...form, id };
      const clienteSel = clientesOpts.find(c => c.nombre === form.Propietario_name);
      if (clienteSel?.id) formData.Propietario = doc(db, "users", clienteSel.id);
      await saveMaestro(COL, formData);
      navigate("/al-vehiculos");
    } catch {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteMaestro(COL, id);
    navigate("/al-vehiculos");
  };

  if (isDelete) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <p className="mb-4">¿Eliminar vehículo <b>{form.Placa}</b>?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => navigate("/al-vehiculos")}>Cancelar</Btn>
            <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-sm text-[var(--muted)]">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/al-vehiculos")} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
        <h1 className="gmp-display text-xl font-bold">{isEdit ? "Editar vehículo" : "Nuevo vehículo"}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Placa"><input className={inputCls} value={form.Placa} onChange={(e) => set("Placa", e.target.value)} required /></Field>
            <Field label="Tipo propietario">
              <select className={inputCls} value={form.Propietario_Type} onChange={(e) => set("Propietario_Type", e.target.value)}>
                {["Natural", "Jurídica"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Propietario" span>
              <div className="flex gap-2">
                <select
                  className={inputCls}
                  value={form.Propietario_name}
                  onChange={(e) => {
                    const selected = e.target.value;
                    const c = clientesOpts.find((cl) => cl.nombre === selected);
                    set("Propietario_name", selected);
                    set("Propietario_Document", c?.documento || "");
                  }}
                >
                  <option value="">Selecciona cliente</option>
                  {clientesOpts.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Marca">
              <select className={inputCls} value={form.Marca} onChange={(e) => set("Marca", e.target.value)}>
                <option value="">Selecciona</option>
                {vehMarcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Modelo">
              <select className={inputCls} value={form.Modelo} onChange={(e) => set("Modelo", e.target.value)}>
                <option value="">Selecciona</option>
                {filteredModelos.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Versión"><input className={inputCls} value={form.Version} onChange={(e) => set("Version", e.target.value)} /></Field>
            <Field label="Año fabricación"><input className={inputCls} value={form.anio_de_fabricion} onChange={(e) => set("anio_de_fabricion", e.target.value)} /></Field>
            <Field label="Año modelo"><input className={inputCls} value={form.aniodemodelo} onChange={(e) => set("aniodemodelo", e.target.value)} /></Field>
            <Field label="Color"><input className={inputCls} value={form.Color} onChange={(e) => set("Color", e.target.value)} /></Field>
            <Field label="Tipo motor"><input className={inputCls} value={form.TipoMotor} onChange={(e) => set("TipoMotor", e.target.value)} /></Field>
            <Field label="Nro motor"><input className={inputCls} value={form.NroMotor} onChange={(e) => set("NroMotor", e.target.value)} /></Field>
            <Field label="Transmisión"><input className={inputCls} value={form.Transmision} onChange={(e) => set("Transmision", e.target.value)} /></Field>
            <Field label="VIN / Serie"><input className={inputCls} value={form.VIN_Serie} onChange={(e) => set("VIN_Serie", e.target.value)} /></Field>
            <Field label="Combustible"><input className={inputCls} value={form.TipoCombustible} onChange={(e) => set("TipoCombustible", e.target.value)} /></Field>
            <Field label="Categoría"><input className={inputCls} value={form.Categoria} onChange={(e) => set("Categoria", e.target.value)} /></Field>
            <Field label="Carrocería"><input className={inputCls} value={form.Carroceria} onChange={(e) => set("Carroceria", e.target.value)} /></Field>
            <Field label="Form. rodante"><input className={inputCls} value={form.FormRodante} onChange={(e) => set("FormRodante", e.target.value)} /></Field>
            <Field label="Descripción" span><textarea className={`${inputCls} resize-none`} rows={3} value={form.Descripcion} onChange={(e) => set("Descripcion", e.target.value)} /></Field>
            <Field label="SOAT exp."><input type="date" className={inputCls} value={form.SOAT_Expiration || ''} onChange={(e) => set("SOAT_Expiration", e.target.value)} /></Field>
            <Field label="ITV exp."><input type="date" className={inputCls} value={form.ITV_Expiration || ''} onChange={(e) => set("ITV_Expiration", e.target.value)} /></Field>
            <Field label="GNV exp."><input type="date" className={inputCls} value={form.GNV_Expiration || ''} onChange={(e) => set("GNV_Expiration", e.target.value)} /></Field>
            <Field label="Estado">
              <select className={inputCls} value={form.Estado} onChange={(e) => set("Estado", e.target.value)}>
                {["Activo", "Inactivo", "En Taller"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate("/al-vehiculos")}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Crear vehículo"}</Btn>
        </div>
      </form>
    </div>
  );
}
