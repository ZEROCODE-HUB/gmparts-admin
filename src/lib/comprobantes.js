// Punto único de llamada a las acciones sobre comprobantes electrónicos.
//
// Cada acción (previsualizar anulación, anular, descargar el PDF/XML oficiales) tiene su
// propia Cloud Function, que es lo natural. Pero desplegarlas requiere escribir la
// política de invocador en IAM, permiso que la cuenta de despliegue todavía no tiene: las
// funciones existen y devuelven 403 antes de ejecutar una sola línea.
//
// Para que la anulación no quede inservible por un tema de permisos, todo pasa de momento
// por `sendToSunat`, que sí tiene política de invocador porque la creó el dueño del
// proyecto. En el backend las tres acciones comparten exactamente el mismo código que los
// callables individuales, así que el día que se conceda el rol basta con poner
// USAR_CALLABLES_DIRECTOS = true y redesplegar. Nada más cambia.
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const USAR_CALLABLES_DIRECTOS = false;

const NOMBRE_DIRECTO = {
  previsualizarAnulacion: "previsualizarAnulacion",
  anular: "anularComprobante",
  descargar: "descargarComprobante",
};

export async function llamarComprobantes(accion, payload) {
  if (USAR_CALLABLES_DIRECTOS && NOMBRE_DIRECTO[accion]) {
    const fn = httpsCallable(functions, NOMBRE_DIRECTO[accion]);
    const res = await fn(payload);
    return res.data;
  }
  const fn = httpsCallable(functions, "sendToSunat");
  const res = await fn({ ...payload, accion });
  return res.data;
}
