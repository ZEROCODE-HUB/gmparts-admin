// Validación de documentos de identidad (SUNAT).
//
// Hasta ahora no había ninguna: la pantalla de clientes aceptaba un DNI de tres cifras sin
// rechistar, y la base lo demuestra —hay clientes con documento «123456», «1234», y una
// persona jurídica con «03021», que no es un RUC—. Eso no da problemas hasta el día en que
// se emite el comprobante: SUNAT rechaza el envío, y para entonces el dato malo lleva meses
// dentro y hay que perseguirlo hacia atrás.
//
// Los códigos de tipo son los del catálogo 06 de SUNAT, que es lo que espera Factiliza.

export const TIPO_DOC_SUNAT = {
  DNI: "1",
  CE: "4",       // carné de extranjería
  RUC: "6",
  PASAPORTE: "7",
};

const SOLO_DIGITOS = /^\d+$/;

// Los dos primeros dígitos del RUC dicen qué clase de contribuyente es. Solo estos cinco
// están en uso: 10 y 15/16/17 son personas naturales con negocio, 20 personas jurídicas.
const PREFIJOS_RUC = ["10", "15", "16", "17", "20"];

/**
 * Comprueba un documento contra su tipo.
 * Devuelve { ok: true } o { ok: false, error: "explicación para la persona que lo teclea" }.
 */
export function validarDocumento(tipo, valor) {
  const v = String(valor ?? "").trim();
  const t = String(tipo ?? "").trim().toUpperCase();

  if (!v) return { ok: false, error: "Falta el número de documento." };

  if (t === "DNI") {
    if (!SOLO_DIGITOS.test(v)) return { ok: false, error: "El DNI solo puede tener números." };
    if (v.length !== 8) return { ok: false, error: `El DNI debe tener 8 dígitos (tiene ${v.length}).` };
    return { ok: true };
  }

  if (t === "RUC") {
    if (!SOLO_DIGITOS.test(v)) return { ok: false, error: "El RUC solo puede tener números." };
    if (v.length !== 11) return { ok: false, error: `El RUC debe tener 11 dígitos (tiene ${v.length}).` };
    if (!PREFIJOS_RUC.includes(v.slice(0, 2))) {
      return { ok: false, error: `Un RUC no empieza por ${v.slice(0, 2)}. Empieza por 10, 15, 16, 17 o 20.` };
    }
    return { ok: true };
  }

  // Carné de extranjería y pasaporte: SUNAT solo limita la longitud, no el formato.
  if (t === "CE" || t === "PASAPORTE") {
    if (v.length > 12) return { ok: false, error: "Como máximo 12 caracteres." };
    return { ok: true };
  }

  return { ok: false, error: `Tipo de documento no reconocido: ${tipo}.` };
}

/**
 * Coherencia entre el tipo de persona y el tipo de documento.
 *
 * Una persona jurídica solo puede identificarse con RUC. Al revés no vale como regla: una
 * persona natural con negocio tiene RUC que empieza por 10, así que ahí no se corrige nada.
 */
export function validarTipoPersona(tipoPersona, tipoDocumento) {
  const persona = String(tipoPersona ?? "").trim();
  const doc = String(tipoDocumento ?? "").trim().toUpperCase();

  if ((persona === "Jurídica" || persona === "Juridica" || persona === "Empresa") && doc !== "RUC") {
    return { ok: false, error: "Una persona jurídica se identifica con RUC." };
  }
  return { ok: true };
}

/**
 * Las dos comprobaciones juntas, que es como se usan en los formularios.
 */
export function validarIdentidad({ tipoPersona, tipoDocumento, documento }) {
  const porTipo = validarTipoPersona(tipoPersona, tipoDocumento);
  if (!porTipo.ok) return porTipo;
  return validarDocumento(tipoDocumento, documento);
}

/**
 * Qué documento exige cada comprobante.
 *
 * Una factura solo se puede emitir a un RUC: es la regla que más veces tumba un envío a
 * SUNAT, y conviene avisar antes de emitir y no después del rechazo.
 */
export function documentoValidoParaComprobante(tipoComprobante, tipoDocumento) {
  const comp = String(tipoComprobante ?? "").toLowerCase();
  const doc = String(tipoDocumento ?? "").trim().toUpperCase();

  if (comp.includes("factura")) {
    return doc === "RUC"
      ? { ok: true }
      : { ok: false, error: "Una factura solo se emite a un cliente con RUC. Para DNI, emite boleta." };
  }
  return { ok: true };
}
