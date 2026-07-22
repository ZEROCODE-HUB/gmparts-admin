import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";
import { monedasSeed, productTypesSeed, warrantySeed, serialSeed } from "../../mock/seed.articulos";
import { useCatalog } from "../../store/useCatalog";
import { addCatalogEntry } from "../../store/firestoreDb";
import { db } from "../../lib/firebase";
import { collection, doc, getDoc, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import InlineCreateDialogs from "./InlineCreateDialogs";

const emptyArticle = {
  Codigo: "", Product_type: "Producto", OEM: "", Codigo_proveedor: "", Nombre_name: "",
  Marca_brand: "", Unidad_de_medida_Measurement_unit: "", Group_Grupo: "", Subgroup_Subgrupo: "",
  Garantia_Warranty: "", No_Sere_If_Have_Serial_Nr: "No", Stock_minimo_Minimum_Stock: 0,
  Moneda_Currency: "PEN", Precio_compra_Purchase_price: 0, Utilidad_Profit_Percentage: 0,
  Precio_Venta_Sale_price: 0, Codigo_de_Barras_Bar_Code: "", Imagen_Picture: "",
  Ubicacion_Location: "", Comentario: "", Precio_Fabrica_P1_FactoryPriceP1: 0,
  Precio_Fabrica_P2_FactoryPriceP2: 0, Precio_Fabrica_P3_FactoryPriceP3: 0,
  Precio_Fabrica_PvtaM_FactoryPricePvtaM: 0, Stock: 0, precioventaconigv: 0,
};

export default function ArticuloForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(emptyArticle);
  const [dialog, setDialog] = useState(null);
  const isEdit = id && id !== "nuevo";

  useEffect(() => {
    if (isEdit) {
      getDoc(doc(db, "Articles", id)).then((snap) => {
        if (snap.exists()) setForm((prev) => ({ ...prev, ...snap.data(), id: snap.id }));
      });
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const marcaOpts = useCatalog("cat-marca");
  const grupoOpts = useCatalog("cat-grupo");
  const subgrupoOpts = useCatalog("cat-subgrupo");
  const unidadOpts = useCatalog("cat-unidad");

  const handleCalcVenta = () => {
    const compra = Number(form.Precio_compra_Purchase_price) || 0;
    const util = Number(form.Utilidad_Profit_Percentage) || 0;
    const venta = compra * (1 + util / 100);
    set("Precio_Venta_Sale_price", Math.round(venta * 100) / 100);
    set("precioventaconigv", Math.round(venta * 1.18 * 100) / 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form };
    delete data.id;
    if (isEdit) {
      await setDoc(doc(db, "Articles", id), data, { merge: true });
    } else {
      await addDoc(collection(db, "Articles"), data);
    }
    navigate("/al-articulos");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/al-articulos")} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><ArrowLeft size={18} /></button>
        <h1 className="gmp-display text-xl font-bold">{isEdit ? "Editar artículo" : "Nuevo artículo"}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Datos generales</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Código"><input className={inputCls} value={form.Codigo} onChange={(e) => set("Codigo", e.target.value)} placeholder="Escribe aquí" /></Field>
            <Field label="Producto / Servicio">
              <select className={inputCls} value={form.Product_type} onChange={(e) => set("Product_type", e.target.value)}>
                {productTypesSeed.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="OEM"><input className={inputCls} value={form.OEM} onChange={(e) => set("OEM", e.target.value)} placeholder="Escribe aquí" /></Field>
            <Field label="Código proveedor"><input className={inputCls} value={form.Codigo_proveedor} onChange={(e) => set("Codigo_proveedor", e.target.value)} placeholder="Escribe aquí" /></Field>
            <Field label="Nombre" span><input className={inputCls} value={form.Nombre_name} onChange={(e) => set("Nombre_name", e.target.value)} placeholder="Escribe aquí" required /></Field>
            <Field label="Marca">
              <div className="flex gap-2">
                <select className={inputCls} value={form.Marca_brand} onChange={(e) => set("Marca_brand", e.target.value)}>
                  <option value="">Selecciona</option>
                  {marcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
                <button type="button" onClick={() => setDialog("marca")} className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Unidad de medida">
              <div className="flex gap-2">
                <select className={inputCls} value={form.Unidad_de_medida_Measurement_unit} onChange={(e) => set("Unidad_de_medida_Measurement_unit", e.target.value)}>
                  <option value="">Selecciona</option>
                  {unidadOpts.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <button type="button" onClick={() => setDialog("unidad")} className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Grupo">
              <div className="flex gap-2">
                <select className={inputCls} value={form.Group_Grupo} onChange={(e) => set("Group_Grupo", e.target.value)}>
                  <option value="">Selecciona</option>
                  {grupoOpts.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <button type="button" onClick={() => setDialog("grupo")} className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Subgrupo">
              <div className="flex gap-2">
                <select className={inputCls} value={form.Subgroup_Subgrupo} onChange={(e) => set("Subgroup_Subgrupo", e.target.value)}>
                  <option value="">Selecciona</option>
                  {subgrupoOpts.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setDialog("subgrupo")} className="p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)]"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Garantía">
              <select className={inputCls} value={form.Garantia_Warranty} onChange={(e) => set("Garantia_Warranty", e.target.value)}>
                <option value="">Selecciona</option>
                {warrantySeed.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Tiene serie">
              <select className={inputCls} value={form.No_Sere_If_Have_Serial_Nr} onChange={(e) => set("No_Sere_If_Have_Serial_Nr", e.target.value)}>
                {serialSeed.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Stock mínimo"><input type="number" className={inputCls} value={form.Stock_minimo_Minimum_Stock} onChange={(e) => set("Stock_minimo_Minimum_Stock", Number(e.target.value))} placeholder="0" /></Field>
          </div>

          <h2 className="text-sm font-semibold text-[var(--text)] mt-8 mb-4 uppercase tracking-wide">Precios</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Moneda">
              <select className={inputCls} value={form.Moneda_Currency} onChange={(e) => set("Moneda_Currency", e.target.value)}>
                {monedasSeed.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Precio compra"><input type="number" step="0.01" className={inputCls} value={form.Precio_compra_Purchase_price} onChange={(e) => { set("Precio_compra_Purchase_price", Number(e.target.value)); }} placeholder="0.00" /></Field>
            <Field label="% Utilidad">
              <div className="flex gap-2">
                <input type="number" step="0.01" className={inputCls} value={form.Utilidad_Profit_Percentage} onChange={(e) => set("Utilidad_Profit_Percentage", Number(e.target.value))} placeholder="0" />
                <button type="button" onClick={handleCalcVenta} className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white whitespace-nowrap">Calcular</button>
              </div>
            </Field>
            <Field label="Precio venta"><input type="number" step="0.01" className={inputCls} value={form.Precio_Venta_Sale_price} onChange={(e) => set("Precio_Venta_Sale_price", Number(e.target.value))} placeholder="0.00" /></Field>
            <Field label="Precio venta + IGV"><input type="number" step="0.01" className={inputCls} value={form.precioventaconigv} onChange={(e) => set("precioventaconigv", Number(e.target.value))} placeholder="0.00" /></Field>
            <Field label="Precio Fábrica P1"><input type="number" step="0.01" className={inputCls} value={form.Precio_Fabrica_P1_FactoryPriceP1} onChange={(e) => set("Precio_Fabrica_P1_FactoryPriceP1", Number(e.target.value))} placeholder="0.00" /></Field>
            <Field label="Precio Fábrica P2"><input type="number" step="0.01" className={inputCls} value={form.Precio_Fabrica_P2_FactoryPriceP2} onChange={(e) => set("Precio_Fabrica_P2_FactoryPriceP2", Number(e.target.value))} placeholder="0.00" /></Field>
            <Field label="Precio Fábrica P3"><input type="number" step="0.01" className={inputCls} value={form.Precio_Fabrica_P3_FactoryPriceP3} onChange={(e) => set("Precio_Fabrica_P3_FactoryPriceP3", Number(e.target.value))} placeholder="0.00" /></Field>
            <Field label="Precio Fábrica PvtaM"><input type="number" step="0.01" className={inputCls} value={form.Precio_Fabrica_PvtaM_FactoryPricePvtaM} onChange={(e) => set("Precio_Fabrica_PvtaM_FactoryPricePvtaM", Number(e.target.value))} placeholder="0.00" /></Field>
          </div>

          <h2 className="text-sm font-semibold text-[var(--text)] mt-8 mb-4 uppercase tracking-wide">Información adicional</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Código de barras"><input className={inputCls} value={form.Codigo_de_Barras_Bar_Code} onChange={(e) => set("Codigo_de_Barras_Bar_Code", e.target.value)} placeholder="Escribe aquí" /></Field>
            <Field label="Imagen">
              <div className="flex gap-2 items-center">
                <div className={`${inputCls} flex items-center gap-2 cursor-pointer`} onClick={() => {}}>
                  <Upload size={14} className="text-[var(--muted-2)]" />
                  <span className="text-[var(--muted-2)] text-xs">{form.Imagen_Picture ? "1 archivo" : "Subir imagen"}</span>
                </div>
              </div>
            </Field>
            <Field label="Ubicación"><input className={inputCls} value={form.Ubicacion_Location} onChange={(e) => set("Ubicacion_Location", e.target.value)} placeholder="Ej: A1-E2" /></Field>
            <Field label="Comentario" span><textarea className={`${inputCls} resize-none`} rows={3} value={form.Comentario} onChange={(e) => set("Comentario", e.target.value)} placeholder="Escribe aquí" /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => navigate("/al-articulos")}>Cancelar</Btn>
          <Btn type="submit">{isEdit ? "Guardar cambios" : "Crear artículo"}</Btn>
        </div>
      </form>

      {dialog && <InlineCreateDialogs type={dialog} onClose={() => setDialog(null)} onCreated={async (nombre) => {
        if (dialog === "marca") { await addCatalogEntry("cat-marca", nombre); set("Marca_brand", nombre); }
        else if (dialog === "grupo") { await addCatalogEntry("cat-grupo", nombre); set("Group_Grupo", nombre); }
        else if (dialog === "subgrupo") { await addCatalogEntry("cat-subgrupo", nombre, { groupname: form.Group_Grupo }); set("Subgroup_Subgrupo", nombre); }
        else if (dialog === "unidad") { await addCatalogEntry("cat-unidad", nombre); set("Unidad_de_medida_Measurement_unit", nombre); }
        setDialog(null);
      }} />}
    </div>
  );
}
