import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Wrench, Package } from "lucide-react";
import { doc, getDoc, getDocs, collection, where } from "firebase/firestore";
import { db as fbDb } from "../../../lib/firebase";
import Btn from "../../../components/ui/Btn";
import Field, { inputCls } from "../../../components/ui/Field";
import { useFirestoreCollection } from "../../../store/firestoreDb";
import { searchArticles, firestoreSaveDocument, getOTFacturaItems, precioDeArticulo } from "../../../store/firestoreStock";
import { useCatalog } from "../../../store/useCatalog";
import { EMPLOYEE_ROLES } from "../../../lib/roles";
import { getSession } from "../../../store/auth";

// Estados reales del ciclo del taller, los mismos que usa la app móvil y que están en
// Firestore. El editor ofrecía "Listo para entrega" y "Entregado", que no existen en
// ningún documento, y NO ofrecía "Finalizado", que es el estado más común (20 de 48
// recepciones). Elegir uno inexistente dejaba la orden fuera de todos los filtros.
const ESTADOS = ["Recepción", "Diagnóstico", "Cotización", "Reparación",
  "Listo para entrega", "Finalizado"];

// Transiciones permitidas. Antes se podía saltar de "Recepción" a "Finalizado" sin pasar
// por diagnóstico ni reparación, y quedaba una orden facturable sin trabajo registrado.
// Se puede retroceder un paso (corregir un cambio equivocado) y anular desde cualquiera.
//
// «Listo para entrega» se añadió porque el taller no podía cerrar su propia orden:
// `Finalizado` solo lo escribía el CLIENTE al contestar la encuesta de satisfacción, así que
// una orden acabada cuyo cliente no responde se quedaba en «Reparación» para siempre. Con
// este estado el taller marca que el coche está terminado —lo hace la app al pulsar «Está
// listo para entregar»— y lo que falta es entregarlo y cobrarlo.
//
// Se deja «Reparación» → «Finalizado» directo a propósito: facturar una orden ya la cierra
// (marcarRecepcionFacturada) y no tiene por qué obligar a pasar por el estado intermedio.
const TRANSICIONES = {
  "Recepción": ["Diagnóstico", "Anulado"],
  "Diagnóstico": ["Cotización", "Recepción", "Anulado"],
  "Cotización": ["Reparación", "Diagnóstico", "Anulado"],
  "Reparación": ["Listo para entrega", "Finalizado", "Cotización", "Anulado"],
  "Listo para entrega": ["Finalizado", "Reparación", "Anulado"],
  "Finalizado": ["Listo para entrega", "Reparación"],
  "Anulado": [],
};

export function transicionPermitida(desde, hasta) {
  if (!desde || desde === hasta) return true;
  return (TRANSICIONES[desde] || []).includes(hasta);
}

export function estadosDisponibles(estadoActual) {
  if (!estadoActual) return ESTADOS;
  const permitidos = [estadoActual, ...(TRANSICIONES[estadoActual] || [])];
  return ESTADOS.filter((e) => permitidos.includes(e));
}

// `fecha_creacion` llega como Timestamp de Firestore en las recepciones que crea la app
// móvil y como texto en las que creaba el admin. El <input type="date"> necesita YYYY-MM-DD.
function fechaAInput(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  if (typeof valor.toDate === "function") return valor.toDate().toISOString().slice(0, 10);
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000).toISOString().slice(0, 10);
  return "";
}

