import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";

export default function RestaurarContrasena3() {
  const navigate = useNavigate();
  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <h2 className="gmp-display text-xl font-semibold mb-6">Nueva contraseña</h2>
        <p className="text-sm text-[var(--muted)] mb-4">Paso 3: Ingresa tu nueva contraseña.</p>
        <div className="flex flex-col gap-4">
          <Field label="Nueva contraseña">
            <input type="password" className={inputCls} placeholder="Ingrese nueva contraseña" />
          </Field>
          <Field label="Confirmar contraseña">
            <input type="password" className={inputCls} placeholder="Repita la contraseña" />
          </Field>
        </div>
        <Btn className="w-full justify-center mt-4" onClick={() => navigate("/login")}>Cambiar contraseña</Btn>
      </div>
    </div>
  );
}
