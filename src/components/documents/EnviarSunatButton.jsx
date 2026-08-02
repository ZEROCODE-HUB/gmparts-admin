import { useState } from "react";
import { Send, XCircle, Flag } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { showToast } from "../ui/Toast";

export default function EnviarSunatButton({ docKey, id, estadoActual, onDone }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const yaRechazado = estadoActual === "Rechazado";
  const yaAceptado = estadoActual === "Registrado" || estadoActual === "Aceptado";

  const enviar = async () => {
    setEnviando(true);
    setResultado(null);
    setErrorMsg("");
    try {
      const sendToSunat = httpsCallable(functions, "sendToSunat");
      const res = await sendToSunat({ collection: docKey, docId: id });
      const data = res.data || {};
      if (data.sunatSuccess) {
        setResultado("ok");
        showToast(data.message || "Documento validado correctamente en SUNAT", "success");
        if (onDone) onDone();
      } else {
        const msg = data.message || "SUNAT rechazó el documento";
        setResultado("error");
        setErrorMsg(msg);
        showToast("SUNAT: " + msg, "error");
      }
    } catch (e) {
      const msg = e?.message || "No se pudo conectar con el servicio de SUNAT";
      setResultado("error");
      setErrorMsg(msg);
      showToast("SUNAT: " + msg, "error");
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

  if (resultado === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Flag size={12} /> Enviado
      </span>
    );
  }

  // Un documento rechazado sigue siendo reenviable: se muestra el estado junto al botón.
  const fallo = resultado === "error";
  return (
    <span className="inline-flex items-center gap-1">
      {yaRechazado && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          <Flag size={12} /> Rechazado
        </span>
      )}
      <button
        onClick={enviar}
        disabled={enviando}
        className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]"
        title={fallo ? `Reintentar envío a SUNAT — ${errorMsg}` : yaRechazado ? "Reintentar envío a SUNAT" : "Enviar a SUNAT"}
      >
        {enviando ? <div className="gmp-spinner" /> : fallo ? <XCircle size={15} className="text-[var(--danger)]" /> : <Send size={15} />}
      </button>
    </span>
  );
}
