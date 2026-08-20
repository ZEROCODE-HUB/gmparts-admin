// Helpers puros para la integracion con Factiliza (emision electronica SUNAT).
// Separados de index.js para poder probarlos sin inicializar firebase-admin.
//
// Todo lo marcado como «verificado» en este archivo se comprobo contra la API real
// (sondeo del 2026-08-16 con RUC emisor inexistente, sin emitir comprobantes):
//   - apife.factiliza.com  -> 401 con el token actual (no autoriza produccion)
//   - apife-qa.factiliza.com -> 200 con el RUC de pruebas 10749283781
//   - /invoice/resend, /invoice/pdf, /invoice/xml y /despatch/send existen
//   - /invoice/cdr NO existe en QA (404)

// Factiliza tiene un host por entorno. Apuntar siempre a produccion, como se hacia
// antes, provoca 401 mientras el RUC del emisor no este dado de alta alli.
const FACTILIZA_HOSTS = {
  produccion: "https://apife.factiliza.com/api/v1",
  pruebas: "https://apife-qa.factiliza.com/api/v1",
};

// RUC del emisor. En el entorno de pruebas el unico dado de alta es el de Factiliza:
// mandar el propio devuelve «Su usuario no se encuentra configurado para el RUC».
const RUC_EMPRESA = "20601720621";
const RUC_EMPRESA_PRUEBAS = "10749283781";

// Compatibilidad: la constante que usaba el codigo anterior.
const FACTILIZA_API = FACTILIZA_HOSTS.produccion;

function apiBase(esPrueba) {
  return esPrueba ? FACTILIZA_HOSTS.pruebas : FACTILIZA_HOSTS.produccion;
}

function rucDelEmisor(esPrueba, rucPropio) {
  return esPrueba ? RUC_EMPRESA_PRUEBAS : (rucPropio || RUC_EMPRESA);
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

// ── Importe en letras ─────────────────────────────────────────────────────────
// La leyenda 1000 es obligatoria y su contenido es el importe en letras, no un texto
// libre: antes se enviaba el nombre de la empresa, que SUNAT puede observar.
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
  "VEINTE", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS",
  "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function centenasALetras(n) {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto > 0) {
    let sufijo;
    if (resto < 30) {
      sufijo = UNIDADES[resto];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      sufijo = DECENAS[d] + (u > 0 ? " Y " + UNIDADES[u] : "");
    }
    texto = texto ? texto + " " + sufijo : sufijo;
  }
  return texto;
}

function enteroALetras(n) {
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones > 0) partes.push(millones === 1 ? "UN MILLON" : centenasALetras(millones) + " MILLONES");
  if (miles > 0) partes.push(miles === 1 ? "MIL" : centenasALetras(miles) + " MIL");
  if (resto > 0) partes.push(centenasALetras(resto));
  return partes.join(" ").trim();
}

function importeEnLetras(monto, moneda = "PEN") {
  const valor = round2(Math.abs(Number(monto) || 0));
  const entero = Math.floor(valor);
  const centimos = Math.round((valor - entero) * 100);
  const nombreMoneda = moneda === "USD" ? "DOLARES AMERICANOS" : "SOLES";
  return `${enteroALetras(entero)} CON ${String(centimos).padStart(2, "0")}/100 ${nombreMoneda}`;
}

// Catálogo SUNAT 06 — Tipo de documento de identidad.
// 0 = Otros, 1 = DNI, 4 = Carnet de extranjería, 6 = RUC, 7 = Pasaporte.
function tipoDocIdentidad(tipoDoc, numDoc) {
  const t = String(tipoDoc || "").trim().toUpperCase();
  const n = String(numDoc || "").replace(/\D/g, "");

  // La FORMA del número manda sobre lo que diga el formulario cuando se contradicen.
  //
  // Un documento de 11 cifras es un RUC y uno de 8 es un DNI, se etiquete como se etiquete.
  // Hacía falta porque el formulario podía llegar con el tipo equivocado: al facturar desde
  // una Orden de Trabajo solo viajaba el número del cliente, no su tipo, y el formulario
  // conservaba su valor inicial «DNI». Una factura a un cliente con RUC se habría declarado
  // ante SUNAT como si fuera un DNI.
  if (n.length === 11) return "6";
  if (n.length === 8 && (t === "" || t === "DNI" || t === "1" || t === "RUC" || t === "6")) return "1";

  if (t === "RUC" || t === "6") return "6";
  if (t === "DNI" || t === "1") return "1";
  if (t === "CE" || t === "CARNET DE EXTRANJERIA" || t === "4") return "4";
  if (t === "PASAPORTE" || t === "PAS" || t === "7") return "7";
  if (n.length === 11) return "6";
  if (n.length === 8) return "1";
  return "0";
}

