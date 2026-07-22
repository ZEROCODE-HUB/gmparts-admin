import { Construction } from "lucide-react";

export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Construction size={48} className="text-[var(--muted-2)] mb-4" />
      <h2 className="gmp-display text-lg font-semibold text-[var(--muted)] mb-2">Módulo en definición</h2>
      <p className="text-sm text-[var(--muted-2)]">{title || "Esta pantalla estará disponible próximamente."}</p>
    </div>
  );
}
