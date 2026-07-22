import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/login"), 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="gmp-root min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 gmp-fade-in">
        <img src="/logo.png" alt="GM Parts" className="w-16 h-16 object-contain" />
        <p className="gmp-display font-bold text-xl">GM<span className="text-[var(--accent)]">PARTS</span></p>
        <p className="text-xs text-[var(--muted)]">Cargando...</p>
      </div>
    </div>
  );
}
