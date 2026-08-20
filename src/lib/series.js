// Series por defecto de cada tipo de comprobante.
//
// SUNAT exige un formato concreto: una letra que depende del tipo (F factura, B boleta,
// T guía de remisión) seguida de 3 caracteres alfanuméricos. En Firestore hay documentos
// guardados con series como "111", "123123" o vacías, que serían rechazadas — venían de
// escribirlas a mano en un campo libre.
//
// PENDIENTE DE CONFIRMAR CON FACTILIZA: estas son las series convencionales. Antes de
// emitir en producción hay que confirmar cuáles están realmente autorizadas para el RUC
// de GM Parts, porque emitir con una serie no autorizada es rechazo seguro.
export const SERIE_POR_DEFECTO = {
  "va-factura": "F001",
  "va-boleta": "B001",
  "va-cotizacion": "C001",
  "va-guia": "T001",
  "va-notacredito": "FC01",
  "vs-factura": "F001",
  "vs-boleta": "B001",
  "vs-cotizacion": "C001",
  "vs-notas": "NV01",
  "al-notaventa": "NV01",
  // Las compras son documentos que EMITE el proveedor: su serie se copia del papel que
  // llega, no la genera GM Parts. Por eso no llevan valor por defecto.
};

// Series del entorno de PRUEBAS.
//
// El token de QA no es de GM Parts: es de otro proyecto (AD360), y en su cuenta las series
// F001/B001 ya estan usadas con correlativos altos. Emitir un ensayo con F001-1 devuelve
// «ya existe» y el documento se queda atascado sin haberse declarado nada. Factiliza indico
// usar F066/B066 para estas pruebas, que estan libres.
//
// Solo afecta al modo pruebas: las series reales de produccion siguen siendo las de arriba,
// y siguen pendientes de que Factiliza confirme cuales autoriza para el RUC de GM Parts.
const SERIE_PRUEBAS = {
  "va-factura": "F066",
  "va-boleta": "B066",
  "va-notacredito": "FC66",
  "vs-factura": "F066",
  "vs-boleta": "B066",
};

export function serieSugerida(docKey) {
  if (esModoPruebas() && SERIE_PRUEBAS[docKey]) return SERIE_PRUEBAS[docKey];
  return SERIE_POR_DEFECTO[docKey] || "";
}

// Formato que exige SUNAT: letra inicial según el tipo + 3 alfanuméricos.
const INICIAL_POR_TIPO = { factura: "F", boleta: "B", guia: "T", notacredito: "F" };

export function validarSerie(docKey, serie) {
  const s = String(serie || "").trim().toUpperCase();
  if (!esDocumentoFiscal(docKey)) return "";
  if (!s) return "Falta la serie.";
  if (!/^[A-Z][A-Z0-9]{3}$/.test(s)) {
    return `«${s}» no es una serie válida: SUNAT exige una letra y 3 caracteres más (por ejemplo F001).`;
  }
  const tipo = Object.keys(INICIAL_POR_TIPO).find((t) => docKey.endsWith(t));
  const inicial = INICIAL_POR_TIPO[tipo];
  if (inicial && s[0] !== inicial) {
    return `Una ${tipo} debe llevar serie que empiece por «${inicial}», no por «${s[0]}».`;
  }
  return "";
}

// Solo estos se declaran ante SUNAT. Cotizaciones, notas de venta y órdenes de trabajo son
// documentos internos: numeración libre y sin consecuencias fiscales.
const FISCALES = new Set([
  "va-factura", "va-boleta", "va-notacredito", "va-guia",
  "vs-factura", "vs-boleta",
]);

export function esDocumentoFiscal(docKey) {
  return FISCALES.has(docKey);
}

// Modo de facturación. Es la MISMA decisión que toma el backend con FACTILIZA_MODO; se
// expone aquí para que la numeración de prueba no queme correlativos reales. Que los dos
// valores puedan desincronizarse es un riesgo asumido y cubierto: cada documento guarda de
// qué contador salió (`correlativoDe`) y el backend se niega a declarar en producción un
// número que salió del contador de pruebas.
export function esModoPruebas() {
  const modo = import.meta.env?.VITE_FACTILIZA_MODO;
  // Por defecto pruebas: equivocarse hacia el lado seguro es no emitir de verdad.
  return String(modo || "pruebas").toLowerCase() !== "produccion";
}

// Clave del contador en LastCode.
//
// SUNAT exige numeración continua DENTRO de cada serie, no por tipo de documento: si
// mañana se usan F001 y F002 a la vez, un contador por «factura» dejaría huecos en ambas.
// Por eso la clave es la serie. Los documentos internos siguen contando por docKey, que
// para ellos es lo natural.
export function claveCorrelativo(docKey, serie) {
  if (!esDocumentoFiscal(docKey)) return docKey;
  const s = String(serie || serieSugerida(docKey) || "").trim().toUpperCase();
  return esModoPruebas() ? "PRUEBA-" + s : s;
}
