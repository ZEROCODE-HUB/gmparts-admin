import React, { useState, useMemo } from "react";
import {
  Home, Users, Truck, ShoppingCart, Package, Calculator, BarChart3,
  LogOut, Settings, ChevronDown, ChevronRight, Search, Plus, Download,
  Pencil, Trash2, Eye, X, Wrench, ShoppingBag, FileText, Gauge,
  Building2, ClipboardList, CircleDot, ArrowUpRight, ArrowDownRight
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  FUENTES + TOKENS DE DISEÑO                                         */
/* ------------------------------------------------------------------ */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    .gmp-root{ --bg:#0C0C0F; --surface:#18181C; --surface-2:#202024; --surface-3:#28282D;
      --panel:var(--surface); --panel-2:var(--surface-2);
      --line:#28282E; --line-soft:#1E1E22;
      --text:#ECECF2; --muted:#9696A0; --muted-2:#5E5E68;
      --accent:#E84A3F; --accent-dim:#2E1512; --accent-border:#50201A;
      --amber:#EDB94E; --amber-dim:#322612; --amber-border:#4A3A18;
      --info:#5DB8D4; --info-dim:#142A30; --info-border:#1C3840;
      --danger:#ED5E5E; --danger-dim:#321616; --danger-border:#4E2020;
      --success:#52B870; --success-dim:#122A18; --success-border:#1C3822;
      font-family:'Inter',sans-serif; font-weight:450;
      background:var(--bg); color:var(--text); }
    .gmp-root ::selection{ background:var(--accent); color:#F5F0F0; }
    .gmp-display{ font-family:'Space Grotesk',sans-serif; }
    .gmp-mono{ font-family:'JetBrains Mono',monospace; }
    .gmp-scroll::-webkit-scrollbar{ width:8px; height:8px; }
    .gmp-scroll::-webkit-scrollbar-thumb{ background:#333; border-radius:4px; }
    .gmp-scroll::-webkit-scrollbar-track{ background:transparent; }
    .gmp-row:hover{ background:var(--surface-2); }
    .gmp-fade-in{ animation:gmpFade .12s ease-out; }
    @keyframes gmpFade{ from{ opacity:0; transform:translateY(3px);} to{opacity:1; transform:translateY(0);} }
    .gmp-focus:focus{ outline:2px solid var(--accent); outline-offset:1px; }
  `}</style>
);

/* ------------------------------------------------------------------ */
/*  DATOS SIMULADOS                                                     */
/* ------------------------------------------------------------------ */
const clientsSeed = [
  { id:1, codigo:"C-0001", ruc:"12345678", nombre:"Jose Quiñonez", dir:"Av. Nicolás Ayllón 12345", correo:"josequi@gmail.com", cel:"123456789", distrito:"Ate" },
  { id:2, codigo:"C-0002", ruc:"98765432", nombre:"Luis Ramirez", dir:"Sin dirección", correo:"luisramirez@gmail.com", cel:"—", distrito:"—" },
  { id:3, codigo:"C-0003", ruc:"34344343", nombre:"Pedro Lopez", dir:"Calle 2", correo:"pedro@gmail.com", cel:"778787878", distrito:"Independencia" },
  { id:4, codigo:"C-0004", ruc:"20601720621", nombre:"Gear Motor Parts SAC", dir:"—", correo:"gear@gmail.com", cel:"—", distrito:"—" },
  { id:5, codigo:"C-0005", ruc:"20601526398", nombre:"Autovip SAC", dir:"—", correo:"autovip@gmail.com", cel:"—", distrito:"—" },
  { id:6, codigo:"C-0006", ruc:"123646897", nombre:"Cliente Natural", dir:"Sin dirección", correo:"cliente029021919@gmail.com", cel:"—", distrito:"—" },
];

const providersSeed = [
  { id:1, ruc:"123456", nombre:"Repuestos Japoneses", dir:"Av. Nicolas Ayllón 2989", correo:"reja@gmail.com", cel:"99999999", cat:"REPUESTOS" },
  { id:2, ruc:"978789789", nombre:"Carlos Rojas", dir:"123", correo:"carlosm123de@gmail.com", cel:"789789789", cat:"FAROS" },
  { id:3, ruc:"111111111", nombre:"Empresa Electrónica y Lupe", dir:"Av. Ayacucho e/ Tamborán", correo:"electro@gmail.com", cel:"66778899", cat:"ELECTRICIDAD" },
];

const personalSeed = [
  { id:1, nombre:"Mecanico", ruc:"—", correo:"mecanicotest@gmail.com", cel:"—", cargo:"Mecánico" },
  { id:2, nombre:"John Doe", ruc:"9494818122", correo:"johndow@example.com", cel:"71716060", cargo:"Técnico" },
  { id:3, nombre:"Armando Terrazas", ruc:"22344121", correo:"armando@gmail.com", cel:"54455467", cargo:"Asesor de servicio" },
  { id:4, nombre:"GM Parts Admin", ruc:"—", correo:"admin@gmparts.com", cel:"—", cargo:"Administrador" },
];

const vehiclesSeed = [
  { id:1, prop:"PIL S.A.", placa:"123ABV", marca:"Toyota", modelo:"Corolla 98", motor:"—", anio:1998 },
  { id:2, prop:"Gear Motor Parts SAC", placa:"D0N250", marca:"Mitsubishi", modelo:"Lancer", motor:"—", anio:2010 },
  { id:3, prop:"Jorge Zapata", placa:"B1D123", marca:"Chevrolet", modelo:"Sail", motor:"—", anio:2015 },
  { id:4, prop:"Luis Ramirez", placa:"W4T250", marca:"Renault", modelo:"Kangoo", motor:"—", anio:2018 },
  { id:5, prop:"Electricim", placa:"MNP456", marca:"Chevrolet", modelo:"Colorado", motor:"—", anio:2019 },
];

const warehousesSeed = [
  { id:1, nombre:"Almacén A", ciudad:"Lima", dir:"Jr. Las Turquesas 500" },
  { id:2, nombre:"Almacén B", ciudad:"Arequipa", dir:"Av. Ejército 220" },
];

const articlesSeed = [
  { id:1, codigo:"LUB-00234", nombre:"Aceite 10W30 Semi Sintético", stock:187, marca:"Valvoline", cat:"Lubricantes", unidad:"25", pc:30, pv:33 },
  { id:2, codigo:"REP-02791", nombre:"Radiador Nissan Almera AT", stock:553, marca:"Nagoya", cat:"Repuestos", unidad:"UND", pc:220, pv:550 },
  { id:3, codigo:"REP-00068", nombre:"Amortiguador KYB", stock:0, marca:"Sin marca", cat:"Suspensión", unidad:"UND", pc:83, pv:0 },
  { id:4, codigo:"ELE-00005", nombre:"Relay de 4 pines 12V 75A", stock:0, marca:"Marilia", cat:"Electricidad", unidad:"UND", pc:0, pv:16 },
  { id:5, codigo:"REP-033643", nombre:"Retén 20x26x4", stock:0, marca:"Sin marca", cat:"Repuestos", unidad:"UND", pc:10, pv:0 },
];

const serviceCatalogSeed = [
  { id:1, codigo:"00001", alerta:"—", desc:"Reemplazar amortiguadores delanteros", moneda:"SOLES", precio:140 },
  { id:2, codigo:"SERV", alerta:"1 día", desc:"Mantenimiento preventivo de motor", moneda:"SOLES", precio:180 },
  { id:3, codigo:"S002", alerta:"2 días", desc:"Parchado de llantas", moneda:"SOLES", precio:12 },
];

const kardexSeed = [
  { id:1, codigo:"test", desc:"testing0111", doc:"Salida de inventario", num:1, tipo:"SVE", fecha:"29/10/2025" },
  { id:2, codigo:"test", desc:"testing0111", doc:"Ingreso de inventario", num:1, tipo:"IVE", fecha:"28/10/2025" },
  { id:3, codigo:"test22", desc:"test22", doc:"Ingreso de inventario", num:1, tipo:"IVE", fecha:"28/10/2025" },
];

const partners = { cliente: clientsSeed, proveedor: providersSeed };

const docSeeds = {
  "c-factura": [{ id:1, razon:"1DHQGi41OcHujqgmV2uk", serie:"997", fecha:"21/11/2025", total:40.8, fpago:"Contado", usuario:"Jose", estado:"Creado" }],
  "c-boleta": [{ id:1, razon:"1DHQGi41OcHujqgmV2uk", serie:"f978", fecha:"21/11/2025", total:81.6, fpago:"Contado", usuario:"Jose", estado:"Creado" }],
  "c-notas": [{ id:1, razon:"1DHQGi41OcHujqgmV2uk", serie:"999", fecha:"21/11/2025", total:151.5, fpago:"Contado", usuario:"Jose", estado:"Creado" }],
  "c-guia": [],
  "c-orden": [],
  "va-cotizacion": [{ id:1, razon:"Jorge Zapata", serie:"90909", fecha:"24/10/2025", total:30, fpago:"Contado", usuario:"Jose", estado:"Pendiente" }],
  "va-boleta": [{ id:1, razon:"Autovip SAC", serie:"B702", fecha:"2/1/2026", total:550, fpago:"Contado", usuario:"Jose", estado:"Emitido" }],
  "va-factura": [{ id:1, razon:"Gear Motor Parts SAC", serie:"F702", fecha:"2/1/2026", total:550, fpago:"Contado", usuario:"Jose", estado:"Emitido" }],
  "va-guia": [],
  "va-notacredito": [{ id:1, razon:"Soluciones Wave Logistic LLC", serie:"00000340", fecha:"14/03/2020", total:160, ref:"F:001-2124", estado:"Creado" }],
};

const serviceQuotesSeed = [
  { id:1, doc:"CT001-0000200", fecha:"10/12/2025", cliente:"Gear Motor Parts SAC", total:2696.96, placa:"D0N250", modelo:"Lancer", marca:"Mitsubishi", estado:"Reparación" },
  { id:2, doc:"CT001-0000198", fecha:"9/12/2025", cliente:"Gear Motor Parts SAC", total:1326.32, placa:"D0N250", modelo:"Lancer", marca:"Mitsubishi", estado:"Recepción" },
  { id:3, doc:"CT001-0000196", fecha:"25/11/2025", cliente:"Jorge Zapata", total:361.87, placa:"B1D123", modelo:"Sail", marca:"Chevrolet", estado:"Recepción" },
  { id:4, doc:"CT001-0000190", fecha:"24/10/2025", cliente:"Cliente Natural", total:888.93, placa:"123SCA", modelo:"X4 Pro", marca:"Toyota", estado:"Recepción" },
];

const workOrdersSeed = [
  { id:1, doc:"CT001-0000200", fecha:"10/12/2025", cliente:"Gear Motor Parts SAC", total:2697, placa:"D0N250", ref:"000", estado:"Reparación" },
  { id:2, doc:"CT001-0000173", fecha:"24/9/2025", cliente:"Luis Ramirez", total:499, placa:"W4T250", ref:"Solicitud por WhatsApp", estado:"Reparación" },
];

const cobranzaSeed = {
  cobrar: [
    { id:1, doc:"Cotización", num:"—", razon:"—", total:0, pago:0, estado:"Pendiente", fecha:"27/10/2025" },
    { id:2, doc:"Boleta", num:"001", razon:"PIL S.A.", total:393.33, pago:0, estado:"Pendiente", fecha:"24/10/2025" },
    { id:3, doc:"Factura", num:"001", razon:"Gear Motor Parts SAC", total:560, pago:150, estado:"Pendiente", fecha:"24/9/2025" },
  ],
  pagar: [
    { id:1, doc:"Factura", num:"—", razon:"1DHQGi41OcHujqgmV2uk", total:40.8, pago:0, estado:"Pendiente", fecha:"29/10/2025" },
    { id:2, doc:"Factura", num:"—", razon:"a8Rgj7VKmJl1qjTuCrgq", total:2200, pago:2200, estado:"Pagado", fecha:"24/9/2025" },
  ],
};

/* ------------------------------------------------------------------ */
/*  NAVEGACIÓN                                                          */
/* ------------------------------------------------------------------ */
const NAV = [
  { key:"dashboard", label:"Dashboard", icon:Home },
  { key:"administracion", label:"Administración", icon:Building2, children:[
    { key:"clientes", label:"Gestión Clientes" },
    { key:"proveedores", label:"Gestión Proveedores" },
    { key:"personal", label:"Gestión Personal" },
  ]},
  { key:"vartic", label:"Ventas artículos", icon:ShoppingBag, children:[
    { key:"va-cotizacion", label:"Cotizaciones" },
    { key:"va-factura", label:"Emisión de factura" },
    { key:"va-boleta", label:"Emisión de boleta" },
    { key:"va-guia", label:"Emisión guía remisión" },
    { key:"va-notacredito", label:"Nota crédito" },
  ]},
  { key:"vserv", label:"Ventas Servicio", icon:Wrench, children:[
    { key:"vs-cotizacion", label:"Cotización de Servicio" },
    { key:"vs-orden", label:"Orden de Trabajo" },
    { key:"vs-factura", label:"Emisión de Facturas" },
    { key:"vs-boleta", label:"Emisión de Boletas" },
    { key:"vs-notas", label:"Registros Notas de Venta" },
  ]},
  { key:"compras", label:"Compras", icon:ShoppingCart, children:[
    { key:"c-factura", label:"Factura" },
    { key:"c-boleta", label:"Boleta" },
    { key:"c-notas", label:"Notas compra" },
    { key:"c-guia", label:"Guía de remisión" },
    { key:"c-orden", label:"Orden de compra" },
  ]},
  { key:"almacen", label:"Almacén", icon:Package, children:[
    { key:"al-articulos", label:"Maestro de artículos" },
    { key:"al-almacenes", label:"Almacenes" },
    { key:"al-movimientos", label:"Movimientos de Almacén" },
    { key:"al-kardex", label:"Kárdex de Almacén" },
    { key:"al-vehiculos", label:"Gestión de vehículos" },
    { key:"al-servicios", label:"Gestión de Servicio" },
  ]},
  { key:"cobranza", label:"Cobranza", icon:Calculator, children:[
    { key:"cb-cobrar", label:"Cuentas por cobrar" },
    { key:"cb-pagar", label:"Cuentas por pagar" },
  ]},
  { key:"reportes", label:"Reportes", icon:BarChart3, children:[
    { key:"rp-ventas", label:"Reportes de Ventas" },
    { key:"rp-doc", label:"Reporte Doc. Electrónica" },
  ]},
];

const TITLES = {
  clientes:"Registro de clientes", proveedores:"Registro de proveedores", personal:"Registro de personal",
  "va-cotizacion":"Venta · Cotización", "va-factura":"Venta · Factura", "va-boleta":"Venta · Boleta",
  "va-guia":"Venta · Guía de remisión", "va-notacredito":"Venta · Nota de crédito",
  "vs-cotizacion":"Cotización de servicios", "vs-orden":"Orden de trabajo",
  "vs-factura":"Servicio · Emisión de facturas", "vs-boleta":"Servicio · Emisión de boletas",
  "vs-notas":"Registro de notas de venta",
  "c-factura":"Compra · Factura", "c-boleta":"Compra · Boleta", "c-notas":"Compra · Nota de pedido",
  "c-guia":"Compra · Guía de remisión", "c-orden":"Compra · Orden de compra",
  "al-articulos":"Maestro de artículos", "al-almacenes":"Gestión de almacenes",
  "al-movimientos":"Movimientos de almacén", "al-kardex":"Kárdex de almacén",
  "al-vehiculos":"Gestión de vehículos", "al-servicios":"Catálogo de servicios",
  "cb-cobrar":"Cuentas por cobrar", "cb-pagar":"Cuentas por pagar",
  "rp-ventas":"Reporte de ventas", "rp-doc":"Reporte de documentos electrónicos",
};

/* ------------------------------------------------------------------ */
/*  PRIMITIVOS UI                                                       */
/* ------------------------------------------------------------------ */
function Badge({ tone="neutral", children }) {
  const tones = {
    neutral:"bg-[var(--surface-2)] text-[var(--muted)] border-[var(--line)]",
    accent:"bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]",
    info:"bg-[var(--info-dim)] text-[var(--info)] border-[var(--info-border)]",
    amber:"bg-[var(--amber-dim)] text-[var(--amber)] border-[var(--amber-border)]",
    danger:"bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger-border)]",
    success:"bg-[var(--success-dim)] text-[var(--success)] border-[var(--success-border)]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function estadoTone(estado) {
  if (estado === "Pagado") return "success";
  if (["Emitido","Reparación","Creado"].includes(estado)) return "info";
  if (["Pendiente","Recepción"].includes(estado)) return "amber";
  if (["Vencido","Anulado"].includes(estado)) return "danger";
  return "neutral";
}

function IconBtn({ icon:Icon, tone="muted", onClick, title }) {
  const tones = { muted:"text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
    danger:"text-[var(--danger)] hover:bg-[var(--danger-dim)]",
    accent:"text-[var(--accent)] hover:bg-[var(--accent-dim)]" };
  return (
    <button title={title} onClick={onClick} className={`p-1.5 rounded-md transition-colors ${tones[tone]}`}>
      <Icon size={15} />
    </button>
  );
}

function Btn({ children, variant="primary", icon:Icon, onClick, type="button", className="" }) {
  const base = "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all gmp-focus";
  const variants = {
    primary:"bg-[var(--accent)] text-[#F5EFEF] hover:bg-[#D94038] border border-[var(--accent)]",
    ghost:"border border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-2)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]",
    danger:"border border-[var(--danger-border)] text-[var(--danger)] hover:bg-[var(--danger-dim)]",
    subtle:"text-[var(--muted)] hover:text-[var(--text)]",
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}

function Field({ label, children, span }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span ? "col-span-2" : ""}`}>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] gmp-focus w-full";

function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto gmp-scroll bg-[var(--bg)] p-6">
      <div className={`gmp-fade-in bg-[var(--surface-3)] rounded-lg w-full ${wide ? "max-w-4xl" : "max-w-lg"} mt-8 border border-[var(--line-soft)]`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line-soft)]">
          <div>
            <h3 className="gmp-display text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Toolbar({ title, count, onNew, onExport, newLabel="Crear nuevo" }) {
  return (
    <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 className="gmp-display text-xl font-bold text-[var(--text)]">{title}</h1>
        {count !== undefined && <p className="text-xs text-[var(--muted)] mt-1">{count} registros</p>}
      </div>
      <div className="flex gap-2">
        {onExport && <Btn variant="ghost" icon={Download} onClick={onExport}>Descargar</Btn>}
        {onNew && <Btn icon={Plus} onClick={onNew}>{newLabel}</Btn>}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder="Buscar nombre, DNI, etc.." }) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className={`${inputCls} pl-9`} />
    </div>
  );
}

