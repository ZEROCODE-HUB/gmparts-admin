import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronDown, LogOut } from "lucide-react";
import { getSession, logout } from "../../store/auth";

export default function Topbar() {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 flex items-center justify-end px-6 gap-4 sticky top-0 bg-[var(--bg)] z-30">
      <button className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg bg-[var(--panel)] hover:bg-[var(--surface-2)]">
        <Settings size={14} /> Configuración <ChevronDown size={13} />
      </button>
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[var(--panel)] hover:bg-[var(--surface-2)]">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-xs font-semibold">
            {(session?.displayName || "GM").slice(0, 2).toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <p className="text-sm">{session?.displayName || "GM Parts Admin"}</p>
            <p className="text-[10px] text-[var(--muted)] gmp-mono">{session?.userRole || "—"}</p>
          </div>
          <ChevronDown size={13} />
        </button>
        {menu && (
          <div className="absolute right-0 mt-2 w-44 bg-[var(--surface-3)] rounded-lg overflow-hidden gmp-fade-in shadow-lg border border-[var(--line-soft)]">
            <button onClick={() => { setMenu(false); navigate("/cambiar-contrasena"); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-2)]">Mi perfil</button>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-2)] text-[var(--danger)] flex items-center gap-2"><LogOut size={14} /> Cerrar sesión</button>
          </div>
        )}
      </div>
    </header>
  );
}
