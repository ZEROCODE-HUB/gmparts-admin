import { useState } from "react";
import { Send, XCircle, Flag, FlaskConical, Download, Mail } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { llamarComprobantes } from "../../lib/comprobantes";
import { showToast } from "../ui/Toast";

// Estados que puede tener un documento frente a SUNAT. `Rechazado` con código numérico
// es definitivo: SUNAT juzgó los datos y reenviarlo da lo mismo, hay que corregirlo.
// El resto sí admite reintento (y el backend decide si va por /send o por /resend).
export default function EnviarSunatButton({ docKey, id, estadoActual, esPrueba, reintentable, correoEnviado, onDone }) {
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [correoEnviadoA, setCorreoEnviadoA] = useState(correoEnviado || "");
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const yaAceptado = estadoActual === "Registrado" || estadoActual === "Aceptado" || resultado === "ok";
  const rechazadoDefinitivo = estadoActual === "Rechazado" && reintentable === false;

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
        // Un rechazo por datos no se arregla reintentando: se dice explícitamente.
        showToast(
          data.reintentable === false
            ? `SUNAT rechazó el documento y hay que corregirlo: ${msg}`
            : `SUNAT: ${msg}`,
          "error"
        );
        if (onDone) onDone();
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

  // El PDF y el XML oficiales los emite Factiliza: el PDF que genera el sistema no
  // lleva el QR ni el hash que SUNAT exige, y legalmente el comprobante es el XML.
  const descargarOficial = async () => {
    setDescargando(true);
    try {
      const res = await llamarComprobantes("descargar", { collection: docKey, docId: id });
      const url = res?.pdfUrl || res?.xmlUrl;
      if (url) {
        window.open(url, "_blank", "noopener");
        showToast("Comprobante oficial descargado", "success");
      } else {
        showToast("Factiliza no devolvió el comprobante", "error");
      }
    } catch (e) {
      showToast("No se pudo traer el comprobante oficial: " + (e?.message || ""), "error");
    }
    setDescargando(false);
  };

  // Cierra el ciclo: emitido, aceptado y en manos del cliente. Van el PDF y el XML, porque
  // el comprobante legalmente es el XML firmado y su contador lo necesita.
  const enviarAlCliente = async () => {
    setEnviandoCorreo(true);
    try {
      const res = await llamarComprobantes("enviarPorCorreo", { collection: docKey, docId: id });
      setCorreoEnviadoA(res?.destino || "");
      showToast(res?.message || "Comprobante enviado al cliente", "success");
      if (onDone) onDone();
    } catch (e) {
      showToast("No se pudo enviar el comprobante: " + (e?.message || ""), "error");
    }
    setEnviandoCorreo(false);
  };

  if (yaAceptado) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${esPrueba ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}
          title={esPrueba ? "Emitido en el entorno de pruebas: no tiene valor fiscal" : "Aceptado por SUNAT"}>
          {esPrueba ? <FlaskConical size={12} /> : <Flag size={12} />} {esPrueba ? "Prueba" : "Registrado"}
        </span>
        <button
          onClick={descargarOficial}
          disabled={descargando}
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]"
          title="Descargar PDF y XML oficiales de SUNAT"
        >
          {descargando ? <div className="gmp-spinner" /> : <Download size={15} />}
        </button>
        <button
          onClick={enviarAlCliente}
          disabled={enviandoCorreo}
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]"
          title={correoEnviadoA ? `Ya enviado a ${correoEnviadoA} — pulsa para reenviar` : "Enviar el comprobante al cliente por correo"}
        >
          {enviandoCorreo ? <div className="gmp-spinner" /> : <Mail size={15} className={correoEnviadoA ? "text-green-600" : ""} />}
        </button>
      </span>
    );
  }

  const fallo = resultado === "error" || estadoActual === "Rechazado" || estadoActual === "Error" || estadoActual === "No autorizado";
  const titulo = rechazadoDefinitivo
    ? `Rechazado por SUNAT — corrige el documento antes de reenviar. ${errorMsg}`
    : fallo
      ? `Reintentar envío a SUNAT — ${errorMsg || estadoActual}`
      : "Enviar a SUNAT";

  return (
    <span className="inline-flex items-center gap-1">
      {estadoActual && estadoActual !== "Aceptado" && (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${rechazadoDefinitivo ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
          <Flag size={12} /> {estadoActual}
        </span>
      )}
      <button
        onClick={enviar}
        disabled={enviando}
        className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)]"
        title={titulo}
      >
        {enviando ? <div className="gmp-spinner" /> : fallo ? <XCircle size={15} className="text-[var(--danger)]" /> : <Send size={15} />}
      </button>
    </span>
  );
}