function Table({ columns, rows, renderRow, empty="Sin datos" }) {
  return (
    <div className="bg-[var(--panel)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto gmp-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
              {columns.map(c => <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--muted)] text-sm">{empty}</td></tr>
            )}
            {rows.map((r,i) => (
              <tr key={r.id ?? i} className="gmp-row border-t border-[var(--line-soft)]">
                {renderRow(r,i)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const Td = ({children,className=""}) => <td className={`px-4 py-3 align-top text-[var(--text)] ${className}`}>{children}</td>;

/* ------------------------------------------------------------------ */
/*  MÓDULO GENÉRICO: CRUD SIMPLE (clientes/proveedores/personal/almacenes/vehículos/servicios)
/* ------------------------------------------------------------------ */
function useCrud(seed) {
  const [items, setItems] = useState(seed);
  const add = (item) => setItems(prev => [{ ...item, id: Date.now() }, ...prev]);
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));
  return { items, add, remove };
}

function GenericFormModal({ title, fields, onClose, onSave }) {
  const [form, setForm] = useState({});
  const set = (k,v) => setForm(prev => ({ ...prev, [k]:v }));
  return (
    <Modal title={title} subtitle="Los campos se guardan solo en esta sesión de demostración." onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(f => (
          <Field key={f.key} label={f.label} span={f.span}>
            {f.type === "select" ? (
              <select className={inputCls} onChange={e=>set(f.key, e.target.value)} defaultValue="">
                <option value="" disabled>Selecciona</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type||"text"} placeholder="Escribe aquí" className={inputCls}
                onChange={e=>set(f.key, e.target.value)} />
            )}
          </Field>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={()=>{ onSave(form); onClose(); }}>Guardar</Btn>
      </div>
    </Modal>
  );
}

function ClientesView() {
  const { items, add, remove } = useCrud(clientsSeed);
  const [q,setQ] = useState(""); const [open,setOpen] = useState(false);
  const rows = items.filter(c => (c.nombre+c.ruc).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Registro de clientes" count={rows.length} onNew={()=>setOpen(true)} onExport={()=>{}} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Código","RUC/DNI","Razón social","Dirección fiscal","Correo","Celular","Distrito","Acción"]}
        rows={rows} renderRow={c => (<>
          <Td><span className="gmp-mono text-[var(--muted)]">{c.codigo}</span></Td>
          <Td className="gmp-mono">{c.ruc}</Td>
          <Td className="font-medium">{c.nombre}</Td>
          <Td className="text-[var(--muted)]">{c.dir}</Td>
          <Td className="text-[var(--muted)]">{c.correo}</Td>
          <Td className="gmp-mono">{c.cel}</Td>
          <Td className="text-[var(--muted)]">{c.distrito}</Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(c.id)} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo cliente" onClose={()=>setOpen(false)}
        onSave={(f)=>add({ codigo:"C-NEW", ruc:f.ruc||"—", nombre:f.nombre||"Nuevo cliente", dir:f.dir||"Sin dirección", correo:f.correo||"—", cel:f.cel||"—", distrito:f.distrito||"—" })}
        fields={[
          {key:"nombre",label:"Nombre y apellidos"}, {key:"cel",label:"Teléfono"},
          {key:"correo",label:"Correo electrónico"}, {key:"whatsapp",label:"Whatsapp"},
          {key:"tipo",label:"Tipo de cliente",type:"select",options:["Natural","Jurídico"]},
          {key:"encargado",label:"Encargado",type:"select",options:personalSeed.map(p=>p.nombre)},
          {key:"tipoDoc",label:"Tipo de documento",type:"select",options:["DNI","RUC","CE"]},
          {key:"ruc",label:"Documento"},
          {key:"dep",label:"Departamento",type:"select",options:["Lima","Arequipa","Cusco"]},
          {key:"prov",label:"Provincia",type:"select",options:["Lima","Huaraz"]},
          {key:"distrito",label:"Distrito",type:"select",options:["Ate","Independencia","Miraflores"]},
          {key:"dir",label:"Dirección fiscal"},
        ]} />}
    </div>
  );
}

function ProveedoresView() {
  const { items, add, remove } = useCrud(providersSeed);
  const [q,setQ] = useState(""); const [open,setOpen] = useState(false);
  const rows = items.filter(c => (c.nombre+c.ruc).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Registro de proveedores" count={rows.length} onNew={()=>setOpen(true)} onExport={()=>{}} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre" />
      <Table columns={["RUC/DNI","Razón social","Dirección","Correo","Celular","Categoría","Acciones"]}
        rows={rows} renderRow={c=>(<>
          <Td className="gmp-mono">{c.ruc}</Td>
          <Td className="font-medium">{c.nombre}</Td>
          <Td className="text-[var(--muted)]">{c.dir}</Td>
          <Td className="text-[var(--muted)]">{c.correo}</Td>
          <Td className="gmp-mono">{c.cel}</Td>
          <Td><Badge tone="accent">{c.cat}</Badge></Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(c.id)} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo proveedor" onClose={()=>setOpen(false)}
        onSave={f=>add({ ruc:f.ruc||"—", nombre:f.nombre||"Nuevo proveedor", dir:f.dir||"—", correo:f.correo||"—", cel:f.cel||"—", cat:f.cat||"GENERAL" })}
        fields={[
          {key:"nombre",label:"Nombre del representante"}, {key:"cel",label:"Teléfono"},
          {key:"correo",label:"Correo electrónico"}, {key:"whatsapp",label:"Whatsapp"},
          {key:"dni",label:"DNI del representante"}, {key:"ruc",label:"RUC de la empresa"},
          {key:"dep",label:"Departamento",type:"select",options:["Lima","Arequipa"]},
          {key:"prov",label:"Provincia",type:"select",options:["Lima"]},
          {key:"distrito",label:"Distrito",type:"select",options:["Ate","Surco"]},
          {key:"dir",label:"Dirección fiscal"}, {key:"web",label:"Website"},
          {key:"cat",label:"Categoría",type:"select",options:["REPUESTOS","FAROS","SERVICIO","ELECTRICIDAD"]},
        ]} />}
    </div>
  );
}

function PersonalView() {
  const { items, add, remove } = useCrud(personalSeed);
  const [q,setQ] = useState(""); const [open,setOpen] = useState(false);
  const rows = items.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Registro de personal" count={rows.length} onNew={()=>setOpen(true)} />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["RUC/DNI","Razón social","Dirección","Correo","Celular","Cargo","Acción"]}
        rows={rows} renderRow={c=>(<>
          <Td className="gmp-mono">{c.ruc}</Td>
          <Td className="font-medium">{c.nombre}</Td>
          <Td className="text-[var(--muted)]">{c.dir||"—"}</Td>
          <Td className="text-[var(--muted)]">{c.correo}</Td>
          <Td className="gmp-mono">{c.cel}</Td>
          <Td><Badge>{c.cargo}</Badge></Td>
          <Td><div className="flex gap-1"><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(c.id)} /><IconBtn icon={Pencil} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo personal" onClose={()=>setOpen(false)}
        onSave={f=>add({ ruc:f.dni||"—", nombre:f.nombre||"Nuevo colaborador", correo:f.correo||"—", cel:f.cel||"—", cargo:f.cargo||"—" })}
        fields={[
          {key:"nombre",label:"Nombre y apellidos"}, {key:"cel",label:"Teléfono"},
          {key:"correo",label:"Correo electrónico"}, {key:"whatsapp",label:"Whatsapp"},
          {key:"dni",label:"DNI"}, {key:"fnac",label:"Fecha de nacimiento",type:"date"},
          {key:"dep",label:"Departamento",type:"select",options:["Lima"]},
          {key:"prov",label:"Provincia",type:"select",options:["Lima"]},
          {key:"distrito",label:"Distrito",type:"select",options:["Ate"]},
          {key:"dir",label:"Dirección fiscal"},
          {key:"cargo",label:"Cargo",type:"select",options:["Mecánico","Técnico","Asesor de servicio","Administrador"]},
          {key:"pass",label:"Contraseña",type:"password"},
        ]} />}
    </div>
  );
}

