import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";
import { getSession, updatePassword } from "../../store/auth";

export default function CambiarContrasena() {
  const navigate = useNavigate();
  const session = getSession();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!current || !newPass) { setError("Completa todos los campos"); return; }
    if (newPass.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (newPass !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (!session) { setError("Debes iniciar sesión"); return; }

    setLoading(true);
    const res = await updatePassword(session.uid, current, newPass);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    navigate("/dashboard");
  };

  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <h2 className="gmp-display text-xl font-semibold mb-6">Cambiar contraseña</h2>
        <div className="flex flex-col gap-4">
          <Field label="Contraseña actual">
            <input type="password" className={inputCls} value={current} onChange={(e) => { setCurrent(e.target.value); setError(""); }} placeholder="Ingrese contraseña actual" />
          </Field>
          <Field label="Nueva contraseña">
            <input type="password" className={inputCls} value={newPass} onChange={(e) => { setNewPass(e.target.value); setError(""); }} placeholder="Ingrese nueva contraseña" />
          </Field>
          <Field label="Confirmar contraseña">
            <input type="password" className={inputCls} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} placeholder="Repita la contraseña" />
          </Field>
        </div>
        {error && <p className="text-sm text-[var(--danger)] mt-3">{error}</p>}
        <Btn className="w-full justify-center mt-4" onClick={handleSave} loading={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </Btn>
      </div>
    </div>
  );
}