// Normaliza cualquier representación de fecha a "YYYY-MM-DDT00:00:00-05:00".
// Firestore devuelve Timestamp en los documentos creados por la app Flutter y
// String "YYYY-MM-DD" en los creados por el admin web; concatenar el Timestamp
// directamente producía "[object Object]T00:00:00-05:00" y Factiliza respondía
// 400 "The JSON value could not be converted to System.DateTime".
function toFactilizaDate(valor) {
  const pad = (n) => String(n).padStart(2, "0");
  let d = null;

  if (valor && typeof valor.toDate === "function") {
    d = valor.toDate();
  } else if (valor instanceof Date) {
    d = valor;
  } else if (valor && typeof valor === "object" && typeof valor._seconds === "number") {
    d = new Date(valor._seconds * 1000);
  } else if (typeof valor === "string") {
    const s = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T00:00:00-05:00";
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return dmy[3] + "-" + pad(dmy[2]) + "-" + pad(dmy[1]) + "T00:00:00-05:00";
    d = new Date(s);
  }

  if (!d || isNaN(d.getTime())) d = new Date();
  // Fecha calendario en hora de Lima (UTC-5), no en UTC.
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return lima.toISOString().split("T")[0] + "T00:00:00-05:00";
}

function buildDetail(items, igvIncluido) {
  return (items || []).map((it) => {
    const cantidad = Number(it.cant ?? it.cantidad ?? 1) || 1;
    const precio = Number(it.pu ?? it.precioVenta ?? 0) || 0;
    let valorUnitario, igv, valorVenta;
    if (igvIncluido) {
      valorUnitario = round2(precio / 1.18);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
    } else {
      valorUnitario = round2(precio);
      valorVenta = round2(valorUnitario * cantidad);
      igv = round2(valorVenta * 0.18);
    }
    return {
      unidad: "NIU",
      cantidad,
      cod_Producto: it.codigo || "",
      descripcion: it.descripcion || "",
      monto_Valor_Unitario: valorUnitario,
      monto_Base_Igv: valorVenta,
      porcentaje_Igv: 18,
      igv,
      tip_Afe_Igv: "10", // CADENA: numérico da "The JSON value could not be converted to System.String"
      total_Impuestos: igv,
      monto_Precio_Unitario: round2(valorUnitario * 1.18),
      monto_Valor_Venta: valorVenta,
      factor_Icbper: 0,
    };
  });
}

// Extrae un mensaje legible de las distintas formas de error de Factiliza:
// { data: { error: { message } } }, { message }, CDR de SUNAT, o validación ASP.NET
// { title, errors: { campo: ["..."] } }.
function extractFactilizaError(result) {
  if (!result) return "";
  const cdr = result?.data?.sunatResponse?.cdrResponse;
  const partes = [
    result?.data?.error?.message,
    cdr?.description,
    result?.data?.sunatResponse?.error?.message,
    result?.message,
    result?.title,
  ].filter((p) => typeof p === "string" && p.trim());

  if (result?.errors && typeof result.errors === "object") {
    for (const [campo, msgs] of Object.entries(result.errors)) {
      const texto = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
      partes.push(campo === "$" ? texto : campo + ": " + texto);
    }
  }
  return [...new Set(partes)].join(" | ");
}

