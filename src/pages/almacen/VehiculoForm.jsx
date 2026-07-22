import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { saveMaestro, deleteMaestro } from "../../store/firestoreDb";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useCatalog } from "../../store/useCatalog";

const COL = "Vehiculos";

const defaultForm = {
  Placa: "", Propietario_Type: "Persona", Propietario_name: "", Propietario_Document: "",
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

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    setLoading(true);
    getDoc(doc(db, COL, id)).then((snap) => {
      if (!active) return;
      if (snap.exists()) setForm({ ...defaultForm, ...snap.data(), id });
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, isEdit]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isDelete = window.location.pathname.includes("/delete/");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveMaestro(COL, { ...form, id });
    navigate("/al-vehiculos");
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
                {["Persona", "Empresa"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Propietario" span><input className={inputCls} value={form.Propietario_name} onChange={(e) => set("Propietario_name", e.target.value)} /></Field>
            <Field label="Documento propietario"><input className={inputCls} value={form.Propietario_Document} onChange={(e) => set("Propietario_Document", e.target.value)} /></Field>

            <Field label="Marca">
              <select className={inputCls} value={form.Marca} onChange={(e) => set("Marca", e.target.value)}>
                <option value="">Selecciona</option>
                {vehMarcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Modelo">
              <select className={inputCls} value={form.Modelo} onChange={(e) => set("Modelo", e.target.value)}>
                <option value="">Selecciona</option>
                {vehModeloOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
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
            <Field label="SOAT exp."><input className={inputCls} value={form.SOAT_Expiration} onChange={(e) => set("SOAT_Expiration", e.target.value)} /></Field>
            <Field label="ITV exp."><input className={inputCls} value={form.ITV_Expiration} onChange={(e) => set("ITV_Expiration", e.target.value)} /></Field>
            <Field label="GNV exp."><input className={inputCls} value={form.GNV_Expiration} onChange={(e) => set("GNV_Expiration", e.target.value)} /></Field>
            <Field label="Estado">
              <select className={inputCls} value={form.Estado} onChange={(e) => set("Estado", e.target.value)}>
                {["Activo", "Inactivo", "En Taller"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate("/al-vehiculos")}>Cancelar</Btn>
          <Btn type="submit">{isEdit ? "Guardar cambios" : "Crear vehículo"}</Btn>
        </div>
      </form>
    </div>
  );
}
