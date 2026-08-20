import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import Splash from "./pages/auth/Splash";
import Login from "./pages/auth/Login";
import RestaurarContrasena1 from "./pages/auth/RestaurarContrasena1";
import RestaurarContrasena2 from "./pages/auth/RestaurarContrasena2";
import RestaurarContrasena3 from "./pages/auth/RestaurarContrasena3";
import CambiarContrasena from "./pages/auth/CambiarContrasena";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";
import ClientesList from "./pages/administracion/ClientesList";
import ProveedoresList from "./pages/administracion/ProveedoresList";
import PersonalList from "./pages/administracion/PersonalList";
import ArticulosList from "./pages/almacen/ArticulosList";
import ArticuloForm from "./pages/almacen/ArticuloForm";
import Catalogos from "./pages/almacen/Catalogos";
import AlmacenesList from "./pages/almacen/AlmacenesList";

import MovimientosList from "./pages/almacen/MovimientosList";
import MovimientoForm from "./pages/almacen/MovimientoForm";
import KardexList from "./pages/almacen/KardexList";
import ValeInsumos from "./pages/almacen/ValeInsumos";
import NotaVenta from "./pages/almacen/NotaVenta";
import VehiculosList from "./pages/almacen/VehiculosList";
import VehiculoForm from "./pages/almacen/VehiculoForm";
import ServiciosList from "./pages/almacen/ServiciosList";
import CotizacionesList from "./pages/ventas/articulos/CotizacionesList";
import EmisionFacturaList from "./pages/ventas/articulos/EmisionFacturaList";
import EmisionBoletaList from "./pages/ventas/articulos/EmisionBoletaList";
import GuiaRemisionList from "./pages/ventas/articulos/GuiaRemisionList";
import NotaCreditoList from "./pages/ventas/articulos/NotaCreditoList";
import CotizacionServicioList from "./pages/ventas/servicios/CotizacionServicioList";
import OrdenTrabajoList from "./pages/ventas/servicios/OrdenTrabajoList";
import OrdenTrabajoEditor from "./pages/ventas/servicios/OrdenTrabajoEditor";
import EmisionFacturaTallerList from "./pages/ventas/servicios/EmisionFacturaTallerList";
import EmisionBoletaTallerList from "./pages/ventas/servicios/EmisionBoletaTallerList";
import RegistroNotaVentasList from "./pages/ventas/servicios/RegistroNotaVentasList";
import DocumentEditor from "./components/documents/DocumentEditor";
import ServicioEditor from "./components/documents/ServicioEditor";
import CompraEditor from "./components/documents/CompraEditor";
import FacturaCompraList from "./pages/compras/FacturaList";
import BoletaCompraList from "./pages/compras/BoletaList";
import NotaPedidoList from "./pages/compras/NotaPedidoList";
import GuiaCompraList from "./pages/compras/GuiaCompraList";
import OrdenPagoList from "./pages/compras/OrdenPagoList";
import CuentasCobrar from "./pages/cobranza/CuentasCobrar";
import CuentasPagar from "./pages/cobranza/CuentasPagar";
import ReporteVentas from "./pages/reportes/ReporteVentas";
import ReporteDocElect from "./pages/reportes/ReporteDocElect";
import Placeholder from "./pages/Placeholder";
import { getSession, observeAuth } from "./store/auth";
import { puedeVerRuta } from "./lib/roles";
import ToastContainer from "./components/ui/Toast";

const placeholderRoutes = [];

// Pantalla que se muestra cuando alguien llega a una ruta que su rol no alcanza.
// Decirlo claramente es mejor que redirigir en silencio al dashboard: quien lo ve entiende
// que la pantalla existe pero no le corresponde, y a quién pedírsela.
function SinPermiso({ rol }) {
  return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--danger-dim)] text-[var(--danger)] mb-4">
        <Lock size={22} />
      </div>
      <h1 className="text-lg font-semibold text-[var(--text)] mb-2">Esta sección no te corresponde</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Tu rol es <strong>{rol || "sin asignar"}</strong> y no incluye esta pantalla. Si crees que
        deberías tener acceso, pídeselo a administración.
      </p>
      <Link to="/dashboard" className="text-sm font-medium text-[var(--accent)] hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}

