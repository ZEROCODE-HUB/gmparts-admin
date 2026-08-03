import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Wrench, Package } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { where } from "firebase/firestore";
import Btn from "../ui/Btn";
import Field, { inputCls } from "../ui/Field";
import { useDebouncedCallback } from "../../lib/debounce";
import { useFirestoreCollection, useFirestoreDocuments, mapDocKeyToCollection } from "../../store/firestoreDb";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db as fbDb } from "../../lib/firebase";
import { showToast, dismissAll } from "../ui/Toast";
import * as db from "../../store/db";
import { searchArticles, firestoreSaveDocument } from "../../store/firestoreStock";

const COSTO_HORA = 60;

const SERVICIOS = [
  { id: "s1", Codigo: "SVC-001", Descripcion: "Cambio de Aceite y Filtro", Precio: 85.00 },
  { id: "s2", Codigo: "SVC-002", Descripcion: "Alineamiento y Balanceo", Precio: 120.00 },
  { id: "s3", Codigo: "SVC-003", Descripcion: "Revisión de Frenos", Precio: 60.00 },
  { id: "s4", Codigo: "SVC-004", Descripcion: "Cambio de Pastillas de Freno", Precio: 180.00 },
  { id: "s5", Codigo: "SVC-005", Descripcion: "Escaneo Electrónico", Precio: 50.00 },
  { id: "s6", Codigo: "SVC-006", Descripcion: "Cambio de Batería", Precio: 250.00 },
];

