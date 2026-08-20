import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gauge, Wrench, ClipboardList, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Badge from "../components/ui/Badge";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { puedeVerModulo, puedeVerRuta } from "../lib/roles";
import { getSession } from "../store/auth";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];

function useDashboardData(rol) {
  const [stats, setStats] = useState({ clientes: 0, diagnosticos: 0, trabajosEnProceso: 0, cotizaciones: 0 });
  const [weekly, setWeekly] = useState([]);
  const [stock, setStock] = useState([]);
  const [taller, setTaller] = useState([]);
  const [cargando, setCargando] = useState(true);

  const verVentas = puedeVerModulo(rol, "reportes");
  const verStock = puedeVerModulo(rol, "almacen");

  useEffect(() => {
    let vivo = true;

    // Cada bloque va en su propio try. Antes había UN solo try envolviéndolo todo, y como
    // `FacturasVentasCompras` devuelve 403 a un técnico, esa excepción abortaba el resto:
    // los contadores ya se habían pintado, pero «Stock crítico» y «Vehículos en taller»
    // no llegaban a mostrarse nunca. Medido con una sesión real de técnico.
    const intentar = async (etiqueta, fn) => {
      try {
        return await fn();
      } catch (e) {
        // Se registra en vez de tragarse el error en silencio, que es lo que hacía antes.
        const denegado = String(e?.code || e?.message || "").includes("permission");
        console.warn(`Dashboard: no se pudo cargar «${etiqueta}»`, denegado ? "(sin permiso para este rol)" : e);
        return null;
      }
    };

    (async () => {
      // `recepciones` se lee UNA vez. El código anterior la pedía cuatro veces —tres de
      // ellas idénticas— y de ahí salían tres descargas completas de la colección por cada
      // visita al panel.
      const [clientesSnap, recepcionesSnap] = await Promise.all([
        intentar("clientes", () => getDocs(query(collection(db, "users"), where("user_role", "==", "Cliente")))),
        intentar("recepciones", () => getDocs(collection(db, "recepciones"))),
      ]);
      if (!vivo) return;

      const recepciones = recepcionesSnap ? recepcionesSnap.docs.map((d) => d.data()) : [];
      const noFinalizadas = recepciones.filter((r) => r.status && r.status !== "Finalizado");

      setStats({
        clientes: clientesSnap?.size ?? 0,
        diagnosticos: recepciones.filter((r) => r.status === "Diagnóstico").length,
        trabajosEnProceso: noFinalizadas.length,
        cotizaciones: recepciones.length,
      });

      setTaller(
        noFinalizadas
          .slice(0, 8)
          .map((r) => ({ placa: r.placa || "", cliente: r.nombre_cliente || r.Razon_social || "", estado: r.status || "" }))
          .filter((v) => v.placa)
      );

      // Stock crítico: solo los primeros, y ordenados por stock.
      //
      // La consulta traía TODOS los artículos sin existencias: 9,1 MB en cada carga del
      // panel, para pintar ocho filas. Con `orderBy` sobre el mismo campo de la desigualdad
      // y un `limit`, no hace falta índice compuesto y baja a unos pocos kilobytes.
      if (verStock) {
        const stockSnap = await intentar("stock crítico", () =>
          getDocs(query(collection(db, "Articles"), where("Stock", "<=", 0), orderBy("Stock"), limit(10)))
        );
        if (!vivo) return;
        if (stockSnap) {
          setStock(
            stockSnap.docs
              .map((d) => ({ nombre: d.data().Nombre_name || "", stock: d.data().Stock ?? 0 }))
              .filter((a) => a.nombre)
          );
        }
      }

      // Las ventas solo se piden si el rol puede verlas. Pedirlas siempre significaba una
      // consulta condenada al 403 para media plantilla.
      if (verVentas) {
        // «Ventas de la semana» ahora es de verdad de la semana, y cuenta todo lo que se
        // vende.
        //
        // Antes agrupaba por día de la semana TODO el histórico, sin filtrar por fecha: el
        // gráfico decía «semana» y enseñaba lo de siempre. Y solo miraba
        // `FacturasVentasCompras` —la venta de mostrador—, dejando fuera la facturación del
        // taller, que vive en `Facturas` y es el grueso del negocio. Al gerente, que es el
        // único que ve este panel, le faltaba justo la mitad grande.
        const [mostrador, taller] = await Promise.all([
          intentar("ventas de mostrador", () =>
            getDocs(query(
              collection(db, "FacturasVentasCompras"),
              where("tipofactura", "in", ["Factura", "Boleta"]),
              where("TipoOperacion", "==", "venta"),
            ))
          ),
          intentar("ventas de taller", () =>
            getDocs(query(collection(db, "Facturas"), where("tipofactura", "in", ["Factura", "Boleta"])))
          ),
        ]);
        if (!vivo) return;

        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setHours(0, 0, 0, 0);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());   // domingo de esta semana

        const dayTotals = new Array(7).fill(0);
        const acumular = (snap) => {
          if (!snap) return;
          snap.docs.forEach((d) => {
            const x = d.data();
            if (x.anulado === true) return;                    // un anulado no es una venta
            const cruda = x.fecha || x.Fecha;
            if (!cruda) return;
            const f = typeof cruda?.toDate === "function"
              ? cruda.toDate()
              : new Date(String(cruda).length === 10 ? `${cruda}T00:00:00` : cruda);
            if (isNaN(f.getTime()) || f < inicioSemana) return;
            dayTotals[f.getDay()] += Number(x.total ?? x.Total) || 0;
          });
        };
        acumular(mostrador);
        acumular(taller);

        setWeekly(DAYS.map((k, i) => ({ k, v: Math.round(dayTotals[i] || 0) })));
      }

      if (vivo) setCargando(false);
    })();

    return () => { vivo = false; };
  }, [verVentas, verStock]);

  return { stats, weekly, stock, taller, cargando, verVentas, verStock };
}