// ── Interpretación de la respuesta ────────────────────────────────────────────
// Un rechazo de SUNAT llega con HTTP 200: mirar solo el código HTTP daría por bueno un
// documento rechazado. Lo decisivo es el codigo del error y si viene `hash`:
//   - error.code numerico (0100-4000) -> SUNAT juzgo los DATOS: rechazo definitivo,
//     reenviar da lo mismo y quema correlativo.
//   - error.code no numerico ("HTTP") -> fallo de comunicacion entre ellos y SUNAT:
//     reintentable.
//   - ademas viene `hash` -> Factiliza YA lo tiene registrado: hay que reintentar contra
//     /invoice/resend, porque /send respondera «ya existe» para siempre.
function leerRespuesta(httpStatus, body) {
  const ok = httpStatus >= 200 && httpStatus < 300;

  if (!body) {
    return {
      aceptado: false, reintentable: ok || httpStatus >= 500, usarResend: false,
      estado: httpStatus === 401 ? "No autorizado" : "Error",
      codigo: String(httpStatus), hash: null, cdrId: null,
      mensaje: httpStatus === 401
        ? "Factiliza rechazó las credenciales (401). El token no autoriza esta API: revisa que sea el de facturación y el del entorno correcto."
        : "Factiliza respondió HTTP " + httpStatus + " sin cuerpo.",
    };
  }

  const sunat = body?.data?.sunatResponse;
  const cdrId = sunat?.cdrResponse?.id ?? null;
  const hash = body?.data?.hash ?? sunat?.hash ?? null;
  const error = body?.data?.error || sunat?.error || null;
  const codigo = error?.code != null ? String(error.code) : null;
  const mensaje = extractFactilizaError(body) || "Sin detalle";

  if (ok && (sunat?.success === true || body?.success === true) && !error) {
    return { aceptado: true, reintentable: false, usarResend: false, estado: "Aceptado", codigo: null, hash, cdrId, mensaje: mensaje || "Documento aceptado por SUNAT" };
  }

  // «Este documento ya se encuentra declarado en la SUNAT» llega con HTTP 400, pero no es
  // un error: el comprobante está bien. Pasa al reprocesar algo que ya se había declarado.
  // Verificado en DEMO el 2026-08-16 al llamar a /invoice/resend sobre una factura aceptada.
  if (/ya se encuentra declarado|ya est[aá] declarado/i.test(mensaje)) {
    return {
      aceptado: true, reintentable: false, usarResend: false, estado: "Aceptado",
      codigo: null, hash, cdrId,
      mensaje: "El documento ya estaba declarado en SUNAT",
    };
  }

  const textoPendiente = /pendiente de env|en cola/i.test(mensaje);
  if (textoPendiente) {
    return { aceptado: false, reintentable: true, usarResend: false, estado: "Pendiente", codigo, hash, cdrId, mensaje };
  }

  const yaExiste = /ya existe/i.test(mensaje);
  const esCodigoDeSunat = codigo != null && /^\d+$/.test(codigo);

  // Con hash, Factiliza ya registró el documento: /send siempre dirá «ya existe».
  if (hash || yaExiste) {
    return {
      aceptado: false,
      reintentable: !esCodigoDeSunat || yaExiste,
      usarResend: true,
      estado: esCodigoDeSunat && !yaExiste ? "Rechazado" : "Registrado sin declarar",
      codigo, hash, cdrId, mensaje,
    };
  }

  if (esCodigoDeSunat) {
    // SUNAT juzgó los datos: no se reintenta, hay que corregir el documento.
    return { aceptado: false, reintentable: false, usarResend: false, estado: "Rechazado", codigo, hash, cdrId, mensaje };
  }

  return {
    aceptado: false,
    reintentable: !ok ? httpStatus >= 500 || httpStatus === 429 : true,
    usarResend: false,
    estado: httpStatus === 401 ? "No autorizado" : "Error",
    codigo: codigo || String(httpStatus), hash, cdrId, mensaje,
  };
}