export default function ServicioEditor({ title, backPath, onSave, mode = "create", docKey }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const [docId, setDocId] = useState(id && id !== "nuevo" ? id : null);

  const [form, setForm] = useState({
    serie: "", numero: "", fecha: new Date().toISOString().split("T")[0],
    cliente: "", placa: "", clienteDoc: "", tipoDoc: "DNI",
    direccion: "", marca: "", modelo: "", color: "", combustible: "", kilometraje: "", anioFabricacion: "",
    tipoIgv: "INCLUIDO", formaPago: "Contado", moneda: "PEN", observacion: "",
  });
  const [items, setItems] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [artSearch, setArtSearch] = useState("");
  const [artResults, setArtResults] = useState([]);
  const [artQty, setArtQty] = useState(1);
  const [servicioSearch, setServicioSearch] = useState("");
  const [manoObraHoras, setManoObraHoras] = useState(1);
  const [saving, setSaving] = useState(false);
  const [cotModal, setCotModal] = useState(false);
  const [cotFilter, setCotFilter] = useState("");
  const [cotizacionesFacturas] = useFirestoreDocuments("vs-cotizacion");
  const cotizacionesRecepciones = useFirestoreCollection("recepciones", [where("status", "not-in", ["Recepci\u00f3n", "Diagn\u00f3stico"])]);
  const cotizaciones = [...cotizacionesRecepciones, ...cotizacionesFacturas];
  const fireClients = useFirestoreCollection("users", [where("user_role", "==", "Cliente")]).map((d) => ({
    id: d.id,
    nombre: d.display_name || d.nombre || "",
    documento: d.IdentityDocument || d.documento || "",
    tipoDocumento: d.tipo_de_documento || d.tipoDocumento || "",
    tipoPersona: (d.tipo_de_persona || d.tipoPersona || "Natural") === "Persona" ? "Natural" : (d.tipo_de_persona || d.tipoPersona || "Natural") === "Empresa" ? "Jurídica" : (d.tipo_de_persona || d.tipoPersona || "Natural"),
    direccion: d.direccion || "",
  }));
  const allClients = fireClients;
  const allVehicles = useFirestoreCollection("Vehiculos");

  useEffect(() => {
    if (!id || id === "nuevo" || !(isEdit || isView)) return;
    (async () => {
      // Try Firestore collection first (Facturas or FacturasVentasCompras)
      try {
        const colName = mapDocKeyToCollection(docKey);
        const ref = doc(fbDb, colName, id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDocId(id);
          setForm((prev) => ({
            ...prev,
            serie: data.serie || data.nserie || "",
            numero: data.numero || "",
            fecha: data.fecha || data.Fecha || "",
            cliente: data.cliente || data.razonSNombre || "",
            placa: data.placa || "",
            clienteDoc: data.clienteDoc || data.RUCempresa || "",
            direccion: data.direccion || "",
            marca: data.marca || "",
            modelo: data.modelo || "",
            color: data.color || "",
            combustible: data.combustible || "",
            kilometraje: data.kilometraje || data.km_ingreso || "",
            anioFabricacion: data.anioFabricacion || data.anio_de_fabricion || "",
            tipoDoc: data.tipoDoc || "DNI",
            observacion: data.Observaciones_adicionales || data.observacion || data.motivo || "",
            tipoIgv: data.tipoIgv === "INCLUIDO IGV" ? "INCLUIDO" : data.tipoIgv === "MAS IGV" ? "MAS" : data.tipoIgv || "INCLUIDO",
            formaPago: data.formaPago || data.FPago || "Contado",
            moneda: data.moneda || "PEN",
          }));
          if (data.items) setItems(data.items.map((li) => ({ ...li })));
          if (data.origen) setOrigen(data.origen);
          return;
        }
      } catch (e) { /* fallback below */ }
      // Try recepciones collection (Flutter-created cotizaciones/OTs)
      try {
        const ref = doc(fbDb, "recepciones", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const vehEdit = allVehicles.find((v) => v.Placa === (data.placa || ""));
          setDocId(id);
          setForm((prev) => ({
            ...prev,
            fecha: data.fecha_creacion || data.fecha || "",
            cliente: data.nombre_cliente || data.Razon_social || "",
            placa: data.placa || "",
            clienteDoc: data.RUCempresa || data.DNI || "",
            direccion: data.direccion || data.Direccion || "",
            marca: data.marca || data.Marca || (vehEdit && vehEdit.Marca) || "",
            modelo: data.modelo || data.Modelo || (vehEdit && vehEdit.Modelo) || "",
            color: data.color || data.Color || (vehEdit && vehEdit.Color) || "",
            combustible: data.combustible || data.TipoCombustible || (vehEdit && (vehEdit.TipoCombustible || vehEdit.Combustible)) || "",
            kilometraje: data.kilometraje || data.Kilometraje || data.km_ingreso || (vehEdit && (vehEdit.Kilometraje || vehEdit.km || vehEdit.km_ingreso)) || "",
            anioFabricacion: data.anioFabricacion || data.anio_de_fabricion || data.AnioFabricacion || data.Ano_fabricacion || data.ano_fabricacion || (vehEdit && (vehEdit.anio_de_fabricion || vehEdit.AnioFabricacion || vehEdit.anio)) || "",
            observacion: data.Observaciones_adicionales || data.motivo_ingreso || "",
            formaPago: "Contado",
            moneda: "PEN",
          }));
          return;
        }
      } catch (e) { /* fallback below */ }
      const existing = db.getDocumentById(docKey, id);
      if (existing) {
        setDocId(existing.id);
        setForm((prev) => ({
          ...prev,
          serie: existing.serie || "",
          numero: existing.numero || "",
          fecha: existing.fecha || "",
          cliente: existing.cliente || "",
          placa: existing.placa || "",
          clienteDoc: existing.clienteDoc || "",
          direccion: existing.direccion || "",
          marca: existing.marca || "",
          modelo: existing.modelo || "",
          color: existing.color || "",
          combustible: existing.combustible || "",
          kilometraje: existing.kilometraje || existing.km_ingreso || "",
          anioFabricacion: existing.anioFabricacion || existing.anio_de_fabricion || "",
          tipoDoc: existing.tipoDoc || "DNI",
          observacion: existing.Observaciones_adicionales || existing.observacion || "",
          tipoIgv: existing.tipoIgv || "INCLUIDO",
          formaPago: existing.formaPago || "Contado",
          moneda: existing.moneda || "PEN",
        }));
        if (existing.items) {
          setItems(existing.items.map((li) => ({ ...li })));
        }
        if (existing.origen) setOrigen(existing.origen);
      }
    })();
  }, [id, isEdit, isView, docKey]);

  // Precargar desde una Orden de Trabajo (botón "Generar factura").
  useEffect(() => {
    if (mode === "create" && location.state?.items) {
      setItems(location.state.items.map((li) => ({ ...li })));
      if (location.state.cliente) set("cliente", location.state.cliente);
      if (location.state.clienteDoc) set("clienteDoc", location.state.clienteDoc);
      if (location.state.placa) set("placa", location.state.placa);
      if (location.state.direccion) set("direccion", location.state.direccion);
      if (location.state.marca) set("marca", location.state.marca);
      if (location.state.modelo) set("modelo", location.state.modelo);
      if (location.state.color) set("color", location.state.color);
      if (location.state.combustible) set("combustible", location.state.combustible);
      if (location.state.kilometraje) set("kilometraje", location.state.kilometraje);
      if (location.state.anioFabricacion) set("anioFabricacion", location.state.anioFabricacion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const addServicioItem = () => {
    const term = servicioSearch.trim().toLowerCase();
    if (!term) return;
    const found = SERVICIOS.find((s) =>
      s.Descripcion.toLowerCase().includes(term)
    );
    if (found) {
      const newItem = {
        tipo: "servicio",
        descripcion: found.Descripcion,
        cant: 1,
        pu: found.Precio,
        total: found.Precio,
        codigo: found.Codigo,
        moneda: form.moneda || "PEN",
      };
      setItems((prev) => [...prev, newItem]);
      setServicioSearch("");
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

  const addManoObraItem = () => {
    const horas = Math.max(1, manoObraHoras);
    const total = horas * COSTO_HORA;
    const newItem = {
      tipo: "mano_obra",
      descripcion: `Mano de obra (${horas}h x S/${COSTO_HORA.toFixed(2)})`,
      cant: horas,
      pu: COSTO_HORA,
      total,
      codigo: "MO-001",
      moneda: form.moneda || "PEN",
    };
    setItems((prev) => [...prev, newItem]);
    setManoObraHoras(1);
  };

  const addArticuloItem = async () => {
    const raw = artSearch.trim();
    if (!raw) return;
    const results = await searchArticles(raw, { limit: 3 });
    const found = results[0];
    if (found) {
      const qty = Math.max(1, artQty);
      const pu = found.Precio_Venta_Sale_price;
      const newItem = {
        tipo: "repuesto",
        descripcion: found.Nombre_name,
        cant: qty,
        pu,
        total: qty * pu,
        codigo: found.Codigo,
        articleId: found.id,
        moneda: form.moneda || "PEN",
        stock: found.Stock || 0,
        precioCompra: found.Precio_compra_Purchase_price || 0,
        utilidad: found.Utilidad_Profit_Percentage || 0,
      };
      setItems((prev) => [...prev, newItem]);
      setArtSearch("");
      setArtQty(1);
    }
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // Flutter: cotización incluye servicios (horas) y repuestos (cotizaciones_widget.dart:1163,1234,1456).
  const articuloMatch = async (nombre) => {
    const results = await searchArticles(nombre, { limit: 3 });
    return results.find((a) =>
      (a.Nombre_name || "").toLowerCase().includes((nombre || "").toLowerCase()));
  };
  const servicioMatch = (nombre) => SERVICIOS.find((s) =>
    (s.Descripcion || "").toLowerCase().includes((nombre || "").toLowerCase()));

  const loadFromCotizacion = async (cot) => {
    const mapped = [];

    // Datos de recepciones (cotizaciones de servicio creadas en la App)
    const isRecepcion = cot.nombre_cliente || cot.Razon_social || cot.codeCT;
    if (isRecepcion) {
      let diags = cot.diagnosticos || [];
      if (diags.length === 0 && cot.id) {
        try {
          const snap = await getDocs(collection(fbDb, "recepciones", cot.id, "diagnosticos"));
          diags = snap.docs.map((d) => d.data());
        } catch { /* ignore */ }
      }
      for (const diag of diags) {
        const horas = Number(diag.horasTrabajo ?? diag.Horas_trabajo ?? diag.horas_trabajo ?? 0);
        const mo = Number(diag.manoDeObra ?? diag.Mano_de_obra ?? diag.mano_de_obra ?? 0);
        const sol = diag.solucion ?? diag.Solucion ?? "";
        if (mo > 0) {
          mapped.push({
            tipo: "mano_obra",
            descripcion: sol ? `Mano de obra: ${sol}` : "Mano de obra",
            cant: horas || 1,
            pu: horas ? +(mo / horas).toFixed(2) : mo,
            total: mo,
            moneda: form.moneda || "PEN",
          });
        }
        for (const rp of diag.Repuestos ?? diag.repuestos ?? []) {
          const cant = Number(rp.cantidad) || 1;
          const pu = Number(rp.precio) || Number(rp.pu) || 0;
          if (pu <= 0) continue;
          mapped.push({
            tipo: "repuesto",
            descripcion: rp.descripcion || rp.nombre || "",
            codigo: rp.codigo || "",
            cant,
            pu,
            total: cant * pu,
            moneda: form.moneda || "PEN",
          });
        }
      }
      set("cliente", cot.nombre_cliente || cot.Razon_social || "");
      set("clienteDoc", cot.RUCempresa || cot.DNI || "");
      set("placa", cot.placa || "");
      const cliFull = allClients.find((cl) => cl.nombre === (cot.nombre_cliente || cot.Razon_social || ""));
      set("direccion", cot.direccion || cot.Direccion || (cliFull && cliFull.direccion) || "");
      const veh = allVehicles.find((v) => v.Placa === cot.placa);
      set("marca", cot.marca || cot.Marca || (veh && veh.Marca) || "");
      set("modelo", cot.modelo || cot.Modelo || (veh && veh.Modelo) || "");
      set("color", cot.color || cot.Color || (veh && veh.Color) || "");
      set("combustible", cot.combustible || cot.TipoCombustible || (veh && (veh.TipoCombustible || veh.Combustible)) || "");
      set("kilometraje", cot.kilometraje || cot.Kilometraje || cot.km_ingreso || (veh && (veh.Kilometraje || veh.km || veh.km_ingreso)) || "");
      set("anioFabricacion", cot.anioFabricacion || cot.anio_de_fabricion || cot.AnioFabricacion || cot.Ano_fabricacion || cot.ano_fabricacion || (veh && (veh.anio_de_fabricion || veh.AnioFabricacion || veh.anio)) || "");
      setOrigen({ tipo: "cotizacion", ref: cot.codeCT || cot.id || "" });
      setCotModal(false);
      setCotFilter("");
      setItems(mapped);
      return;
    }

    // Datos de cotizaciones con items inline (Facturas)
    for (const it of cot.items || []) {
      const nombre = it.art || it.descripcion || "";
      const sMatch = servicioMatch(nombre);
      const aMatch = await articuloMatch(nombre);
      if (sMatch && !aMatch) {
        mapped.push({ tipo: "servicio", descripcion: sMatch.Descripcion, cant: it.cant ?? 1, pu: sMatch.Precio, total: (it.cant ?? 1) * sMatch.Precio, codigo: sMatch.Codigo, moneda: form.moneda || "PEN" });
      } else {
        const pu = it.pu ?? (aMatch ? aMatch.Precio_Venta_Sale_price : 0);
        mapped.push({
          tipo: "repuesto", descripcion: nombre, cant: it.cant ?? 1, pu,
          total: (it.cant ?? 1) * pu, codigo: aMatch ? aMatch.Codigo : "", moneda: form.moneda || "PEN",
          stock: aMatch ? (aMatch.Stock || 0) : null,
          precioCompra: aMatch ? (aMatch.Precio_compra_Purchase_price || 0) : 0,
          utilidad: aMatch ? (aMatch.Utilidad_Profit_Percentage || 0) : 0,
        });
      }
    }
    setItems(mapped);
    const nombreCot = cot.cliente || cot.RazonSNombre || "";
    set("cliente", nombreCot);
    set("clienteDoc", cot.clienteDoc || "");
    const cliCot = allClients.find((cl) => cl.nombre === nombreCot);
    set("direccion", cot.direccion || cot.Direccion || (cliCot && cliCot.direccion) || "");
    set("placa", cot.placa || "");
    const vehCot = allVehicles.find((v) => v.Placa === (cot.placa || ""));
    set("marca", cot.marca || cot.Marca || (vehCot && vehCot.Marca) || "");
    set("modelo", cot.modelo || cot.Modelo || (vehCot && vehCot.Modelo) || "");
    set("color", cot.color || cot.Color || (vehCot && vehCot.Color) || "");
    set("combustible", cot.combustible || cot.TipoCombustible || (vehCot && (vehCot.TipoCombustible || vehCot.Combustible)) || "");
    set("kilometraje", cot.kilometraje || cot.Kilometraje || cot.km_ingreso || (vehCot && (vehCot.Kilometraje || vehCot.km || vehCot.km_ingreso)) || "");
    set("anioFabricacion", cot.anioFabricacion || cot.anio_de_fabricion || cot.AnioFabricacion || cot.Ano_fabricacion || cot.ano_fabricacion || (vehCot && (vehCot.anio_de_fabricion || vehCot.AnioFabricacion || vehCot.anio)) || "");
    if (!form.tipoIgv) set("tipoIgv", cot.tipoIgv || "INCLUIDO");
    if (!form.formaPago) set("formaPago", cot.formaPago || "Contado");
    if (!form.moneda) set("moneda", cot.moneda || "PEN");
    setOrigen({ tipo: "cotizacion", ref: `${cot.serie}-${cot.numero}` });
    setCotModal(false);
    setCotFilter("");
  };

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

  const validate = () => {
    if (!form.moneda) return "Seleccione Moneda";
    if (!form.fecha) return "La fecha es obligatoria";
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
    e.preventDefault();
    const err = validate();
    if (err) { showToast(err, "error"); return; }
    dismissAll();
    setSaving(true);
    const doc = { ...form, id: docId, items, subtotal, igv, total, origen, estado: form.estado || "Emitida" };
    try {
      if (docKey) await firestoreSaveDocument(docKey, doc);
      if (onSave) onSave(doc);
      if (location.state?.fromOT) db.markRecepcionFacturada(location.state.fromOT);
      navigate(backPath);
    } catch (saveErr) {
      console.error(saveErr);
      showToast("Error al guardar el documento", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputMono = `${inputCls} w-full`;

  const typeBadge = (tipo) => {
    const map = {
      mano_obra: "bg-purple-100 text-purple-700 M.O.",
      repuesto: "bg-blue-100 text-blue-700 Rep.",
      servicio: "bg-green-100 text-green-700 Serv.",
    };
    const entry = map[tipo] || "bg-gray-100 text-gray-700 ?";
    const [bg, txt, label] = entry.split(" ");
    return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${bg} ${txt}`}>{label}</span>;
  };

  const renderItemRows = () => {
    if (items.length === 0) return <p className="text-sm text-[var(--muted)] py-4">Sin detalle. Use los botones de arriba para agregar servicios, mano de obra o repuestos.</p>;
    return (
      <div className="bg-[var(--surface-2)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">P. Venta</th>
              <th className="px-4 py-3 text-right">P. Compra</th>
              <th className="px-4 py-3 text-right">Utilidad %</th>
              <th className="px-4 py-3 text-right">Total</th>
              {!isView && <th className="px-4 py-3 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((li, i) => (
              <tr key={i} className="border-t border-[var(--line-soft)]">
                <td className="px-4 py-3">{typeBadge(li.tipo)}</td>
                <td className="px-4 py-3 font-medium">{li.descripcion}</td>
                <td className="px-4 py-3 text-right gmp-mono">
                  {isView ? (
                    li.cant
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="number" className="w-16 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.cant} onChange={(e) => updateItemQty(i, Number(e.target.value))} min="1" />
                      {!isView && li.tipo === "repuesto" && li.stock != null && Number(li.cant) > Number(li.stock) && (
                        <span className="text-[10px] text-[var(--danger)] mt-0.5">No tienes stock disponible</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.pu).toFixed(2)}</td>
                {li.tipo === "repuesto" ? (
                  <>
                    {isView ? (
                      <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.precioCompra || 0).toFixed(2)}</td>
                    ) : (
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="0.01" className="w-20 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.precioCompra || 0} onChange={(e) => updateItemPrecioCompra(i, Number(e.target.value))} min="0" />
                      </td>
                    )}
                    {isView ? (
                      <td className="px-4 py-3 text-right gmp-mono">{Number(li.utilidad || 0).toFixed(0)}%</td>
                    ) : (
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="0.01" className="w-16 text-right gmp-mono bg-transparent border-b border-[var(--line-soft)] focus:border-[var(--accent)] outline-none" value={li.utilidad || 0} onChange={(e) => updateItemUtilidad(i, Number(e.target.value))} min="0" />
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-center text-[var(--muted)]">—</td>
                    <td className="px-4 py-3 text-center text-[var(--muted)]">—</td>
                  </>
                )}
                <td className="px-4 py-3 text-right gmp-mono">S/ {Number(li.total).toFixed(2)}</td>
                {!isView && (
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
            <Field label="Cliente"><div className="text-sm py-2">{form.cliente || "-"}</div></Field>
            <Field label="Dirección"><div className="text-sm py-2">{form.direccion || "-"}</div></Field>
            <Field label="Documento"><div className="text-sm py-2">{form.clienteDoc || "-"}</div></Field>
            <Field label="Placa"><div className="text-sm py-2">{form.placa || "-"}</div></Field>
            <Field label="Marca"><div className="text-sm py-2">{form.marca || "-"}</div></Field>
            <Field label="Modelo"><div className="text-sm py-2">{form.modelo || "-"}</div></Field>
            <Field label="Color"><div className="text-sm py-2">{form.color || "-"}</div></Field>
            <Field label="Combustible"><div className="text-sm py-2">{form.combustible || "-"}</div></Field>
            <Field label="Kilometraje"><div className="text-sm py-2">{form.kilometraje || "-"}</div></Field>
            <Field label="Tipo IGV"><div className="text-sm py-2">{form.tipoIgv || "-"}</div></Field>
            <Field label="Forma de pago"><div className="text-sm py-2">{form.formaPago || "-"}</div></Field>
            <Field label="Moneda"><div className="text-sm py-2">{form.moneda || "-"}</div></Field>
            <Field label="Observación" span><div className="text-sm py-2">{form.observacion || "-"}</div></Field>
            {origen && (
              <Field label="Documento de origen" span><div className="text-sm py-2 font-semibold text-[var(--accent)]">Origen: {origen.tipo} {origen.ref}</div></Field>
            )}
          </div>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Detalle</h2>
          {renderItemRows()}
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
        <h1 className="gmp-display text-xl font-bold">{isEdit ? `Editar ${title}` : `Nuev${title.toLowerCase().startsWith("o") ? "a" : "o"} ${title}`}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide">Datos del documento</h2>
            <div className="flex items-center gap-2">
              {origen && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-semibold">Origen: {origen.tipo} {origen.ref}</span>
              )}
              {docKey !== "vs-cotizacion" && (
                <button type="button" onClick={() => setCotModal(true)} className="shrink-0 px-3 py-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)] text-xs font-semibold flex items-center gap-1"><Plus size={14} /> Agregar Cotización</button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Serie"><input className={inputMono} value={form.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ejem: SC01" /></Field>
            <Field label="Número"><input className={inputMono} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="000001" /></Field>
            <Field label="Fecha"><input type="date" className={inputMono} value={form.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
            <Field label="Cliente">
              <select className={inputMono} value={form.cliente} onChange={(e) => { const c = allClients.find((x) => x.nombre === e.target.value); set("cliente", e.target.value); if (c) { set("clienteDoc", c.documento); set("tipoDoc", c.tipoDocumento); set("direccion", c.direccion || ""); } }}>
                <option value="">Selecciona cliente</option>
                {allClients.filter((c, i, a) => a.findIndex((x) => x.nombre === c.nombre) === i).map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Documento"><input className={inputMono} value={form.clienteDoc} readOnly /></Field>
            <Field label="Placa">
              <select className={inputMono} value={form.placa} onChange={(e) => { const v = allVehicles.find((x) => x.Placa === e.target.value); set("placa", e.target.value); if (v) { set("marca", v.Marca || ""); set("modelo", v.Modelo || ""); set("color", v.Color || ""); set("combustible", v.TipoCombustible || v.Combustible || ""); set("kilometraje", v.Kilometraje || v.km || ""); set("anioFabricacion", v.anio_de_fabricion || v.AnioFabricacion || ""); } }}>
                <option value="">Selecciona</option>
                {allVehicles.filter((v) => v.Propietario_name === form.cliente).map((v) => <option key={v.id} value={v.Placa}>{v.Placa} - {v.Marca} {v.Modelo}</option>)}
              </select>
            </Field>
            <Field label="Tipo IGV">
              <select className={inputMono} value={form.tipoIgv} onChange={(e) => set("tipoIgv", e.target.value)}>
                <option value="INCLUIDO">INCLUIDO IGV</option>
                <option value="MAS">MAS IGV</option>
              </select>
            </Field>
            <Field label="Forma de pago">
              <select className={inputMono} value={form.formaPago} onChange={(e) => set("formaPago", e.target.value)}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </select>
            </Field>
            <Field label="Moneda">
              <select className={inputMono} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <Field label="Observación" span><input className={inputMono} value={form.observacion} onChange={(e) => set("observacion", e.target.value)} placeholder="Escribe aquí" /></Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide flex items-center gap-2"><Wrench size={16} /> Servicios / Mano de obra</h2>
            <div className="mb-4">
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar servicio y agregar</label>
              <div className="flex gap-2">
                <input className={inputCls} value={servicioSearch} onChange={(e) => setServicioSearch(e.target.value)} placeholder="Nombre del servicio..." list="svc-list" />
                <button type="button" onClick={addServicioItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar servicio"><Plus size={18} /></button>
              </div>
              <datalist id="svc-list">
                {SERVICIOS.map((s) => <option key={s.id} value={s.Descripcion} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[12px] text-[var(--muted)] block mb-1.5">Agregar Mano de obra</label>
              <div className="flex gap-2 items-center">
                <input type="number" className={`${inputCls} w-20`} value={manoObraHoras} onChange={(e) => setManoObraHoras(Number(e.target.value))} min="1" />
                <span className="text-xs text-[var(--muted)]">horas x S/{COSTO_HORA.toFixed(2)}/h</span>
                <button type="button" onClick={addManoObraItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar mano de obra"><Plus size={18} /></button>
              </div>
            </div>
          </div>
          <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide flex items-center gap-2"><Package size={16} /> Artículos / Repuestos</h2>
            </div>
            <label className="text-[12px] text-[var(--muted)] block mb-1.5">Buscar artículo y agregar</label>
            <div className="flex gap-2 mb-3">
              <input className={inputCls} value={artSearch} onChange={(e) => setArtSearch(e.target.value)} placeholder="Nombre o código..." list="art-list-svc" />
              <button type="button" onClick={addArticuloItem} className="shrink-0 p-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent-dim)] border border-[var(--line-soft)]" title="Agregar artículo"><Plus size={18} /></button>
            </div>
            <datalist id="art-list-svc">
              {artResults.map((a) => <option key={a.id} value={`${a.Codigo} - ${a.Nombre_name}`} />)}
            </datalist>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[var(--muted)]">Cantidad:</label>
              <input type="number" className={`${inputCls} w-20`} value={artQty} onChange={(e) => setArtQty(Number(e.target.value))} min="1" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)]">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Detalle completo ({items.length} líneas)</h2>
          {renderItemRows()}
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
              <input className={inputCls} value={cotFilter} onChange={(e) => setCotFilter(e.target.value)} placeholder="Buscar por cliente o código de cotización..." />
            </div>
            <div className="overflow-y-auto max-h-[55vh] px-5 pb-5">
              {cotizaciones.filter((c) => {
                const q = cotFilter.trim().toLowerCase();
                const name = c.nombre_cliente || c.Razon_social || c.cliente || "";
                const code = c.codeCT || c.numeroorden || "";
                return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
              }).map((c) => {
                const name = c.nombre_cliente || c.Razon_social || c.cliente || "";
                const code = c.codeCT || c.numeroorden || "";
                const fecha = c.fecha_creacion || c.fecha || c.Fecha || "";
                return (
                <button key={c.id} type="button" onClick={() => loadFromCotizacion(c)} className="w-full text-left flex items-center justify-between gap-3 px-3 py-3 mb-2 rounded-lg border border-[var(--line-soft)] hover:bg-[var(--surface-2)]">
                  <div>
                    <div className="font-medium text-[var(--text)]">{code} · {name}</div>
                    <div className="text-xs text-[var(--muted)]">{fecha}</div>
                  </div>
                </button>
              );})}
              {cotizaciones.filter((c) => {
                const q = cotFilter.trim().toLowerCase();
                const name = c.nombre_cliente || c.Razon_social || c.cliente || "";
                const code = c.codeCT || c.numeroorden || "";
                return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
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