function StatCard({ label, value, delta, icon: Icon, tone }) {
  return (
    <div className="bg-[var(--panel)] rounded-lg p-5 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
        <div className={`p-2 rounded-lg ${tone === "accent" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="gmp-display text-3xl font-bold mt-3">{value}</p>
      {delta && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {delta > 0 ? <ArrowUpRight size={13} className="text-[var(--success)]" /> : <ArrowDownRight size={13} className="text-[var(--danger)]" />}
          <span className={delta > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{Math.abs(delta)}%</span>
          <span className="text-[var(--muted-2)]">últimos 30 días</span>
        </div>
      )}
    </div>
  );
}

function MiniBars({ data }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full rounded-t-sm bg-[var(--accent)] border-x border-t border-[var(--accent-border)]" style={{ height: `${(d.v / max) * 100}%`, minHeight: 4 }} />
          <span className="text-[10px] text-[var(--muted-2)] gmp-mono">{d.k}</span>
        </div>
      ))}
    </div>
  );
}

const ACCESOS = [
  { etiqueta: "Nueva cotización", ruta: "/va-cotizacion/nuevo" },
  { etiqueta: "Ver inventario", ruta: "/al-articulos" },
  { etiqueta: "Recepcionar vehículo", ruta: "/vs-orden/nuevo" },
  { etiqueta: "Cuentas por cobrar", ruta: "/cb-cobrar" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const rol = getSession()?.userRole || "";
  const { stats, weekly, stock, taller, cargando, verVentas, verStock } = useDashboardData(rol);

  // Los atajos se filtran por el mismo criterio que el menú lateral. Antes se mostraban los
  // cuatro a todo el mundo, así que un técnico pulsaba «Cuentas por cobrar» y aterrizaba en
  // «Esta sección no te corresponde».
  const accesos = ACCESOS.filter((a) => puedeVerRuta(rol, a.ruta));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[var(--muted)] gmp-mono">SISTEMA · GM PARTS · TALLER &amp; INVENTARIO</p>
          <h1 className="gmp-display text-2xl font-bold mt-1">Bienvenido de vuelta</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Clientes" value={stats.clientes} icon={Users} tone="accent" />
        <StatCard label="Diagnósticos" value={stats.diagnosticos} icon={Gauge} />
        <StatCard label="Trabajos en proceso" value={stats.trabajosEnProceso} icon={Wrench} />
        <StatCard label="Cotizaciones" value={stats.cotizaciones} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {verVentas && (
          <div className="col-span-2 bg-[var(--panel)] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="gmp-display font-semibold text-sm">Ventas de la semana</h3>
            </div>
            {weekly.length > 0
              ? <MiniBars data={weekly} />
              : <p className="text-sm text-[var(--muted)] py-8 text-center">{cargando ? "Cargando…" : "Sin ventas registradas esta semana."}</p>}
          </div>
        )}
        <div className={`bg-[var(--panel)] rounded-lg p-5${verVentas ? "" : " col-span-3"}`}>
          <h3 className="gmp-display font-semibold text-sm mb-4">Accesos rápidos</h3>
          <div className="flex flex-col gap-2">
            {accesos.map((a) => (
              <button key={a.ruta} onClick={() => navigate(a.ruta)} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
                {a.etiqueta} <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid gap-4 mt-4 ${verStock ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* La tarjeta de stock solo se pinta si el rol tiene almacén. Para un técnico se
            quedaba vacía para siempre, que es peor que no estar. */}
        {verStock && (
          <div className="bg-[var(--panel)] rounded-lg p-5">
            <h3 className="gmp-display font-semibold text-sm mb-3">Stock crítico</h3>
            <div className="flex flex-col gap-2">
              {stock.length === 0
                ? <p className="text-sm text-[var(--muted)]">{cargando ? "Cargando…" : "Sin artículos por debajo del mínimo."}</p>
                : stock.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{a.nombre}</span>
                      <Badge tone={a.stock === 0 ? "danger" : "amber"}>{a.stock} und.</Badge>
                    </div>
                  ))}
            </div>
          </div>
        )}
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Vehículos en taller</h3>
          <div className="flex flex-col gap-2">
            {taller.length === 0
              ? <p className="text-sm text-[var(--muted)]">{cargando ? "Cargando…" : "No hay vehículos en taller."}</p>
              : taller.map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="gmp-mono">{o.placa}</span>
                    <span className="text-[var(--muted)] flex-1 px-3 truncate">{o.cliente}</span>
                    <Badge tone={o.estado === "Reparación" ? "info" : "amber"}>{o.estado}</Badge>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
