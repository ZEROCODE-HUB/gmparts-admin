import { useState } from "react";
import { Send, XCircle, Flag } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";

export default function EnviarSunatButton({ docKey, id, estadoActual, onDone }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const yaRechazado = estadoActual === "Rechazado";
  const yaAceptado = estadoActual === "Registrado" || estadoActual === "Aceptado";

  const enviar = async () => {
    setEnviando(true);
    setResultado(null);
    try {
      const sendToSunat = httpsCallable(functions, "sendToSunat");
      const res = await sendToSunat({ collection: docKey, docId: id });
      const data = res.data;
      setResultado(data.sunatSuccess ? "ok" : "error");
      if (data.sunatSuccess && onDone) onDone();
    } catch (e) {
      setResultado("error");
      console.error("Error al enviar a SUNAT:", e);
    }
    setEnviando(false);
  };

  if (yaAceptado) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Flag size={12} /> Registrado
      </span>
    );
  }

  if (yaRechazado) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <Flag size={12} /> Rechazado
      </span>
    );
  }

  if (resultado === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Flag size={12} /> Enviado
      </span>
    );
  }

  return (
    <button onClick={enviar} disabled={enviando} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]" title="Enviar a SUNAT">
      {enviando ? <div className="gmp-spinner" /> : resultado === "error" ? <XCircle size={15} className="text-[var(--danger)]" /> : <Send size={15} />}
    </button>
  );
}
