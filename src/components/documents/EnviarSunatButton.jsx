import { useState } from "react";
import { Send } from "lucide-react";
import * as db from "../../store/db";

// Botón stub de envío a SUNAT (Fase B). El envío real es backend (Fase C);
// aquí solo marca el estado del documento en el store.
export default function EnviarSunatButton({ docKey, id, estadoActual, onDone }) {
  const [enviando, setEnviando] = useState(false);
  const yaEnviado = estadoActual === "Registrado";

  const enviar = () => {
    setEnviando(true);
    db.setEstadoFactura(docKey, id, "Registrado");
    setEnviando(false);
    if (onDone) onDone();
  };

  if (yaEnviado) {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Registrado</span>;
  }
  return (
    <button onClick={enviar} disabled={enviando} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]" title="Enviar a SUNAT">
      <Send size={15} />
    </button>
  );
}
