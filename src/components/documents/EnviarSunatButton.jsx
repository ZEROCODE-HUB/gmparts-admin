import { useState } from "react";
import { Send, XCircle, Loader } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";

export default function EnviarSunatButton({ docKey, id, estadoActual, onDone }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const yaEnviado = estadoActual === "Registrado" || estadoActual === "Aceptado";

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

  if (yaEnviado) {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Registrado</span>;
  }

  if (resultado === "ok") {
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Enviado</span>;
  }

  return (
    <button onClick={enviar} disabled={enviando} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]" title="Enviar a SUNAT">
      {enviando ? <Loader size={15} className="animate-spin" /> : resultado === "error" ? <XCircle size={15} className="text-[var(--danger)]" /> : <Send size={15} />}
    </button>
  );
}
