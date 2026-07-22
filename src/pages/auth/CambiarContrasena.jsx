import { useNavigate } from "react-router-dom";
import Field, { inputCls } from "../../components/ui/Field";
import Btn from "../../components/ui/Btn";

export default function CambiarContrasena() {
  const navigate = useNavigate();
  return (
    <div className="gmp-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-lg p-8 gmp-fade-in">
        <h2 className="gmp-display text-xl font-semibold mb-6">Cambiar contraseña</h2>
        <div className="flex flex-col gap-4">
          <Field label="Contraseña actual">
            <input type="password" className={inputCls} placeholder="Ingrese contraseña actual" />
          </Field>
          <Field label="Nueva contraseña">
            <input type="password" className={inputCls} placeholder="Ingrese nueva contraseña" />
          </Field>
          <Field label="Confirmar contraseña">
            <input type="password" className={inputCls} placeholder="Repita la contraseña" />
          </Field>
        </div>
        <Btn className="w-full justify-center mt-4" onClick={() => navigate("/dashboard")}>Guardar cambios</Btn>
      </div>
    </div>
  );
}
