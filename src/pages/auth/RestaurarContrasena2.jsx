import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";

export default function RestaurarContrasena2() {
  const navigate = useNavigate();
  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <h2 className="gmp-display text-xl font-semibold mb-6">Verificar código</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Paso 2: Ingresa el código de verificación que enviamos a tu correo.</p>
        <div className="flex flex-col gap-4">
          <Field label="Código de verificación">
            <input className={inputCls} placeholder="000000" />
          </Field>
        </div>
        <Btn className="w-full justify-center mt-4" onClick={() => navigate("/restaurar-contrasena-3")}>Verificar</Btn>
        <button onClick={() => navigate("/login")} className="w-full text-center text-xs text-[var(--muted)] mt-3 hover:text-[var(--text)]">Volver al inicio</button>
      </div>
    </div>
  );
}
