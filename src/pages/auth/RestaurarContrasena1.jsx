import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";

export default function RestaurarContrasena1() {
  const navigate = useNavigate();
  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <h2 className="gmp-display text-xl font-semibold mb-6">Restaurar contraseña</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Paso 1: Ingresa tu correo electrónico para recibir un código de verificación.</p>
        <div className="flex flex-col gap-4">
          <Field label="Correo electrónico">
            <input className={inputCls} placeholder="correo@gmparts.com" />
          </Field>
        </div>
        <Btn className="w-full justify-center mt-4" onClick={() => navigate("/restaurar-contrasena-2")}>Enviar código</Btn>
        <button onClick={() => navigate("/login")} className="w-full text-center text-xs text-[var(--muted)] mt-3 hover:text-[var(--text)]">Volver al inicio</button>
      </div>
    </div>
  );
}