function Layout({ children }) {
  const session = getSession();
  const { pathname } = useLocation();
  if (!session) return <Navigate to="/login" replace />;

  // Autorización por rol. Antes el único control era «¿hay sesión?»: las ~60 rutas se
  // renderizaban igual para cualquiera, y ocultar un grupo del menú no impedía llegar
  // escribiendo la dirección.
  const autorizado = puedeVerRuta(session.userRole, pathname);

  return (
    <div className="gmp-root flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 gmp-scroll overflow-y-auto">
          {autorizado ? children : <SinPermiso rol={session.userRole} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // Mantiene localStorage sincronizado con el estado real de Firebase Auth (Fase D2).
  useEffect(() => {
    const unsub = observeAuth((session) => {
      if (session) localStorage.setItem("gmp_session_v1", JSON.stringify(session));
      else localStorage.removeItem("gmp_session_v1");
    });
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/splash" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/restaurar-contrasena-1" element={<RestaurarContrasena1 />} />
        <Route path="/restaurar-contrasena-2" element={<RestaurarContrasena2 />} />
        <Route path="/restaurar-contrasena-3" element={<RestaurarContrasena3 />} />
        <Route path="/cambiar-contrasena" element={<Layout><CambiarContrasena /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/clientes" element={<Layout><ClientesList /></Layout>} />
        <Route path="/proveedores" element={<Layout><ProveedoresList /></Layout>} />
        <Route path="/personal" element={<Layout><PersonalList /></Layout>} />

        {/* Almacén */}
        <Route path="/al-articulos" element={<Layout><ArticulosList /></Layout>} />
        <Route path="/al-catalogos" element={<Layout><Catalogos /></Layout>} />
        <Route path="/al-articulos/nuevo" element={<Layout><ArticuloForm /></Layout>} />
        <Route path="/al-articulos/:id" element={<Layout><ArticuloForm /></Layout>} />
        <Route path="/al-almacenes" element={<Layout><AlmacenesList /></Layout>} />
        <Route path="/al-movimientos" element={<Layout><MovimientosList /></Layout>} />
        <Route path="/al-movimientos/nuevo" element={<Layout><MovimientoForm /></Layout>} />
        <Route path="/al-movimientos/:id" element={<Layout><MovimientoForm /></Layout>} />
        <Route path="/al-kardex" element={<Layout><KardexList /></Layout>} />
        <Route path="/al-vehiculos" element={<Layout><VehiculosList /></Layout>} />
        <Route path="/al-vehiculos/nuevo" element={<Layout><VehiculoForm /></Layout>} />
        <Route path="/al-vehiculos/:id" element={<Layout><VehiculoForm /></Layout>} />
        <Route path="/al-servicios" element={<Layout><ServiciosList /></Layout>} />

        {/* Ventas Artículos */}
        <Route path="/va-cotizacion" element={<Layout><CotizacionesList /></Layout>} />
        <Route path="/va-cotizacion/nuevo" element={<Layout><DocumentEditor title="Cotización" backPath="/va-cotizacion" docKey="va-cotizacion" /></Layout>} />
        <Route path="/va-cotizacion/:id" element={<Layout><DocumentEditor title="Cotización" backPath="/va-cotizacion" docKey="va-cotizacion" mode="edit" /></Layout>} />
        <Route path="/va-factura" element={<Layout><EmisionFacturaList /></Layout>} />
        <Route path="/va-factura/nuevo" element={<Layout><DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" /></Layout>} />
        <Route path="/va-factura/:id" element={<Layout><DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" mode="edit" /></Layout>} />
        <Route path="/va-boleta" element={<Layout><EmisionBoletaList /></Layout>} />
        <Route path="/va-boleta/nuevo" element={<Layout><DocumentEditor title="Boleta" backPath="/va-boleta" docKey="va-boleta" /></Layout>} />
        <Route path="/va-boleta/:id" element={<Layout><DocumentEditor title="Boleta" backPath="/va-boleta" docKey="va-boleta" mode="edit" /></Layout>} />
        <Route path="/va-guia" element={<Layout><GuiaRemisionList /></Layout>} />
        <Route path="/va-guia/nuevo" element={<Layout><DocumentEditor title="Guía de Remisión" backPath="/va-guia" docKey="va-guia" /></Layout>} />
        <Route path="/va-guia/:id" element={<Layout><DocumentEditor title="Guía de Remisión" backPath="/va-guia" docKey="va-guia" mode="edit" /></Layout>} />
        <Route path="/va-notacredito" element={<Layout><NotaCreditoList /></Layout>} />
        <Route path="/va-notacredito/nuevo" element={<Layout><DocumentEditor title="Nota de Crédito" backPath="/va-notacredito" docKey="va-notacredito" /></Layout>} />
        <Route path="/va-notacredito/:id" element={<Layout><DocumentEditor title="Nota de Crédito" backPath="/va-notacredito" docKey="va-notacredito" mode="edit" /></Layout>} />

        {/* Ventas Servicio */}
        <Route path="/vs-cotizacion" element={<Layout><CotizacionServicioList /></Layout>} />
        <Route path="/vs-cotizacion/nuevo" element={<Layout><ServicioEditor title="Cotización de Servicio" backPath="/vs-cotizacion" docKey="vs-cotizacion" /></Layout>} />
        <Route path="/vs-cotizacion/:id" element={<Layout><ServicioEditor title="Cotización de Servicio" backPath="/vs-cotizacion" docKey="vs-cotizacion" mode="edit" /></Layout>} />
        <Route path="/vs-orden" element={<Layout><OrdenTrabajoList /></Layout>} />
        <Route path="/vs-orden/nuevo" element={<Layout><OrdenTrabajoEditor backPath="/vs-orden" /></Layout>} />
        <Route path="/vs-orden/:id" element={<Layout><OrdenTrabajoEditor backPath="/vs-orden" mode="edit" /></Layout>} />
        <Route path="/vs-factura" element={<Layout><EmisionFacturaTallerList /></Layout>} />
        <Route path="/vs-factura/nuevo" element={<Layout><ServicioEditor title="Factura Taller" backPath="/vs-factura" docKey="vs-factura" /></Layout>} />
        <Route path="/vs-factura/:id" element={<Layout><ServicioEditor title="Factura Taller" backPath="/vs-factura" docKey="vs-factura" mode="edit" /></Layout>} />
        <Route path="/vs-boleta" element={<Layout><EmisionBoletaTallerList /></Layout>} />
        <Route path="/vs-boleta/nuevo" element={<Layout><ServicioEditor title="Boleta Taller" backPath="/vs-boleta" docKey="vs-boleta" /></Layout>} />
        <Route path="/vs-boleta/:id" element={<Layout><ServicioEditor title="Boleta Taller" backPath="/vs-boleta" docKey="vs-boleta" mode="edit" /></Layout>} />
        <Route path="/vs-notas" element={<Layout><RegistroNotaVentasList /></Layout>} />
        <Route path="/vs-notas/nuevo" element={<Layout><ServicioEditor title="Nota de Venta" backPath="/vs-notas" docKey="vs-notas" /></Layout>} />
        <Route path="/vs-notas/:id" element={<Layout><ServicioEditor title="Nota de Venta" backPath="/vs-notas" docKey="vs-notas" mode="edit" /></Layout>} />

        {/* Compras */}
        <Route path="/c-factura" element={<Layout><FacturaCompraList /></Layout>} />
        <Route path="/c-factura/nuevo" element={<Layout><CompraEditor title="Factura Compra" backPath="/c-factura" docKey="c-factura" /></Layout>} />
        <Route path="/c-factura/:id" element={<Layout><CompraEditor title="Factura Compra" backPath="/c-factura" docKey="c-factura" mode="edit" /></Layout>} />
        <Route path="/c-boleta" element={<Layout><BoletaCompraList /></Layout>} />
        <Route path="/c-boleta/nuevo" element={<Layout><CompraEditor title="Boleta Compra" backPath="/c-boleta" docKey="c-boleta" /></Layout>} />
        <Route path="/c-boleta/:id" element={<Layout><CompraEditor title="Boleta Compra" backPath="/c-boleta" docKey="c-boleta" mode="edit" /></Layout>} />
        <Route path="/c-notas" element={<Layout><NotaPedidoList /></Layout>} />
        <Route path="/c-notas/nuevo" element={<Layout><CompraEditor title="Nota de Pedido" backPath="/c-notas" docKey="c-notas" /></Layout>} />
        <Route path="/c-notas/:id" element={<Layout><CompraEditor title="Nota de Pedido" backPath="/c-notas" docKey="c-notas" mode="edit" /></Layout>} />
        <Route path="/c-guia" element={<Layout><GuiaCompraList /></Layout>} />
        <Route path="/c-guia/nuevo" element={<Layout><CompraEditor title="Guía de Compra" backPath="/c-guia" docKey="c-guia" /></Layout>} />
        <Route path="/c-guia/:id" element={<Layout><CompraEditor title="Guía de Compra" backPath="/c-guia" docKey="c-guia" mode="edit" /></Layout>} />
        <Route path="/c-orden" element={<Layout><OrdenPagoList /></Layout>} />
        <Route path="/c-orden/nuevo" element={<Layout><CompraEditor title="Orden de Pago" backPath="/c-orden" docKey="c-orden" /></Layout>} />
        <Route path="/c-orden/:id" element={<Layout><CompraEditor title="Orden de Pago" backPath="/c-orden" docKey="c-orden" mode="edit" /></Layout>} />

        {/* Cobranza */}
        <Route path="/cb-cobrar" element={<Layout><CuentasCobrar kind="Cobrar" /></Layout>} />
        <Route path="/cb-pagar" element={<Layout><CuentasPagar /></Layout>} />

        {/* Reportes */}
        <Route path="/rp-ventas" element={<Layout><ReporteVentas /></Layout>} />
        <Route path="/rp-doc" element={<Layout><ReporteDocElect /></Layout>} />

        {/* Placeholders */}
        {placeholderRoutes.map((key) => (
          <Route key={key} path={`/placeholder/${key}`} element={<Layout><Placeholder /></Layout>} />
        ))}

        {/* Vale Insumos + Nota Venta (almacén) — placeholder links from sidebar go here */}
        <Route path="/al-vale-insumos" element={<Layout><ValeInsumos /></Layout>} />
        <Route path="/al-nota-venta" element={<Layout><NotaVenta /></Layout>} />
        <Route path="/al-nota-venta/nuevo" element={<Layout><DocumentEditor title="Nota de Venta" backPath="/al-nota-venta" docKey="al-notaventa" /></Layout>} />
        <Route path="/al-nota-venta/:id" element={<Layout><DocumentEditor title="Nota de Venta" backPath="/al-nota-venta" docKey="al-notaventa" mode="edit" /></Layout>} />

        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