export default function OrdenTrabajoEditor({ backPath, mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const clientesOpts = useFirestoreCollection("users", [where("user_role", "==", "Cliente")]).map((d) => ({
    id: d.id,
    nombre: d.display_name || d.nombre || "",
    documento: d.IdentityDocument || d.documento || "",
    // El correo y el teléfono se arrastran desde la ficha del cliente. Sin ellos, la orden
    // creada desde el panel queda sin forma de avisar a nadie: el enlace de aprobación del
    // micrositio se envía por correo, y el aviso de «listo para entrega», por WhatsApp.
    correo: d.email || "",
    telefono: d.phone_number || d.wsp || "",
  }));
  const allVehicles = useFirestoreCollection("Vehiculos");
  const [docId, setDocId] = useState(id && id !== "nuevo" ? id : null);

  const [form, setForm] = useState({
    numeroorden: "", cliente: "", clienteDoc: "", placa: "", marca: "", modelo: "",
    km_ingreso: "", tecnico_servicio: "", tipoServicio: "", motivo_ingreso: "", observaciones: "",
    correo: "", telefono: "",
    estado: "Recepción", fecha_creacion: new Date().toISOString().split("T")[0],
  });
  const [diagnosticos, setDiagnosticos] = useState([]);
  // Estado con el que se abrió la orden: es el que decide a dónde puede moverse.
  const [estadoOriginal, setEstadoOriginal] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const vehMarcaOpts = useCatalog("cat-vehmarca");
  const vehModeloOpts = useCatalog("cat-vehmodelo");
  const filteredModelos = useMemo(() => {
    if (!form.marca) return [];
    return vehModeloOpts.filter((m) => {
      const marca = m.seed ? m.marca : m.raw?.marca;
      return marca === form.marca;
    });
  }, [form.marca, vehModeloOpts]);
  // El desplegable de técnico salía SIEMPRE con una única opción, «Sin asignar»: leía el
  // catálogo `cat-encargado`, que está vacío (0 documentos). Es decir, desde el panel no se
  // podía asignar el trabajo a nadie, que es el paso 07 del flujo del taller.
  //
  // Los 48 valores de `tecnico_servicio` que hay en la base los escribió la app móvil, que
  // los saca de `users` descartando a los clientes. El panel hace ahora lo mismo, para que
  // las dos aplicaciones ofrezcan la misma lista de personas.
  const personal = useFirestoreCollection("users", [where("user_role", "in", EMPLOYEE_ROLES)]);
  const encargadoOpts = useMemo(
    () => personal
      .map((u) => ({ id: u.id, name: u.display_name || u.nombre || u.email || "" }))
      .filter((u) => u.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [personal]
  );

  // Una Orden de Trabajo vive en `recepciones` — la misma colección que usa la app móvil.
  // La lectura acepta tanto los nombres del esquema Flutter (nombre_cliente, status,
  // tipo_servicio) como los que escribía antes el admin, para no perder documentos viejos.
  useEffect(() => {
    if (!id || id === "nuevo" || !isEdit) return;
    (async () => {
      try {
        const snap = await getDoc(doc(fbDb, "recepciones", id));
        if (!snap.exists()) {
          setError("No se encontró esta orden de trabajo.");
          return;
        }
        const data = snap.data();
        setDocId(id);
        setEstadoOriginal(data.status || data.estado || "Recepción");
        setForm((prev) => ({
          ...prev,
          numeroorden: data.numeroorden ?? data.codeCT ?? "",
          cliente: data.nombre_cliente || data.Razon_social || data.cliente || "",
          clienteDoc: data.RUCempresa || data.DNI || data.clienteDoc || "",
          placa: data.placa || "",
          marca: data.marca || "",
          modelo: data.modelo || "",
          km_ingreso: data.km_ingreso || data.kilometraje || "",
          tecnico_servicio: data.tecnico_servicio ?? data.tecnico ?? "",
          tipoServicio: data.tipo_servicio ?? data.tipoServicio ?? "",
          motivo_ingreso: data.motivo_ingreso || "",
          observaciones: data.Observaciones_adicionales ?? data.observaciones ?? "",
          estado: data.status || data.estado || "Recepción",
          facturado: data.facturado === true,
          fecha_creacion: fechaAInput(data.fecha_creacion) || prev.fecha_creacion,
        }));

        // Los diagnósticos de una orden creada en la app viven en la subcolección.
        // Antes solo se leía el array embebido, así que al abrirla desde el admin
        // aparecía vacía y al guardar se pisaba el trabajo del técnico.
        const embebidos = Array.isArray(data.diagnosticos) ? data.diagnosticos : [];
        const sub = await getDocs(collection(fbDb, "recepciones", id, "diagnosticos"));
        const deSubcoleccion = sub.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            nombreFalla: x.nombreFalla ?? x.Nombre_falla ?? "",
            solucion: x.solucion ?? x.Solucion ?? "",
            horasTrabajo: Number(x.horasTrabajo ?? x.Horas_trabajo) || 1,
            manoDeObra: Number(x.manoDeObra ?? x.Mano_de_obra ?? x.precioservicio) || 0,
            repuestos: (x.repuestos ?? x.Repuestos ?? []).map((r) => ({
              descripcion: r.descripcion ?? r.nombre ?? "",
              codigo: r.codigo ?? "",
              articleId: r.articleId ?? "",
              cantidad: Number(r.cantidad ?? r.cant) || 1,
              precio: Number(r.precio ?? r.pu) || 0,
            })),
          };
        });
        const fuente = deSubcoleccion.length > 0 ? deSubcoleccion : embebidos;

        // Los repuestos que vienen sin precio se completan desde el maestro de artículos.
        // Es lo que salva a las órdenes ya guardadas: ninguna de las que existen tiene
        // precio en sus repuestos, y sin esto seguirían facturándose a cero cada vez que
        // alguien las reabriera.
        const conPrecio = await Promise.all(
          fuente.map(async (d) => ({
            ...d,
            repuestos: await Promise.all(
              (d.repuestos || []).map(async (r) => {
                if (Number(r.precio) > 0) return { ...r, total: round2(Number(r.precio) * (Number(r.cantidad) || 0)) };
                const precio = await precioDeArticulo({ articleId: r.articleId, codigo: r.codigo });
                return { ...r, precio, total: round2(precio * (Number(r.cantidad) || 0)) };
              })
            ),
          }))
        );
        setDiagnosticos(conPrecio);
      } catch (e) {
        console.error("No se pudo cargar la orden de trabajo:", e);
        setError("No se pudo cargar la orden de trabajo.");
      }
    })();
  }, [id, isEdit]);

  // El taller trabaja la orden; no reescribe el expediente.
  //
  // Los datos de quién es el cliente y cuál es el vehículo los fija quien recepciona. Un
  // técnico entra a registrar el diagnóstico y avanzar el estado, así que esos campos le
  // salen bloqueados. Las reglas de Firestore lo impiden igualmente —esto es solo para que
  // no descubra el límite chocándose con un error al guardar—.
  const soloTaller = ["Tecnico Mecanico", "Jefe de Taller"].includes(getSession()?.userRole || "");
  const bloqueado = soloTaller && isEdit;

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
      // El PRECIO es lo que faltaba. Sin él, el repuesto viajaba a cero por todas partes:
      //   · el cliente veía «Precio: S/ 0.00» en el micrositio y aprobaba una cotización de
      //     S/ 0.00 con la mano de obra a la vista justo encima,
      //   · y `getOTFacturaItems` facturaba ese repuesto también a cero.
      // Se guarda además `nombre` junto a `descripcion` porque el micrositio lee `nombre`.
      const precio = Number(found?.Precio_Venta_Sale_price) || 0;
      const rep = found
        ? {
            descripcion: found.Nombre_name,
            nombre: found.Nombre_name,
            codigo: found.Codigo,
            articleId: found.id,
            cantidad: 1,
            precio,
            total: precio,
          }
        : { descripcion: raw, nombre: raw, codigo: "", articleId: "", cantidad: 1, precio: 0, total: 0 };
      return { ...d, repuestos: [...d.repuestos, rep] };
    }));
    return "";
  };

  const updateRepuesto = (i, ri, field, value) => setDiagnosticos((prev) => prev.map((d, idx) => idx === i ? {
    ...d,
    repuestos: d.repuestos.map((r, j) => {
      if (j !== ri) return r;
      const actualizado = { ...r, [field]: value };
      // El total de la línea se recalcula al cambiar cantidad o precio; si no, quedaba
      // congelado con el valor de una unidad.
      if (field === "cantidad" || field === "precio") {
        actualizado.total = Math.round(((Number(actualizado.precio) || 0) * (Number(actualizado.cantidad) || 0)) * 100) / 100;
      }
      if (field === "descripcion") actualizado.nombre = value;
      return actualizado;
    }),
  } : d));
  const removeRepuesto = (i, ri) => setDiagnosticos((prev) => prev.map((d, idx) => idx === i ? { ...d, repuestos: d.repuestos.filter((_, j) => j !== ri) } : d));

  const generarFactura = async () => {
    const items = await getOTFacturaItems({ ...form, id: docId, diagnosticos });
    if (items.length === 0) {
      setError("Esta orden no tiene diagnósticos con importe: agrega mano de obra o repuestos antes de facturar.");
      return;
    }
    // A quién se le emite qué: con RUC, factura; con DNI, boleta. Antes iba siempre a
    // factura, así que una orden de un cliente con DNI —la mayoría en un taller— acababa
    // en un comprobante que SUNAT no admite para ese documento.
    const esRuc = String(form.clienteDoc || "").replace(/\D/g, "").length === 11;
    const destino = esRuc ? "/vs-factura/nuevo" : "/vs-boleta/nuevo";

    navigate(destino, { state: { fromOT: docId, cliente: form.cliente, clienteDoc: form.clienteDoc, placa: form.placa, marca: form.marca, modelo: form.modelo, kilometraje: form.km_ingreso, items } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente) { setError("Seleccione un cliente"); return; }
    if (!transicionPermitida(estadoOriginal, form.estado)) {
      setError(`No se puede pasar de "${estadoOriginal}" a "${form.estado}": el vehículo tiene que recorrer el ciclo del taller.`);
      return;
    }
    if ((form.estado === "Cotización" || form.estado === "Listo para entrega" || form.estado === "Entregado") && (!form.cliente || !form.clienteDoc)) {
      setError("Faltan los datos del cliente — no se puede avanzar sin nombre y documento completos");
      return;
    }
    setError("");
    setSaving(true);
    // `numeroorden` lo asigna firestoreSaveDocument con el correlativo atómico de LastCode
    // si viene vacío. `facturado` NO se toca aquí: lo gobierna la emisión de la factura —
    // antes se forzaba a false en cada guardado y se perdía el marcado.
    const ordenTrabajo = { ...form, diagnosticos };

    // `tecnicoservicioRef` estaba declarado en el esquema y jamás se escribió: 0 de 48
    // recepciones lo tienen. Sin la referencia no se puede filtrar «mis órdenes» por
    // técnico, que es lo que necesita el paso 08 del flujo. El nombre en texto se sigue
    // guardando porque es lo que leen las pantallas actuales y la app móvil.
    const tecnicoSel = encargadoOpts.find((p) => p.name === form.tecnico_servicio);
    if (tecnicoSel) ordenTrabajo.tecnicoservicioRef = doc(fbDb, "users", tecnicoSel.id);

    if (docId) ordenTrabajo.id = docId;
    try {
      await firestoreSaveDocument("vs-orden", ordenTrabajo);
      navigate(backPath);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la orden: " + (err?.message || "error desconocido"));
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
      {isEdit && (form.estado === "Cotización" || form.estado === "Listo para entrega" || form.estado === "Entregado") && (!form.cliente || !form.clienteDoc) && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-dim)] px-4 py-3 text-sm text-[var(--danger)]">
          ⚠ Faltan los datos del cliente — complete nombre y documento antes de aprobar
        </div>
      )}

      <form onSubmit={handleSubmit}>

      <div className="bg-[var(--panel)] rounded-lg p-6 border border-[var(--line-soft)] mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 uppercase tracking-wide">Recepción de vehículo</h2>
        {bloqueado && (
          <p className="text-xs text-[var(--muted)] mb-4">
            Los datos del cliente y del vehículo los fija recepción. Desde el taller se registra el diagnóstico y se avanza el estado.
          </p>
        )}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Cliente">
            <select className={inputMono} disabled={bloqueado} value={form.cliente} onChange={(e) => { const c = clientesOpts.find((x) => x.nombre === e.target.value); set("cliente", e.target.value); if (c) { set("clienteDoc", c.documento); set("correo", c.correo); set("telefono", c.telefono); } }}>
              <option value="">Selecciona cliente</option>
              {clientesOpts.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Documento"><input className={inputMono} value={form.clienteDoc} readOnly /></Field>
          <Field label="Placa">
            <select className={inputMono} disabled={bloqueado} value={form.placa} onChange={(e) => { const v = allVehicles.find((x) => x.Placa === e.target.value); set("placa", e.target.value); if (v) { set("marca", v.Marca || ""); set("modelo", v.Modelo || ""); } }}>
              <option value="">Selecciona</option>
              {allVehicles.filter((v) => v.Propietario_name === form.cliente).map((v) => <option key={v.id} value={v.Placa}>{v.Placa} - {v.Marca} {v.Modelo}</option>)}
            </select>
          </Field>
          <Field label="Marca">
            <select className={inputMono} disabled={bloqueado} value={form.marca} onChange={(e) => set("marca", e.target.value)}>
              <option value="">Selecciona</option>
              {vehMarcaOpts.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Modelo">
            <select className={inputMono} disabled={bloqueado} value={form.modelo} onChange={(e) => set("modelo", e.target.value)}>
              <option value="">Selecciona</option>
              {filteredModelos.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="KM ingreso"><input type="number" className={inputMono} readOnly={bloqueado} value={form.km_ingreso} onChange={(e) => set("km_ingreso", e.target.value)} /></Field>
          <Field label="Técnico asignado">
            <select className={inputMono} disabled={soloTaller && getSession()?.userRole === "Tecnico Mecanico"} value={form.tecnico_servicio} onChange={(e) => set("tecnico_servicio", e.target.value)}>
              <option value="">Sin asignar</option>
              {encargadoOpts.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo de servicio"><input className={inputMono} value={form.tipoServicio} onChange={(e) => set("tipoServicio", e.target.value)} /></Field>
          <Field label="Estado">
            <select className={inputMono} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {estadosDisponibles(estadoOriginal).map((s) => <option key={s} value={s}>{s}</option>)}
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