// Compatibilidad con el codigo anterior.
function parseResponse(json) {
  return {
    success: json?.success === true,
    sunatSuccess: json?.data?.sunatResponse?.success === true,
    cdrId: json?.data?.sunatResponse?.cdrResponse?.id ?? null,
    message: json?.message ?? "",
    errorDetail: json?.data?.error?.message ?? "",
  };
}

// El correlativo viaja a Factiliza SIN ceros de relleno.
//
// El panel numera con 6 digitos («000001») porque asi se presenta el comprobante, pero
// Factiliza normaliza el numero: al pedir el PDF de «B066-000001» devuelve «B066-1», que
// puede ser OTRO documento. Verificado contra QA: se emitio B066-000001 por S/830 y la
// descarga devolvio el XML de B066-1, por S/10 y de otra empresa, que se guardo en Storage
// como si fuera el comprobante propio. Ese es el archivo que el boton «enviar al cliente
// por correo» le habria mandado al cliente.
//
// La ida y la vuelta tienen que hablar el mismo idioma, y el que manda es el de Factiliza.
// El numero con ceros se conserva en Firestore y en pantalla; solo cambia lo que se envia.
function correlativoParaFactiliza(numero) {
  const soloDigitos = String(numero || "").trim().replace(/\D/g, "");
  if (!soloDigitos) return String(numero || "").trim();
  return String(Number(soloDigitos));
}

// El numero del documento afectado por una nota va SIN ceros de relleno: B066-24,
// no B066-000024.
function numeroAfectadoSinCeros(referencia) {
  const texto = String(referencia || "").trim();
  if (!texto) return "";
  const partes = texto.split("-");
  if (partes.length < 2) return texto;
  const correlativo = String(Number(partes[partes.length - 1].replace(/\D/g, "")) || "");
  return partes.slice(0, -1).join("-") + "-" + correlativo;
}

function tipoDocAfectado(referencia, tipoExplicito) {
  if (tipoExplicito) return tipoExplicito;
  const serie = String(referencia || "").trim().toUpperCase();
  if (serie.startsWith("B")) return "03"; // boleta
  return "01";                            // factura
}

