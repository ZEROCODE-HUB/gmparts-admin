import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";
import { login } from "../../store/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    navigate("/dashboard");
  };

  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="GM Parts" className="w-10 h-10 object-contain" />
          <div>
            <p className="gmp-display font-bold text-lg leading-none">GM<span className="text-[var(--accent)]">PARTS</span></p>
            <p className="text-[10px] text-[var(--muted)] gmp-mono tracking-wide">TALLER · INVENTARIO</p>
          </div>
        </div>
        <h2 className="gmp-display text-xl font-semibold mb-6">Iniciar sesión</h2>
        <div className="flex flex-col gap-4">
          <Field label="Correo electrónico">
            <input className={inputCls} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="admin@gmparts.com" />
          </Field>
          <Field label="Contraseña">
            <input type="password" className={inputCls} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Ingrese contraseña" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </Field>
        </div>
        {error && <p className="text-sm text-[var(--danger)] mt-3">{error}</p>}
        <button onClick={() => navigate("/restaurar-contrasena-1")} className="text-xs text-[var(--accent)] mt-3 hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
        <Btn className="w-full justify-center mt-6" onClick={handleLogin} disabled={loading}>{loading ? "Iniciando sesión..." : "Iniciar sesión"}</Btn>
        <p className="text-[11px] text-[var(--muted)] mt-4 text-center">Demo: admin@gmparts.com / admin123</p>
      </div>
    </div>
  );
}
