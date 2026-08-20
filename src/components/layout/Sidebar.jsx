import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Building2, ShoppingBag, Wrench, ShoppingCart, Package,
  Calculator, BarChart3, LogOut, ChevronDown
} from "lucide-react";
import { getSession, logout } from "../../store/auth";
import { puedeVerRuta, puedeVerModulo } from "../../lib/roles";

// Los grupos del menú usan claves cortas propias (`vartic`, `vserv`, `alm`…); esto las
// traduce a los módulos de permisos.
// El resto de claves (administracion, compras, almacen, cobranza, reportes) ya coinciden con
// el nombre del módulo.
const MODULO_DE_GRUPO = {
  vartic: "ventasArticulos",
  vserv: "ventasServicio",
};

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: Home, path: "/dashboard" },
  {
    key: "administracion", label: "Administración", icon: Building2,
    children: [
      { key: "clientes", label: "Gestión Clientes", path: "/clientes" },
      { key: "proveedores", label: "Gestión Proveedores", path: "/proveedores" },
      { key: "personal", label: "Gestión Personal", path: "/personal" },
    ],
  },
  {
    key: "vartic", label: "Ventas artículos", icon: ShoppingBag,
    children: [
      { key: "va-cotizacion", label: "Cotizaciones", path: "/va-cotizacion" },
      { key: "va-factura", label: "Emisión de factura", path: "/va-factura" },
      { key: "va-boleta", label: "Emisión de boleta", path: "/va-boleta" },
      { key: "va-guia", label: "Emisión guía remisión", path: "/va-guia" },
      { key: "va-notacredito", label: "Nota crédito", path: "/va-notacredito" },
    ],
  },
  {
    key: "vserv", label: "Ventas Servicio", icon: Wrench,
    children: [
      { key: "vs-cotizacion", label: "Cotización de Servicio", path: "/vs-cotizacion" },
      { key: "vs-orden", label: "Orden de Trabajo", path: "/vs-orden" },
      { key: "vs-factura", label: "Emisión de Facturas", path: "/vs-factura" },
      { key: "vs-boleta", label: "Emisión de Boletas", path: "/vs-boleta" },
      { key: "vs-notas", label: "Registros Notas de Venta", path: "/vs-notas" },
    ],
  },
    {
      key: "compras", label: "Compras", icon: ShoppingCart,
      children: [
        { key: "c-factura", label: "Factura", path: "/c-factura" },
        { key: "c-boleta", label: "Boleta", path: "/c-boleta" },
        { key: "c-notas", label: "Notas compra", path: "/c-notas" },
        { key: "c-guia", label: "Guía de remisión", path: "/c-guia" },
        { key: "c-orden", label: "Orden de compra", path: "/c-orden" },
      ],
    },
  {
    key: "almacen", label: "Almacén", icon: Package,
    children: [
      { key: "al-articulos", label: "Maestro de artículos", path: "/al-articulos" },
      { key: "al-catalogos", label: "Catálogos", path: "/al-catalogos" },
      { key: "al-almacenes", label: "Almacenes", path: "/al-almacenes" },
      { key: "al-movimientos", label: "Movimientos de Almacén", path: "/al-movimientos" },
      { key: "al-kardex", label: "Kárdex de Almacén", path: "/al-kardex" },
      { key: "al-vehiculos", label: "Gestión de vehículos", path: "/al-vehiculos" },
      { key: "al-servicios", label: "Gestión de Servicio", path: "/al-servicios" },
        { key: "al-vale", label: "Vale de insumos", path: "/al-vale-insumos" },
      { key: "al-notaventa", label: "Nota de Venta", path: "/al-nota-venta" },
    ],
  },
    {
      key: "cobranza", label: "Cobranza", icon: Calculator,
      children: [
        { key: "cb-cobrar", label: "Cuentas por cobrar", path: "/cb-cobrar" },
        { key: "cb-pagar", label: "Cuentas por pagar", path: "/cb-pagar" },
      ],
    },
    {
      key: "reportes", label: "Reportes", icon: BarChart3,
      children: [
        { key: "rp-ventas", label: "Reportes de Ventas", path: "/rp-ventas" },
        { key: "rp-doc", label: "Reporte Doc. Electrónica", path: "/rp-doc" },
      ],
    },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(["administracion"]);
  const session = getSession();

  // El menú se filtra por rol de arriba abajo: primero el grupo y después cada entrada,
  // porque hay rutas más restringidas que su grupo (Gestión Personal, por ejemplo, es solo
  // de administración aunque el asesor sí vea Clientes y Proveedores).
  //
  // Antes solo se escondía el grupo «Administración» y todo lo demás se mostraba a todo el
  // mundo. Ocultar no autoriza: la comprobación de verdad está en Layout (App.jsx) y en las
  // reglas de Firestore; esto es para que nadie vea puertas que no puede abrir.
  const rol = session?.userRole;
  // Un grupo se muestra si el rol tiene su módulo O si le queda alguna entrada dentro.
  //
  // Antes bastaba con que el módulo estuviera prohibido para esconder el grupo entero, y eso
  // dejaba pantallas alcanzables por URL pero imposibles de encontrar clicando: el asesor de
  // servicio puede dar de alta vehículos, pero «Vehículos» vive bajo Almacén, un módulo que
  // no es suyo, así que el grupo desaparecía y la opción con él.
  const navItems = NAV
    .map((item) => (item.children
      ? { ...item, children: item.children.filter((c) => puedeVerRuta(rol, c.path)) }
      : item))
    .filter((item) => {
      if (item.path) return puedeVerRuta(rol, item.path);
      const modulo = MODULO_DE_GRUPO[item.key] || item.key;
      return puedeVerModulo(rol, modulo) || (item.children && item.children.length > 0);
    })
    .filter((item) => !item.children || item.children.length > 0);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const isActive = (path) => location.pathname === path;
  const getParentKey = (path) => {
    for (const item of NAV) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === path) return item.key;
        }
      }
    }
    return null;
  };

  return (
    <aside className="w-64 shrink-0 bg-[var(--panel)] h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-[var(--line-soft)]">
        <img src="/logo.png" alt="GM Parts" className="w-8 h-8 object-contain" />
          <div>
            <p className="gmp-display font-bold text-sm leading-none">GM<span className="text-[var(--accent)]">PARTS</span></p>
            <p className="text-[9px] text-[var(--muted)] gmp-mono tracking-wide mt-0.5">TALLER · INVENTARIO</p>
            {session && <p className="text-[9px] text-[var(--accent)] gmp-mono mt-0.5">{session.userRole}</p>}
          </div>
      </div>
      <nav className="flex-1 overflow-y-auto gmp-scroll py-3 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isOpen = openGroups.includes(item.key);
          const parentActive = hasChildren && item.children.some((c) => c.path && isActive(c.path));

          return (
            <div key={item.key} className="mb-1">
              <button
                onClick={() => (hasChildren ? toggleGroup(item.key) : item.path && navigate(item.path))}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path) || parentActive
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2.5"><Icon size={16} /> {item.label}</span>
                {hasChildren && <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />}
              </button>
              {hasChildren && isOpen && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-[var(--line-soft)] pl-3">
                  {item.children.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => navigate(c.path)}
                      className={`text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                        isActive(c.path) ? "text-[var(--accent)] bg-[var(--accent-dim)]" : "text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
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
        <button
          onClick={async () => {
            // Cierra la sesión de Firebase Auth y borra la de localStorage antes de salir.
            // Antes solo navegaba a /login: la sesión seguía viva y bastaba volver a
            // cualquier ruta protegida para entrar de nuevo sin credenciales.
            await logout();
            navigate("/login", { replace: true });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