function VehiculosView() {
  const { items, remove } = useCrud(vehiclesSeed);
  const [q,setQ] = useState(""); const [open,setOpen] = useState(false);
  const rows = items.filter(v => (v.prop+v.placa).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Gestión de vehículos" count={rows.length} onNew={()=>setOpen(true)} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, DNI, placa" />
      <Table columns={["Propietario","Placa","Marca","Modelo","Año","Editar"]}
        rows={rows} renderRow={v=>(<>
          <Td className="font-medium">{v.prop}</Td>
          <Td className="gmp-mono">{v.placa}</Td>
          <Td>{v.marca}</Td>
          <Td>{v.modelo}</Td>
          <Td className="gmp-mono">{v.anio}</Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(v.id)} /></div></Td>
        </>)} />
      {open && (
        <Modal title="Nuevo vehículo" onClose={()=>setOpen(false)} wide>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de propietario"><select className={inputCls}><option>Cliente</option><option>Proveedor</option></select></Field>
            <Field label="Propietario"><select className={inputCls}><option value="">Selecciona</option>{clientsSeed.map(c=><option key={c.id}>{c.nombre}</option>)}</select></Field>
            <Field label="Placa"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="Marca"><select className={inputCls}><option>Toyota</option><option>Chevrolet</option><option>Mitsubishi</option></select></Field>
            <Field label="Modelo"><select className={inputCls}><option>Corolla</option><option>Sail</option></select></Field>
            <Field label="Año de fabricación"><input className={inputCls} placeholder="Selecciona año" /></Field>
            <Field label="Color"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="VIN Serie"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="Tipo de combustible"><select className={inputCls}><option>Gasolina</option><option>Diésel</option><option>GLP</option></select></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
            <Btn variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Btn>
            <Btn onClick={()=>setOpen(false)}>Guardar vehículo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AlmacenesView() {
  const { items, add, remove } = useCrud(warehousesSeed);
  const [open,setOpen] = useState(false);
  return (
    <div>
      <Toolbar title="Gestión de almacén" count={items.length} onNew={()=>setOpen(true)} />
      <Table columns={["Nombre de almacén","Dirección","Ciudad","Editar"]}
        rows={items} renderRow={a=>(<>
          <Td className="font-medium">{a.nombre}</Td>
          <Td className="text-[var(--muted)]">{a.dir}</Td>
          <Td>{a.ciudad}</Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(a.id)} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo almacén" onClose={()=>setOpen(false)}
        onSave={f=>add({ nombre:f.nombre||"Nuevo almacén", ciudad:f.ciudad||"—", dir:f.dir||"—" })}
        fields={[{key:"nombre",label:"Nombre del almacén",span:true},{key:"ciudad",label:"Ciudad"},{key:"dir",label:"Dirección"}]} />}
    </div>
  );
}

function ServiciosCatalogoView() {
  const { items, add, remove } = useCrud(serviceCatalogSeed);
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const rows = items.filter(s=>s.desc.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Catálogo de servicios" count={rows.length} onNew={()=>setOpen(true)} newLabel="Nuevo servicio" />
      <SearchBox value={q} onChange={setQ} />
      <Table columns={["Código","Alerta","Descripción","Moneda","Precio","Acción"]}
        rows={rows} renderRow={s=>(<>
          <Td className="gmp-mono text-[var(--muted)]">{s.codigo}</Td>
          <Td>{s.alerta}</Td>
          <Td className="font-medium">{s.desc}</Td>
          <Td><Badge>{s.moneda}</Badge></Td>
          <Td className="gmp-mono">S/ {s.precio}</Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(s.id)} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo servicio" onClose={()=>setOpen(false)}
        onSave={f=>add({ codigo:f.codigo||"NEW", alerta:f.alerta||"—", desc:f.desc||"Nuevo servicio", moneda:"SOLES", precio:Number(f.precio)||0 })}
        fields={[
          {key:"codigo",label:"Código"}, {key:"precio",label:"Precio"},
          {key:"desc",label:"Descripción",span:true},
          {key:"alerta",label:"Alerta en días",type:"select",options:["0 días","1 día","2 días","3 días"]},
          {key:"moneda",label:"Moneda",type:"select",options:["SOLES","DÓLARES"]},
          {key:"sistema",label:"Sistema",type:"select",options:["Motor","Suspensión","Frenos"]},
          {key:"tipoServ",label:"Tipo de servicio",type:"select",options:["Preventivo","Correctivo"]},
          {key:"categoriaMtc",label:"Categoría MTC",type:"select",options:["M1","N1"]},
          {key:"tipoVeh",label:"Tipo de vehículo",type:"select",options:["Auto","Camioneta"]},
          {key:"carroceria",label:"Carrocería",type:"select",options:["Sedán","SUV"]},
          {key:"notas",label:"Notas",span:true},
        ]} />}
    </div>
  );
}

function ArticulosView() {
  const { items, add, remove } = useCrud(articlesSeed);
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const rows = items.filter(a=>(a.nombre+a.codigo).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Registro de artículos" count={rows.length} onNew={()=>setOpen(true)} onExport={()=>{}} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar aquí..." />
      <Table columns={["Código","Nombre","Stock","Marca","Categoría","Unidad","P. compra","P. venta","Acción"]}
        rows={rows} renderRow={a=>(<>
          <Td className="gmp-mono text-[var(--muted)]">{a.codigo}</Td>
          <Td className="font-medium">{a.nombre}</Td>
          <Td><Badge tone={a.stock===0?"danger":a.stock<50?"amber":"success"}>{a.stock}</Badge></Td>
          <Td>{a.marca}</Td>
          <Td className="text-[var(--muted)]">{a.cat}</Td>
          <Td>{a.unidad}</Td>
          <Td className="gmp-mono">S/ {a.pc}</Td>
          <Td className="gmp-mono">S/ {a.pv}</Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" onClick={()=>remove(a.id)} /></div></Td>
        </>)} />
      {open && <GenericFormModal title="Nuevo artículo" onClose={()=>setOpen(false)}
        onSave={f=>add({ codigo:f.codigo||"NEW", nombre:f.nombre||"Nuevo artículo", stock:0, marca:f.marca||"Sin marca", cat:f.grupo||"General", unidad:f.unidad||"UND", pc:Number(f.pc)||0, pv:Number(f.pv)||0 })}
        fields={[
          {key:"codigo",label:"Código"}, {key:"nombre",label:"Producto"},
          {key:"oem",label:"OEM"}, {key:"codProv",label:"Código proveedor"},
          {key:"nombreLargo",label:"Nombre"},
          {key:"marca",label:"Marca",type:"select",options:["Valvoline","Nagoya","Marilia","Sin marca"]},
          {key:"unidad",label:"Unidad de medida",type:"select",options:["UND","25"]},
          {key:"grupo",label:"Grupo",type:"select",options:["Lubricantes","Repuestos","Electricidad","Suspensión"]},
          {key:"stockmin",label:"Stock mínimo"},
          {key:"pc",label:"Precio compra"}, {key:"pv",label:"Precio venta"},
        ]} />}
    </div>
  );
}

function KardexView() {
  const [q,setQ]=useState("");
  const rows = kardexSeed.filter(k=>k.desc.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar title="Lista Kardex" count={rows.length} onNew={()=>{}} onExport={()=>{}} newLabel="Crear nuevo" />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar por producto" />
      <Table columns={["Código","Descripción","Documento","N°","Tipo","Fecha"]}
        rows={rows} renderRow={k=>(<>
          <Td className="gmp-mono text-[var(--muted)]">{k.codigo}</Td>
          <Td className="font-medium">{k.desc}</Td>
          <Td>{k.doc}</Td>
          <Td className="gmp-mono">{k.num}</Td>
          <Td><Badge tone={k.tipo==="IVE"?"success":"amber"}>{k.tipo}</Badge></Td>
          <Td className="gmp-mono text-[var(--muted)]">{k.fecha}</Td>
        </>)} />
    </div>
  );
}

function MovimientosView() {
  const rows = [
    { id:1, doc:"Salida de inventario", num:"F702", fecha:"2/1/2026", tipo:"Artículos", almacen:"Almacén A", estado:"Salida de inventario" },
    { id:2, doc:"Salida de inventario", num:"B702", fecha:"26/12/2025", tipo:"Artículos", almacen:"Almacén A", estado:"Salida de inventario" },
    { id:3, doc:"Ingreso de inventario", num:"F703", fecha:"24/12/2025", tipo:"Artículos", almacen:"Almacén A", estado:"Ingreso de inventario" },
  ];
  const [open,setOpen]=useState(false);
  return (
    <div>
      <Toolbar title="Ingreso al almacén" count={rows.length} onNew={()=>setOpen(true)} />
      <Table columns={["Documento","Número","Fecha reg.","Tipo","Almacén","Estado","Evento"]}
        rows={rows} renderRow={m=>(<>
          <Td className="font-medium">{m.doc}</Td>
          <Td className="gmp-mono">{m.num}</Td>
          <Td className="gmp-mono text-[var(--muted)]">{m.fecha}</Td>
          <Td>{m.tipo}</Td>
          <Td>{m.almacen}</Td>
          <Td><Badge tone={m.estado.startsWith("Ingreso")?"success":"info"}>{m.estado}</Badge></Td>
          <Td><div className="flex gap-1"><IconBtn icon={Pencil} /><IconBtn icon={Trash2} tone="danger" /></div></Td>
        </>)} />
      {open && (
        <Modal title="Movimiento de almacén" onClose={()=>setOpen(false)} wide>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de movimiento"><select className={inputCls}><option>Ingreso</option><option>Salida</option></select></Field>
            <Field label="Vendedor"><select className={inputCls}><option value="">Selecciona</option>{personalSeed.map(p=><option key={p.id}>{p.nombre}</option>)}</select></Field>
            <Field label="Doc referencia"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="Fecha de registro"><input type="date" className={inputCls} /></Field>
            <Field label="Almacén"><select className={inputCls}>{warehousesSeed.map(w=><option key={w.id}>{w.nombre}</option>)}</select></Field>
            <Field label="Comentario"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="Código"><input className={inputCls} placeholder="Código" /></Field>
            <Field label="Cantidad"><input className={inputCls} placeholder="Escribe aquí" /></Field>
            <Field label="Precio unitario"><input className={inputCls} placeholder="$0.00" /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
            <Btn variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Btn>
            <Btn onClick={()=>setOpen(false)}>Agregar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DOCUMENTOS DE COMPRA / VENTA DE ARTÍCULOS (genérico y reutilizable) */
/* ------------------------------------------------------------------ */
function ArticlePicker({ onAdd, onClose }) {
  const [q,setQ] = useState("");
  const rows = articlesSeed.filter(a => (a.nombre+a.codigo).toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title="Seleccionar artículos" onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar artículo o código" />
      <div className="max-h-72 overflow-y-auto gmp-scroll flex flex-col gap-1.5">
        {rows.map(a => (
          <button key={a.id} onClick={()=>{ onAdd(a); onClose(); }}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)] text-left">
            <div>
              <p className="text-sm font-medium">{a.nombre}</p>
              <p className="text-[11px] text-[var(--muted)] gmp-mono">{a.codigo} · stock {a.stock}</p>
            </div>
            <span className="gmp-mono text-sm text-[var(--accent)]">S/ {a.pv}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function DocumentEditor({ docLabel, docType, partnerKind, onExit, onSave }) {
  const [partner, setPartner] = useState("");
  const [lines, setLines] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const partnerOptions = partners[partnerKind];

  const addLine = (art) => setLines(prev => [...prev, { ...art, cantidad:1 }]);
  const updateQty = (idx, v) => setLines(prev => prev.map((l,i)=> i===idx ? {...l, cantidad: Math.max(1, Number(v)||1)} : l));
  const removeLine = (idx) => setLines(prev => prev.filter((_,i)=>i!==idx));

  const subtotal = useMemo(()=> lines.reduce((s,l)=> s + (l.pv * l.cantidad)/1.18, 0), [lines]);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  return (
    <div className="gmp-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-[var(--muted)] gmp-mono">{docLabel} · #{Math.floor(Math.random()*900+100)}</p>
          <h2 className="gmp-display text-lg font-semibold">{docType}</h2>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" icon={FileText}>Imprimir</Btn>
          <Btn icon={ArrowUpRight} onClick={()=>{ onSave({ razon: partner||"Sin cliente", serie: String(Math.floor(Math.random()*900+100)), fecha: new Date().toLocaleDateString("es-PE"), total: Number(total.toFixed(2)), fpago:"Contado", usuario:"GM Parts Admin", estado:"Creado" }); onExit(); }}>Guardar {docType.toLowerCase()}</Btn>
          <IconBtn icon={X} onClick={onExit} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 bg-[var(--panel)] rounded-lg p-5 mb-4">
        <Field label={partnerKind === "cliente" ? "Cliente" : "Proveedor"}>
          <select className={inputCls} value={partner} onChange={e=>setPartner(e.target.value)}>
            <option value="">Selecciona</option>
            {partnerOptions.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Moneda"><select className={inputCls}><option>SOLES</option><option>DÓLARES</option></select></Field>
        <Field label="Fecha"><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0,10)} /></Field>
        <Field label="Cond. pago"><select className={inputCls}><option>CONTADO</option><option>CRÉDITO</option></select></Field>
        <Field label={partnerKind === "cliente" ? "Vendedor" : "Usuario"}>
          <select className={inputCls}>{personalSeed.map(p=><option key={p.id}>{p.nombre}</option>)}</select>
        </Field>
        <Field label="Tipo IGV"><select className={inputCls}><option>INCLUIDO IGV</option><option>SIN IGV</option></select></Field>
        <Field label="Almacén"><select className={inputCls}>{warehousesSeed.map(w=><option key={w.id}>{w.nombre}</option>)}</select></Field>
        <label className="flex items-center gap-2 mt-6 text-sm text-[var(--muted)]">
          <input type="checkbox" defaultChecked className="accent-[var(--accent)] w-4 h-4" /> Actualizar stock
        </label>
      </div>

      <div className="bg-[var(--panel)] rounded-lg p-5">
        <Btn icon={Plus} onClick={()=>setPickerOpen(true)}>Seleccione artículos</Btn>
        <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">Aún no agregas artículos a este documento.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase text-[var(--muted)] text-left">
                <th className="py-2">Código</th><th>Descripción</th><th>Cantidad</th><th>P. venta</th><th>Total</th><th></th>
              </tr></thead>
              <tbody>
                {lines.map((l,i)=>(
                  <tr key={i} className="border-t border-[var(--line-soft)]">
                    <Td className="gmp-mono text-[var(--muted)]">{l.codigo}</Td>
                    <Td>{l.nombre}</Td>
                    <Td><input value={l.cantidad} onChange={e=>updateQty(i,e.target.value)} className={`${inputCls} w-20 py-1`} /></Td>
                    <Td className="gmp-mono">S/ {l.pv}</Td>
                    <Td className="gmp-mono text-[var(--accent)]">S/ {(l.pv*l.cantidad).toFixed(2)}</Td>
                    <Td><IconBtn icon={Trash2} tone="danger" onClick={()=>removeLine(i)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[var(--line-soft)]">
          <Field label="Subtotal"><div className={`${inputCls} gmp-mono`}>S/ {subtotal.toFixed(2)}</div></Field>
          <Field label="IGV (18%)"><div className={`${inputCls} gmp-mono`}>S/ {igv.toFixed(2)}</div></Field>
          <Field label="Total"><div className={`${inputCls} gmp-mono text-[var(--accent)] font-semibold`}>S/ {total.toFixed(2)}</div></Field>
        </div>
      </div>
      {pickerOpen && <ArticlePicker onAdd={addLine} onClose={()=>setPickerOpen(false)} />}
    </div>
  );
}

function DocListView({ viewKey, docType, partnerKind }) {
  const [docs, setDocs] = useState(docSeeds[viewKey] || []);
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <DocumentEditor docLabel={TITLES[viewKey]} docType={docType} partnerKind={partnerKind}
      onExit={()=>setEditing(false)}
      onSave={(d)=>setDocs(prev=>[{ ...d, id:Date.now() }, ...prev])} />;
  }
  return (
    <div>
      <Toolbar title={TITLES[viewKey]} count={docs.length} onNew={()=>setEditing(true)} onExport={()=>{}} newLabel="Crear nuevo" />
      <Table columns={["Razón social","Documento","Serie/#","Fecha","Total","F. pago","Usuario","Estado"]}
        rows={docs} renderRow={d=>(<>
          <Td className="font-medium">{d.razon}</Td>
          <Td>{docType}</Td>
          <Td className="gmp-mono">{d.serie}</Td>
          <Td className="gmp-mono text-[var(--muted)]">{d.fecha}</Td>
          <Td className="gmp-mono">S/ {d.total}</Td>
          <Td>{d.fpago||"—"}</Td>
          <Td>{d.usuario||"—"}</Td>
          <Td><Badge tone={estadoTone(d.estado)}>{d.estado}</Badge></Td>
        </>)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VENTAS SERVICIO                                                     */
/* ------------------------------------------------------------------ */
function ServiceQuoteModal({ onClose, onSave }) {
  return (
    <Modal title="Nueva cotización de servicio" subtitle="Recepción de vehículo · asignación de asesor" onClose={onClose} wide>
      <div className="grid grid-cols-4 gap-4">
        <Field label="Documento"><div className={`${inputCls} text-[var(--muted)]`}>001 · Por asignar</div></Field>
        <Field label="Fecha de emisión"><input type="date" className={inputCls} /></Field>
        <Field label="Tipo de persona"><select className={inputCls}><option>Natural</option><option>Jurídica</option></select></Field>
        <Field label="Cliente"><select className={inputCls}>{clientsSeed.map(c=><option key={c.id}>{c.nombre}</option>)}</select></Field>
        <Field label="Contacto"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Referencia"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Placa"><select className={inputCls}>{vehiclesSeed.map(v=><option key={v.id}>{v.placa}</option>)}</select></Field>
        <Field label="Vehículo"><input className={inputCls} placeholder="Marca / modelo" /></Field>
        <Field label="Nro. orden R"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Año de fabricación"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Moneda"><select className={inputCls}><option>SOLES</option><option>DÓLARES</option></select></Field>
        <Field label="Cond. pago"><select className={inputCls}><option>CONTADO</option><option>CRÉDITO</option></select></Field>
        <Field label="Asesor de servicio"><select className={inputCls}>{personalSeed.map(p=><option key={p.id}>{p.nombre}</option>)}</select></Field>
        <Field label="Garantía"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Kilometraje"><input className={inputCls} placeholder="Escribe aquí" /></Field>
        <Field label="Tipo IGV"><select className={inputCls}><option>INCLUIDO IGV</option><option>SIN IGV</option></select></Field>
        <Field label="Tipo de servicio" span><select className={inputCls}>{serviceCatalogSeed.map(s=><option key={s.id}>{s.desc}</option>)}</select></Field>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={()=>{ onSave(); onClose(); }}>Guardar cotización</Btn>
      </div>
    </Modal>
  );
}

function ServiceQuotesView() {
  const [items,setItems] = useState(serviceQuotesSeed);
  const [open,setOpen] = useState(false);
  return (
    <div>
      <Toolbar title="Cotización de servicios" count={items.length} onNew={()=>setOpen(true)} onExport={()=>{}} />
      <Table columns={["N° documento","Fecha","Cliente","Total","Placa","Modelo","Marca","Estado"]}
        rows={items} renderRow={s=>(<>
          <Td className="gmp-mono text-[var(--muted)]">{s.doc}</Td>
          <Td className="gmp-mono">{s.fecha}</Td>
          <Td className="font-medium">{s.cliente}</Td>
          <Td className="gmp-mono">S/ {s.total}</Td>
          <Td className="gmp-mono">{s.placa}</Td>
          <Td>{s.modelo}</Td>
          <Td>{s.marca}</Td>
          <Td><Badge tone={estadoTone(s.estado)}>{s.estado}</Badge></Td>
        </>)} />
      {open && <ServiceQuoteModal onClose={()=>setOpen(false)}
        onSave={()=>setItems(prev=>[{ id:Date.now(), doc:"CT001-0000"+(200+prev.length), fecha:new Date().toLocaleDateString("es-PE"), cliente:"Nuevo cliente", total:0, placa:"—", modelo:"—", marca:"—", estado:"Recepción" }, ...prev])} />}
    </div>
  );
}

function WorkOrdersView() {
  return (
    <div>
      <Toolbar title="Orden de trabajo" count={workOrdersSeed.length} />
      <Table columns={["N° documento","Fecha reg.","Cliente","Total","Placa","Referencia","Estado"]}
        rows={workOrdersSeed} renderRow={o=>(<>
          <Td className="gmp-mono text-[var(--muted)]">{o.doc}</Td>
          <Td className="gmp-mono">{o.fecha}</Td>
          <Td className="font-medium">{o.cliente}</Td>
          <Td className="gmp-mono">S/ {o.total}</Td>
          <Td className="gmp-mono">{o.placa}</Td>
          <Td className="text-[var(--muted)]">{o.ref}</Td>
          <Td><Badge tone={estadoTone(o.estado)}>{o.estado}</Badge></Td>
        </>)} />
    </div>
  );
}

function ServiceEmisionView({ title, docType }) {
  const [items,setItems] = useState([
    { id:1, razon:"PIL S.A.", serie:"001", fecha:"26/12/2025", total:550, fpago:"CONTADO", canje:"Sin datos", usuario:"PIL S.A." },
    { id:2, razon:"Luis Ramirez", serie:"001", fecha:"24/9/2025", total:186, fpago:"CONTADO", canje:"Sin datos", usuario:"Luis Ramirez" },
  ]);
  const [editing,setEditing] = useState(false);
  if (editing) {
    return (
      <div className="gmp-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="gmp-display text-lg font-semibold">{docType} de servicio</h2>
          <div className="flex gap-2">
            <Btn variant="ghost" icon={FileText}>Imprimir</Btn>
            <Btn icon={ArrowUpRight} onClick={()=>{ setItems(p=>[{ id:Date.now(), razon:"Nuevo cliente", serie:"001", fecha:new Date().toLocaleDateString("es-PE"), total:0, fpago:"CONTADO", canje:"Sin datos", usuario:"GM Parts Admin" }, ...p]); setEditing(false); }}>Guardar</Btn>
            <IconBtn icon={X} onClick={()=>setEditing(false)} />
          </div>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5 grid grid-cols-4 gap-4">
          <Field label="Cliente"><select className={inputCls}>{clientsSeed.map(c=><option key={c.id}>{c.nombre}</option>)}</select></Field>
          <Field label="Moneda"><select className={inputCls}><option>SOLES</option></select></Field>
          <Field label="Tipo IGV"><select className={inputCls}><option>INCLUIDO IGV</option></select></Field>
          <Field label="Cond. pago"><select className={inputCls}><option>CONTADO</option><option>CRÉDITO</option></select></Field>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5 mt-4">
          <div className="flex gap-2">
            <Btn variant="ghost" icon={Wrench}>Mano de obra</Btn>
            <Btn icon={Plus}>Artículos / repuestos</Btn>
          </div>
          <div className="flex justify-end gap-6 mt-4 pt-4 border-t border-[var(--line-soft)] text-sm gmp-mono">
            <span className="text-[var(--muted)]">Subtotal: <b className="text-[var(--text)]">S/ 0</b></span>
            <span className="text-[var(--muted)]">IGV: <b className="text-[var(--text)]">S/ 0</b></span>
            <span className="text-[var(--muted)]">Total: <b className="text-[var(--accent)]">S/ 0</b></span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Toolbar title={title} count={items.length} onNew={()=>setEditing(true)} onExport={()=>{}} />
      <Table columns={["Razón social","Serie/N°","Fecha","Total","F. pago","Canje","Usuario"]}
        rows={items} renderRow={r=>(<>
          <Td className="font-medium">{r.razon}</Td>
          <Td className="gmp-mono">{r.serie}</Td>
          <Td className="gmp-mono text-[var(--muted)]">{r.fecha}</Td>
          <Td className="gmp-mono">$ {r.total}</Td>
          <Td><Badge>{r.fpago}</Badge></Td>
          <Td className="text-[var(--muted)]">{r.canje}</Td>
          <Td>{r.usuario}</Td>
        </>)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COBRANZA / REPORTES                                                 */
/* ------------------------------------------------------------------ */
function CobranzaView({ kind }) {
  const rows = cobranzaSeed[kind];
  return (
    <div>
      <Toolbar title={kind==="cobrar" ? "Cuentas por cobrar" : "Cuentas por pagar"} count={rows.length} />
      <Table columns={["Documento","Número","Razón social","Total","Pago","Estado","Fecha","Detalle"]}
        rows={rows} renderRow={r=>(<>
          <Td>{r.doc}</Td>
          <Td className="gmp-mono">{r.num}</Td>
          <Td className="font-medium">{r.razon}</Td>
          <Td className="gmp-mono">S/ {r.total}</Td>
          <Td className="gmp-mono">S/ {r.pago}</Td>
          <Td><Badge tone={estadoTone(r.estado)}>{r.estado}</Badge></Td>
          <Td className="gmp-mono text-[var(--muted)]">{r.fecha}</Td>
          <Td><Btn variant="ghost" icon={Eye}>Vista previa</Btn></Td>
        </>)} />
    </div>
  );
}

function ReportesView({ kind }) {
  if (kind === "doc") {
    return (
      <div>
        <Toolbar title="Reporte de ventas de documentos electrónicos" />
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Field label="Documento"><select className={inputCls}><option>Todo</option></select></Field>
          <Field label="Año"><select className={inputCls}><option>2026</option><option>2025</option></select></Field>
          <Field label="Mes"><select className={inputCls}><option>Todo</option></select></Field>
        </div>
        <Table columns={["Descripción","Excel","Vista"]} rows={[1,2,3]} renderRow={(_,i)=>(<>
          <Td>Resumen de comprobantes electrónicos #{i+1}</Td>
          <Td><IconBtn icon={Download} /></Td>
          <Td><IconBtn icon={Eye} /></Td>
        </>)} />
      </div>
    );
  }
  return (
    <div>
      <Toolbar title="Reporte de ventas" />
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Field label="RUC/DNI"><input className={inputCls} /></Field>
        <Field label="Cliente"><input className={inputCls} /></Field>
        <Field label="Fecha desde"><input type="date" className={inputCls} /></Field>
        <Field label="Fecha hasta"><input type="date" className={inputCls} /></Field>
      </div>
      <Table columns={["Condición de pago","Tipo de documento","Cantidad"]} rows={[
        {c:"Contado",t:"Boleta",n:5},{c:"Contado",t:"Boleta",n:1},{c:"Contado",t:"Boleta",n:6},
      ]} renderRow={r=>(<><Td>{r.c}</Td><Td><Badge>{r.t}</Badge></Td><Td className="gmp-mono">{r.n}</Td></>)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD                                                           */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, delta, icon:Icon, tone }) {
  return (
    <div className="bg-[var(--panel)] rounded-lg p-5 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
        <div className={`p-2 rounded-lg ${tone==="accent"?"bg-[var(--accent-dim)] text-[var(--accent)]":"bg-[var(--surface-2)] text-[var(--muted)]"}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="gmp-display text-3xl font-bold mt-3">{value}</p>
      {delta && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {delta > 0 ? <ArrowUpRight size={13} className="text-[var(--success)]" /> : <ArrowDownRight size={13} className="text-[var(--danger)]" />}
          <span className={delta>0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{Math.abs(delta)}%</span>
          <span className="text-[var(--muted-2)]">últimos 30 días</span>
        </div>
      )}
    </div>
  );
}

function MiniBars({ data }) {
  const max = Math.max(...data.map(d=>d.v));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full rounded-t-sm bg-[var(--accent)] border-x border-t border-[var(--accent-border)]"
            style={{ height: `${(d.v/max)*100}%`, minHeight:4 }} />
          <span className="text-[10px] text-[var(--muted-2)] gmp-mono">{d.k}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ go }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[var(--muted)] gmp-mono">SISTEMA · GM PARTS · TALLER &amp; INVENTARIO</p>
          <h1 className="gmp-display text-2xl font-bold mt-1">Bienvenido de vuelta</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] bg-[var(--panel)] px-3 py-2 rounded-full font-medium">
          <CircleDot size={12} className="text-[var(--success)]" /> Firebase sincronizado
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Clientes" value="17" delta={8} icon={Users} tone="accent" />
        <StatCard label="Diagnósticos" value="324" delta={12} icon={Gauge} />
        <StatCard label="Trabajos en proceso" value="4" delta={-3} icon={Wrench} />
        <StatCard label="Cotizaciones" value="12" delta={5} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[var(--panel)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="gmp-display font-semibold text-sm">Ventas de la semana</h3>
            <Badge tone="accent">+18% vs. semana anterior</Badge>
          </div>
          <MiniBars data={[{k:"Lun",v:12},{k:"Mar",v:19},{k:"Mié",v:9},{k:"Jue",v:22},{k:"Vie",v:31},{k:"Sáb",v:26},{k:"Dom",v:14}]} />
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-4">Accesos rápidos</h3>
          <div className="flex flex-col gap-2">
            <button onClick={()=>go("va-cotizacion")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">Nueva cotización <ChevronRight size={14} /></button>
            <button onClick={()=>go("al-articulos")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">Ver inventario <ChevronRight size={14} /></button>
            <button onClick={()=>go("vs-cotizacion")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">Recepcionar vehículo <ChevronRight size={14} /></button>
            <button onClick={()=>go("cb-cobrar")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">Cuentas por cobrar <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Stock crítico</h3>
          <div className="flex flex-col gap-2">
            {articlesSeed.filter(a=>a.stock<50).map(a=>(
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.nombre}</span>
                <Badge tone={a.stock===0?"danger":"amber"}>{a.stock} und.</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Vehículos en taller</h3>
          <div className="flex flex-col gap-2">
            {workOrdersSeed.map(o=>(
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="gmp-mono">{o.placa}</span>
                <span className="text-[var(--muted)] flex-1 px-3 truncate">{o.cliente}</span>
                <Badge tone={estadoTone(o.estado)}>{o.estado}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LOGIN                                                               */
/* ------------------------------------------------------------------ */
function Login({ onLogin }) {
  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <FontLoader />
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <path d="M4 24C6 12 14 5 17 5C20 5 28 12 30 24" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="17" cy="24" r="2.4" fill="var(--accent)" />
          </svg>
          <div>
            <p className="gmp-display font-bold text-lg leading-none">GM<span className="text-[var(--accent)]">PARTS</span></p>
            <p className="text-[10px] text-[var(--muted)] gmp-mono tracking-wide">TALLER · INVENTARIO</p>
          </div>
        </div>
        <h2 className="gmp-display text-xl font-semibold mb-6">Iniciar sesión</h2>
        <div className="flex flex-col gap-4">
          <Field label="Correo electrónico"><input className={inputCls} placeholder="correo@gmparts.com" /></Field>
          <Field label="Contraseña"><input type="password" className={inputCls} placeholder="Ingrese contraseña" /></Field>
        </div>
        <button className="text-xs text-[var(--accent)] mt-3 hover:underline">¿Olvidaste tu contraseña?</button>
        <Btn className="w-full justify-center mt-6" onClick={onLogin}>Iniciar sesión</Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LAYOUT PRINCIPAL                                                    */
/* ------------------------------------------------------------------ */
function Sidebar({ view, setView, openGroups, toggleGroup }) {
  return (
    <aside className="w-64 shrink-0 bg-[var(--panel)] h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-[var(--line-soft)]">
        <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
          <path d="M4 24C6 12 14 5 17 5C20 5 28 12 30 24" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="17" cy="24" r="2.4" fill="var(--accent)" />
        </svg>
        <div>
          <p className="gmp-display font-bold text-sm leading-none">GM<span className="text-[var(--accent)]">PARTS</span></p>
          <p className="text-[9px] text-[var(--muted)] gmp-mono tracking-wide mt-0.5">TALLER · INVENTARIO</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto gmp-scroll py-3 px-3">
        {NAV.map(item => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isOpen = openGroups.includes(item.key);
          const isActiveParent = hasChildren && item.children.some(c => c.key === view);
          return (
            <div key={item.key} className="mb-1">
              <button
                onClick={() => hasChildren ? toggleGroup(item.key) : setView(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${(view===item.key || isActiveParent) ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] border border-transparent"}`}>
                <span className="flex items-center gap-2.5"><Icon size={16} /> {item.label}</span>
                {hasChildren && <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />}
              </button>
              {hasChildren && isOpen && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-[var(--line-soft)] pl-3">
                  {item.children.map(c => (
                    <button key={c.key} onClick={() => setView(c.key)}
                      className={`text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors
                        ${view===c.key ? "text-[var(--accent)] bg-[var(--accent-dim)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--line-soft)]">
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  const [menu,setMenu] = useState(false);
  return (
    <header className="h-16 flex items-center justify-end px-6 gap-4 sticky top-0 bg-[var(--bg)] z-30">
      <button className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-2)]">
        <Settings size={14} /> Configuración <ChevronDown size={13} />
      </button>
      <div className="relative">
        <button onClick={()=>setMenu(m=>!m)} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[var(--panel)] hover:bg-[var(--surface-2)]">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xs font-semibold">GM</div>
          <span className="text-sm">GM Parts Admin</span>
        </button>
        {menu && (
          <div className="absolute right-0 mt-2 w-44 bg-[var(--surface-3)] rounded-lg overflow-hidden gmp-fade-in shadow-lg border border-[var(--line-soft)]">
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-2)]">Mi perfil</button>
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-2)] text-[var(--danger)]">Cerrar sesión</button>
          </div>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState("dashboard");
  const [openGroups, setOpenGroups] = useState(["administracion"]);

  const toggleGroup = (key) => setOpenGroups(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  const go = (key) => {
    setView(key);
    const parent = NAV.find(n => n.children?.some(c => c.key === key));
    if (parent && !openGroups.includes(parent.key)) setOpenGroups(prev => [...prev, parent.key]);
  };

  if (!loggedIn) return <Login onLogin={()=>setLoggedIn(true)} />;

  const docConfig = {
    "c-factura":{ label:"Factura", kind:"proveedor" }, "c-boleta":{ label:"Boleta", kind:"proveedor" },
    "c-notas":{ label:"Nota de Pedido", kind:"proveedor" }, "c-guia":{ label:"Guía de Compra", kind:"proveedor" },
    "c-orden":{ label:"Orden de Compra", kind:"proveedor" },
    "va-cotizacion":{ label:"Cotización", kind:"cliente" }, "va-boleta":{ label:"Boleta", kind:"cliente" },
    "va-factura":{ label:"Factura", kind:"cliente" }, "va-guia":{ label:"Guía de Remisión", kind:"cliente" },
    "va-notacredito":{ label:"Nota de Crédito", kind:"cliente" },
  };

  function renderView() {
    if (view === "dashboard") return <Dashboard go={go} />;
    if (view === "clientes") return <ClientesView />;
    if (view === "proveedores") return <ProveedoresView />;
    if (view === "personal") return <PersonalView />;
    if (view === "al-vehiculos") return <VehiculosView />;
    if (view === "al-almacenes") return <AlmacenesView />;
    if (view === "al-servicios") return <ServiciosCatalogoView />;
    if (view === "al-articulos") return <ArticulosView />;
    if (view === "al-kardex") return <KardexView />;
    if (view === "al-movimientos") return <MovimientosView />;
    if (view === "vs-cotizacion") return <ServiceQuotesView />;
    if (view === "vs-orden") return <WorkOrdersView />;
    if (view === "vs-factura") return <ServiceEmisionView title="Emisión de facturas" docType="Factura" />;
    if (view === "vs-boleta") return <ServiceEmisionView title="Emisión de boletas" docType="Boleta" />;
    if (view === "vs-notas") return <ServiceEmisionView title="Registro de notas de venta" docType="Nota" />;
    if (view === "cb-cobrar") return <CobranzaView kind="cobrar" />;
    if (view === "cb-pagar") return <CobranzaView kind="pagar" />;
    if (view === "rp-ventas") return <ReportesView kind="ventas" />;
    if (view === "rp-doc") return <ReportesView kind="doc" />;
    if (docConfig[view]) return <DocListView viewKey={view} docType={docConfig[view].label} partnerKind={docConfig[view].kind} />;
    return <Dashboard go={go} />;
  }

  return (
    <div className="gmp-root flex min-h-screen">
      <FontLoader />
      <Sidebar view={view} setView={go} openGroups={openGroups} toggleGroup={toggleGroup} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 gmp-scroll overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