function buildFactilizaPayload(documento, docKey, opciones = {}) {
  const esPrueba = opciones.esPrueba === true;
  const items = documento.items || documento.Items || [];
  const igvIncluido = documento.tipoIgv === "INCLUIDO" || documento.tipoIgv === "INCLUIDO IGV";
  const detalle = buildDetail(items, igvIncluido);
  const subTotal = detalle.reduce((s, it) => s + it.monto_Valor_Venta, 0);
  const totalIgv = detalle.reduce((s, it) => s + it.igv, 0);
  const montoTotal = subTotal + totalIgv;
  const moneda = documento.moneda === "USD" ? "USD" : "PEN";

  const cliente = documento.cliente || documento.razonSNombre || documento.RazonSNombre || documento.proveedor || "";
  const clienteDocNum = documento.clienteDoc || documento.proveedorDoc || "";
  // El tipo de comprobante se deduce PRIMERO del propio documento y solo después de la
  // clave que llega por parámetro.
  //
  // `sendToSunat` recibe {collection, docId}, así que aquí llegaba «Facturas» —el nombre de
  // la colección— donde se esperaba «vs-boleta». Ninguna de las comparaciones acertaba y el
  // documento caía en el `else` final, que asume Factura. Consecuencia: TODA boleta se
  // enviaba a SUNAT declarada como factura (tipo_Doc «01»). No llegó a pasar porque la
  // comprobación de serie la frenaba antes —«la serie B001 no vale para una Factura»—, con
  // lo que ninguna boleta podía emitirse. Verificado intentando emitir una de verdad.
  const tipoDelDocumento = String(documento.tipofactura || documento._docType || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  const esFactura = docKey === "c-factura" || docKey === "va-factura" || docKey === "vs-factura"
    || tipoDelDocumento === "factura";
  const esBoleta = docKey === "c-boleta" || docKey === "va-boleta" || docKey === "vs-boleta"
    || tipoDelDocumento === "boleta";
  const esNotaCredito = docKey === "va-notacredito"
    || tipoDelDocumento === "notacredito" || tipoDelDocumento === "notadecredito";
  const esGuia = docKey === "c-guia" || docKey === "va-guia"
    || tipoDelDocumento === "guia" || tipoDelDocumento === "guiaderemision";

  const base = apiBase(esPrueba);
  let tipoDoc, endpoint;
  if (esNotaCredito) {
    tipoDoc = "07";
    endpoint = base + "/note/send";
  } else if (esGuia) {
    tipoDoc = "09";
    endpoint = base + "/despatch/send";
  } else {
    tipoDoc = esFactura ? "01" : esBoleta ? "03" : "01";
    endpoint = base + "/invoice/send";
  }

  const fechaEmision = toFactilizaDate(documento.fecha || documento.Fecha);

  const payload = {
    tipo_Operacion: "0101",
    tipo_Doc: tipoDoc,
    serie: documento.serie || documento.nserie || documento.Nserie || "",
    correlativo: correlativoParaFactiliza(documento.numero),
    tipo_Moneda: moneda,
    fecha_Emision: fechaEmision,
    empresa_Ruc: rucDelEmisor(esPrueba, opciones.rucEmisor),
    cliente_Tipo_Doc: tipoDocIdentidad(documento.tipoDoc, clienteDocNum),
    cliente_Num_Doc: clienteDocNum,
    cliente_Razon_Social: cliente,
    cliente_Direccion: documento.direccion || documento.clienteDireccion || "",
    monto_Oper_Gravadas: round2(subTotal),
    monto_Igv: round2(totalIgv),
    total_Impuestos: round2(totalIgv),
    // valor_Venta va SIN IGV y sub_Total CON IGV. Confundirlos es rechazo seguro.
    valor_Venta: round2(subTotal),
    sub_Total: round2(montoTotal),
    monto_Imp_Venta: round2(montoTotal),
    monto_Oper_Exoneradas: 0,
    estado_Documento: "0",
    manual: false,
    id_Base_Dato: "15265",
    detalle,
    forma_pago: [{ tipo: "Contado", monto: round2(montoTotal), cuota: 0, fecha_Pago: fechaEmision }],
    // Leyenda 1000 = importe en letras (obligatoria).
    legend: [{ legend_Code: "1000", legend_Value: importeEnLetras(montoTotal, moneda) }],
  };

  if (esNotaCredito) {
    const referencia = documento.docRelacion || documento.numCotizacion || documento.NumCotizacion || "";
    payload.afectado_Tipo_Doc = tipoDocAfectado(referencia, documento.tipoDocAfectado);
    payload.afectado_Num_Doc = numeroAfectadoSinCeros(referencia);
    // Motivo 01 = ANULACION DE LA OPERACION (catálogo SUNAT 09).
    payload.motivo_Cod = documento.motivoCod || "01";
    payload.motivo_Des = documento.motivoDes || "ANULACION DE LA OPERACION";
    payload.Observacion = documento.observacion || "";
    // En /note/send el campo es `Manual` con mayúscula, mientras que en /invoice/send
    // es `manual`. Parece un descuido suyo, pero es lo que valida.
    payload.Manual = false;
    delete payload.manual;
    delete payload.forma_pago;
  }

  return { payload, endpoint, esPrueba };
}

// Cuerpo de /invoice/pdf, /invoice/xml, /note/pdf y /note/xml.
//
// El RUC tiene que ser EL MISMO con el que se emitio, y en pruebas ese es el de Factiliza,
// no el de GM Parts. Antes caia siempre a RUC_EMPRESA (produccion), asi que en modo pruebas
// pedir el PDF o el XML de un comprobante recien aceptado devolvia 400 «El usuario no se
// encuentra configurado para el RUC» y `descargarComprobanteCore` terminaba en «Factiliza no
// devolvio el PDF ni el XML». Es decir: el comprobante se declaraba bien y despues no habia
// forma de descargarlo ni de enviarselo al cliente. Comprobado contra QA sobre la boleta
// B066-8801: con 20601720621 da 400, con 10749283781 devuelve el PDF (34 KB) y el XML.
function buildDocumentoRequest(documento, tipoDoc, opciones = {}) {
  return {
    tipo_Doc: tipoDoc,
    serie: documento.serie || documento.nserie || documento.Nserie || "",
    correlativo: correlativoParaFactiliza(documento.numero),
    empresa_Ruc: rucDelEmisor(opciones.esPrueba === true, documento.empresa_Ruc),
  };
}

// Formato de serie que exige SUNAT según el tipo de comprobante: una letra que depende
// del tipo + 3 caracteres alfanuméricos. En la base hay documentos guardados con series
// como "111-111" o "123123-123123", e incluso vacías; todas serían rechazadas.
const FORMATO_SERIE = {
  "01": { regex: /^F[A-Z0-9]{3}$/, ejemplo: "F001", nombre: "Factura" },
  "03": { regex: /^B[A-Z0-9]{3}$/, ejemplo: "B001", nombre: "Boleta" },
  "07": { regex: /^[FB][A-Z0-9]{3}$/, ejemplo: "FC01", nombre: "Nota de crédito" },
  "09": { regex: /^T[A-Z0-9]{3}$/, ejemplo: "T001", nombre: "Guía de remisión" },
};

function validarSerie(serie, tipoDoc) {
  const formato = FORMATO_SERIE[tipoDoc];
  if (!formato) return "";
  if (formato.regex.test(String(serie || "").toUpperCase())) return "";
  return `La serie "${serie}" no tiene el formato que SUNAT exige para una ${formato.nombre}: ` +
    `una letra ${formato.ejemplo[0]} seguida de 3 caracteres (por ejemplo ${formato.ejemplo}).`;
}

// Comprueba los datos que SUNAT exige antes de gastar una llamada al API,
// para devolver un mensaje accionable en vez de un error de deserialización.
function validarPayload(payload) {
  const faltantes = [];
  if (!payload.serie) faltantes.push("serie");
  if (!payload.correlativo) faltantes.push("número correlativo");
  if (!payload.cliente_Num_Doc) faltantes.push("documento del cliente (RUC/DNI)");
  if (!payload.cliente_Razon_Social) faltantes.push("razón social / nombre del cliente");
  if (!payload.detalle || payload.detalle.length === 0) faltantes.push("al menos un ítem en el detalle");
  // Los faltantes se reportan primero: antes la comprobación del RUC salía con `return`
  // y ocultaba que además faltaba la serie, así que el usuario corregía de a un error.
  if (faltantes.length > 0) {
    return "El documento no puede enviarse a SUNAT porque le falta: " + faltantes.join(", ") + ".";
  }
  const errSerie = validarSerie(payload.serie, payload.tipo_Doc);
  if (errSerie) return errSerie;
  if (!/^\d+$/.test(String(payload.correlativo))) {
    return `El número correlativo "${payload.correlativo}" debe ser solo dígitos.`;
  }
  if (payload.tipo_Doc === "01" && payload.cliente_Tipo_Doc !== "6") {
    return "Una Factura requiere que el cliente tenga RUC (11 dígitos). Documento actual: " + (payload.cliente_Num_Doc || "vacío");
  }
  if (payload.tipo_Doc === "07" && !payload.afectado_Num_Doc) {
    return "Una Nota de Crédito necesita el número del documento que anula (serie-correlativo).";
  }
  return "";
}

module.exports = {
  FACTILIZA_API,
  FACTILIZA_HOSTS,
  RUC_EMPRESA,
  RUC_EMPRESA_PRUEBAS,
  apiBase,
  rucDelEmisor,
  round2,
  tipoDocIdentidad,
  toFactilizaDate,
  buildDetail,
  extractFactilizaError,
  leerRespuesta,
  parseResponse,
  buildFactilizaPayload,
  buildDocumentoRequest,
  numeroAfectadoSinCeros,
  correlativoParaFactiliza,
  tipoDocAfectado,
  validarSerie,
  FORMATO_SERIE,
  importeEnLetras,
  enteroALetras,
  validarPayload,
};
