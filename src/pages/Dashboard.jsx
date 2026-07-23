import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Gauge, Wrench, ClipboardList, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Badge from "../components/ui/Badge";
import { dashboardStats as seedStats, weeklySales as seedWeekly, stockCritico as seedStock, vehiculosTaller as seedVehiculos } from "../mock/seed.dashboard";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];

function useDashboardData() {
  const [stats, setStats] = useState(seedStats);
  const [weekly, setWeekly] = useState(seedWeekly);
  const [stock, setStock] = useState(seedStock);
  const [taller, setTaller] = useState(seedVehiculos);

  useEffect(() => {
    (async () => {
      try {
        const [userSnap, diagSnap, enProcesoSnap, cotSnap, stockSnap, tallerSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("user_role", "==", "Cliente"))),
          getDocs(query(collection(db, "recepciones"), where("status", "==", "Diagn\u00f3stico"))),
          getDocs(query(collection(db, "recepciones"))),
          getDocs(collection(db, "recepciones")),
          getDocs(query(collection(db, "Articles"), where("Stock", "<=", 0))),
          getDocs(query(collection(db, "recepciones"))),
        ]);

        const diagCount = diagSnap.size;
        const totalRecepciones = cotSnap.size;
        const enProceso = enProcesoSnap.docs.filter(d => {
          const s = d.data().status;
          return s && s !== "Finalizado";
        }).length;

        setStats({
          clientes: userSnap.size || 0,
          diagnosticos: diagCount,
          trabajosEnProceso: enProceso,
          cotizaciones: totalRecepciones,
        });

        // Ventas semanales desde FacturasVentasCompras
        const ventasSnap = await getDocs(query(
          collection(db, "FacturasVentasCompras"),
          where("tipofactura", "in", ["Factura", "Boleta"]),
          where("TipoOperacion", "==", "venta"),
        ));
        const dayTotals = new Array(7).fill(0);
        ventasSnap.docs.forEach(d => {
          const f = d.data().fecha;
          if (f) {
            const day = new Date(f).getDay();
            dayTotals[day] += Number(d.data().total) || 0;
          }
        });
        if (dayTotals.some(v => v > 0)) {
          setWeekly(DAYS.map((k, i) => ({ k, v: Math.round(dayTotals[i] || 0) })));
        }

        // Stock crítico
        const stockItems = stockSnap.docs.map(d => ({
          nombre: d.data().Nombre_name || "",
          stock: d.data().Stock ?? 0,
        })).filter(a => a.nombre);
        if (stockItems.length > 0) setStock(stockItems);

        // Vehículos en taller (recepciones no finalizadas)
        const enTaller = tallerSnap.docs
          .filter(d => { const s = d.data().status; return s && s !== "Finalizado"; })
          .slice(0, 8)
          .map(d => ({
            placa: d.data().placa || "",
            cliente: d.data().nombre_cliente || d.data().Razon_social || "",
            estado: d.data().status || "",
          }))
          .filter(v => v.placa);
        if (enTaller.length > 0) setTaller(enTaller);
      } catch { /* fallback a seed data */ }
    })();
  }, []);

  return { stats, weekly, stock, taller };
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, weekly, stock, taller } = useDashboardData();

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
        <div className="col-span-2 bg-[var(--panel)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="gmp-display font-semibold text-sm">Ventas de la semana</h3>
          </div>
          <MiniBars data={weekly} />
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-4">Accesos rápidos</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate("/va-cotizacion/nuevo")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Nueva cotización <ChevronRight size={14} />
            </button>
            <button onClick={() => navigate("/al-articulos")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Ver inventario <ChevronRight size={14} />
            </button>
            <button onClick={() => navigate("/vs-orden/nuevo")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Recepcionar vehículo <ChevronRight size={14} />
            </button>
            <button onClick={() => navigate("/cb-cobrar")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Cuentas por cobrar <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Stock crítico</h3>
          <div className="flex flex-col gap-2">
            {stock
              .filter((a) => a.stock < 50)
              .map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{a.nombre}</span>
                  <Badge tone={a.stock === 0 ? "danger" : "amber"}>{a.stock} und.</Badge>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Vehículos en taller</h3>
          <div className="flex flex-col gap-2">
            {taller.map((o, i) => (
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
