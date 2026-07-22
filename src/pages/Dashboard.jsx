import { useNavigate } from "react-router-dom";
import { Users, Gauge, Wrench, ClipboardList, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Badge from "../components/ui/Badge";
import { dashboardStats, weeklySales, stockCritico, vehiculosTaller } from "../mock/seed.dashboard";

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

  const go = (path) => {
    navigate(path);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[var(--muted)] gmp-mono">SISTEMA · GM PARTS · TALLER &amp; INVENTARIO</p>
          <h1 className="gmp-display text-2xl font-bold mt-1">Bienvenido de vuelta</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Clientes" value={dashboardStats.clientes} delta={8} icon={Users} tone="accent" />
        <StatCard label="Diagnósticos" value={dashboardStats.diagnosticos} delta={12} icon={Gauge} />
        <StatCard label="Trabajos en proceso" value={dashboardStats.trabajosEnProceso} delta={-3} icon={Wrench} />
        <StatCard label="Cotizaciones" value={dashboardStats.cotizaciones} delta={5} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[var(--panel)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="gmp-display font-semibold text-sm">Ventas de la semana</h3>
            <Badge tone="accent">+18% vs. semana anterior</Badge>
          </div>
          <MiniBars data={weeklySales} />
        </div>
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-4">Accesos rápidos</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => go("/va-cotizacion/nuevo")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Nueva cotización <ChevronRight size={14} />
            </button>
            <button onClick={() => go("/al-articulos")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Ver inventario <ChevronRight size={14} />
            </button>
            <button onClick={() => go("/vs-orden/nuevo")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Recepcionar vehículo <ChevronRight size={14} />
            </button>
            <button onClick={() => go("/cb-cobrar")} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[var(--panel-2)] hover:bg-[var(--accent-dim)]">
              Cuentas por cobrar <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-[var(--panel)] rounded-lg p-5">
          <h3 className="gmp-display font-semibold text-sm mb-3">Stock crítico</h3>
          <div className="flex flex-col gap-2">
            {stockCritico
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
            {vehiculosTaller.map((o, i) => (
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
