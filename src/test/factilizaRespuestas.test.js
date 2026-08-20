// Interpretación de las respuestas de Factiliza y construcción del comprobante.
// Los cuerpos de respuesta de este archivo son REALES: salieron del sondeo del
// 2026-08-16 contra apife.factiliza.com y apife-qa.factiliza.com.
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  leerRespuesta,
  buildFactilizaPayload,
  importeEnLetras,
  enteroALetras,
  numeroAfectadoSinCeros,
  tipoDocAfectado,
  validarSerie,
  apiBase,
  rucDelEmisor,
  validarPayload,
  FACTILIZA_HOSTS,
  RUC_EMPRESA_PRUEBAS,
} = require("../../functions/factiliza.js");

describe("leerRespuesta — un rechazo de SUNAT llega con HTTP 200", () => {
  it("respuesta real de QA: registrado en Factiliza pero rechazado por SUNAT", () => {
    // Cuerpo textual devuelto por apife-qa el 2026-08-16.
    const real = {
      status: 200, success: false,
      message: "DEMO - El documento fue registrado en el sistema, pero hubo un problema con la SUNAT, por favor, revise el portal para más detalles",
      data: {
        hash: "IQyTrjVMTEhMpTEWuwgCSEwvesA=",
        error: { code: "0151", message: "El nombre del archivo ZIP es incorrecto" },
      },
    };
    const v = leerRespuesta(200, real);
    expect(v.aceptado).toBe(false);          // HTTP 200 pero NO aceptado
    expect(v.hash).toBe("IQyTrjVMTEhMpTEWuwgCSEwvesA=");
    expect(v.usarResend).toBe(true);         // ya está registrado: /send diría "ya existe"
    expect(v.codigo).toBe("0151");
  });

  it("401 real de producción: credenciales que no valen para esta API", () => {
    const real = { type: "https://tools.ietf.org/html/rfc7235#section-3.1", title: "Unauthorized", status: 401 };
    const v = leerRespuesta(401, real);
    expect(v.aceptado).toBe(false);
    expect(v.estado).toBe("No autorizado");
    expect(v.reintentable).toBe(false);      // reintentar con el mismo token es inútil
  });

  it("400 real: el RUC del emisor no está dado de alta", () => {
    const real = { status: 400, success: false, message: "Su usuario no se encuentra configurado para el RUC '20601720621'", data: null };
    const v = leerRespuesta(400, real);
    expect(v.aceptado).toBe(false);
    expect(v.mensaje).toContain("no se encuentra configurado para el RUC");
    expect(v.usarResend).toBe(false);
  });

  it("aceptado: success y CDR, sin error", () => {
    const v = leerRespuesta(200, { success: true, data: { sunatResponse: { success: true, cdrResponse: { id: "CDR-1" } } } });
    expect(v.aceptado).toBe(true);
    expect(v.cdrId).toBe("CDR-1");
    expect(v.reintentable).toBe(false);
  });

  it("código numérico de SUNAT sin hash: rechazo definitivo, no se reintenta", () => {
    const v = leerRespuesta(200, { success: false, data: { error: { code: "2335", message: "El dato ingresado no cumple con el formato" } } });
    expect(v.estado).toBe("Rechazado");
    expect(v.reintentable).toBe(false);      // reenviar quemaría correlativo sin cambiar nada
  });

  it("código NO numérico: fue fallo de comunicación, sí se reintenta", () => {
    const v = leerRespuesta(200, { success: false, data: { error: { code: "HTTP", message: "Timeout hacia SUNAT" } } });
    expect(v.reintentable).toBe(true);
    expect(v.estado).not.toBe("Rechazado");
  });

  it("en cola de Factiliza: se espera, no es un fallo", () => {
    const v = leerRespuesta(200, { success: false, message: "El documento está pendiente de envío" });
    expect(v.estado).toBe("Pendiente");
    expect(v.reintentable).toBe(true);
  });

  it("«ya existe»: se reprocesa con resend en vez de reenviar", () => {
    const v = leerRespuesta(200, { success: false, message: "Ya existe un documento con esa serie y correlativo" });
    expect(v.usarResend).toBe(true);
    expect(v.reintentable).toBe(true);
  });

  it("respuesta real de /resend sobre un documento ya declarado: NO es un error", () => {
    // Verificado en DEMO: reprocesar algo ya aceptado devuelve HTTP 400 con este texto.
    // Tratarlo como error dejaba una factura correcta marcada en rojo para siempre.
    const real = { status: 400, success: false, message: "DEMO - Este documento ya se encuentra declarado en la SUNAT", data: null };
    const v = leerRespuesta(400, real);
    expect(v.aceptado).toBe(true);
    expect(v.estado).toBe("Aceptado");
    expect(v.reintentable).toBe(false);
  });

  it("respuesta real al reenviar un duplicado: se reprocesa por resend", () => {
    // Verificado en DEMO: pulsar dos veces «enviar» devuelve HTTP 400 con este texto.
    const real = {
      status: 400, success: false,
      message: "Ya existe un documento con el mismo tipo de documento (01), la misma serie y correlativo: 'F001-901300', para la empresa con RUC: 10749283781",
      data: null,
    };
    const v = leerRespuesta(400, real);
    expect(v.usarResend).toBe(true);
    expect(v.reintentable).toBe(true);
    expect(v.aceptado).toBe(false);
  });

  it("no revienta con cuerpo vacío", () => {
    expect(leerRespuesta(500, null).aceptado).toBe(false);
    expect(leerRespuesta(500, null).reintentable).toBe(true);
  });
});

describe("importe en letras — la leyenda 1000 es obligatoria y es el importe", () => {
  it("compone el texto que espera SUNAT", () => {
    expect(importeEnLetras(118)).toBe("CIENTO DIECIOCHO CON 00/100 SOLES");
    expect(importeEnLetras(236.5)).toBe("DOSCIENTOS TREINTA Y SEIS CON 50/100 SOLES");
    expect(importeEnLetras(1)).toBe("UNO CON 00/100 SOLES");
    expect(importeEnLetras(0)).toBe("CERO CON 00/100 SOLES");
    expect(importeEnLetras(100)).toBe("CIEN CON 00/100 SOLES");
    expect(importeEnLetras(1500.9, "USD")).toBe("MIL QUINIENTOS CON 90/100 DOLARES AMERICANOS");
  });

  it("cubre miles y millones", () => {
    expect(enteroALetras(1000000)).toBe("UN MILLON");
    expect(enteroALetras(2500)).toBe("DOS MIL QUINIENTOS");
    expect(enteroALetras(21)).toBe("VEINTIUNO");
    expect(enteroALetras(31)).toBe("TREINTA Y UNO");
  });

  it("el comprobante ya no manda el nombre de la empresa como leyenda", () => {
    const { payload } = buildFactilizaPayload({
      serie: "F001", numero: "000123", cliente: "ACME SAC", clienteDoc: "20601720621",
      tipoDoc: "RUC", fecha: "2026-08-16", tipoIgv: "INCLUIDO",
      items: [{ descripcion: "Filtro", cant: 2, pu: 118 }],
    }, "va-factura", { esPrueba: true });

    expect(payload.legend[0].legend_Code).toBe("1000");
    expect(payload.legend[0].legend_Value).toMatch(/CON \d{2}\/100 SOLES$/);
    expect(payload.legend[0].legend_Value).not.toBe("GM PARTS TALLER");
  });
});

describe("entorno y RUC del emisor", () => {
  it("el host depende del entorno, ya no está fijado a producción", () => {
    expect(apiBase(true)).toBe(FACTILIZA_HOSTS.pruebas);
    expect(apiBase(false)).toBe(FACTILIZA_HOSTS.produccion);
    expect(FACTILIZA_HOSTS.pruebas).toContain("apife-qa");
  });

  it("en pruebas se emite con el RUC de Factiliza, no con el propio", () => {
    // Verificado: mandar el RUC propio a QA devuelve "Su usuario no se encuentra
    // configurado para el RUC".
    expect(rucDelEmisor(true)).toBe(RUC_EMPRESA_PRUEBAS);
    expect(rucDelEmisor(false)).toBe("20601720621");
  });

  it("el comprobante de pruebas apunta al host de QA", () => {
    const { endpoint, payload } = buildFactilizaPayload(
      { serie: "F001", numero: "1", cliente: "X", clienteDoc: "20601720621", fecha: "2026-08-16", items: [{ descripcion: "a", cant: 1, pu: 10 }] },
      "va-factura", { esPrueba: true }
    );
    expect(endpoint).toContain("apife-qa");
    expect(payload.empresa_Ruc).toBe(RUC_EMPRESA_PRUEBAS);
  });
});

describe("importes: sub_Total va CON IGV y valor_Venta SIN él", () => {
  it("no los confunde (confundirlos es rechazo seguro)", () => {
    const { payload } = buildFactilizaPayload({
      serie: "F001", numero: "1", cliente: "ACME", clienteDoc: "20601720621", tipoDoc: "RUC",
      fecha: "2026-08-16", tipoIgv: "INCLUIDO",
      items: [{ descripcion: "Filtro", cant: 1, pu: 118 }],
    }, "va-factura", { esPrueba: true });

    expect(payload.valor_Venta).toBeCloseTo(100, 1);   // sin IGV
    expect(payload.sub_Total).toBeCloseTo(118, 1);     // con IGV
    expect(payload.monto_Igv).toBeCloseTo(18, 1);
    expect(payload.detalle[0].tip_Afe_Igv).toBe("10");
    expect(typeof payload.detalle[0].tip_Afe_Igv).toBe("string"); // numérico da error de deserialización
  });
});

describe("nota de crédito", () => {
  const nota = {
    serie: "FC01", numero: "000001", cliente: "ACME SAC", clienteDoc: "20601720621", tipoDoc: "RUC",
    fecha: "2026-08-16", tipoIgv: "INCLUIDO", docRelacion: "F001-000024",
    items: [{ descripcion: "Filtro", cant: 1, pu: 118 }],
  };

  it("usa `Manual` con mayúscula, que es lo que valida /note/send", () => {
    const { payload, endpoint } = buildFactilizaPayload(nota, "va-notacredito", { esPrueba: true });
    expect(endpoint).toContain("/note/send");
    expect(payload.Manual).toBe(false);
    expect(payload.manual).toBeUndefined();
  });

  it("el número afectado va SIN ceros de relleno", () => {
    expect(numeroAfectadoSinCeros("F001-000024")).toBe("F001-24");
    expect(numeroAfectadoSinCeros("B066-000001")).toBe("B066-1");
    expect(numeroAfectadoSinCeros("")).toBe("");
    const { payload } = buildFactilizaPayload(nota, "va-notacredito", { esPrueba: true });
    expect(payload.afectado_Num_Doc).toBe("F001-24");
  });

  it("deduce el tipo del documento afectado por su serie", () => {
    expect(tipoDocAfectado("B066-24")).toBe("03");  // boleta
    expect(tipoDocAfectado("F001-24")).toBe("01");  // factura
  });

  it("anula con el motivo 01 del catálogo SUNAT", () => {
    const { payload } = buildFactilizaPayload(nota, "va-notacredito", { esPrueba: true });
    expect(payload.motivo_Cod).toBe("01");
    expect(payload.motivo_Des).toBe("ANULACION DE LA OPERACION");
  });

  it("los importes de la nota van en positivo aunque reste", () => {
    const { payload } = buildFactilizaPayload(nota, "va-notacredito", { esPrueba: true });
    expect(payload.monto_Imp_Venta).toBeGreaterThan(0);
    expect(payload.detalle[0].monto_Valor_Venta).toBeGreaterThan(0);
  });

  it("exige el documento que anula antes de llamar al API", () => {
    const { payload } = buildFactilizaPayload({ ...nota, docRelacion: "" }, "va-notacredito", { esPrueba: true });
    expect(validarPayload(payload)).toContain("número del documento que anula");
  });
});

describe("formato de serie — las que hay en la base serían rechazadas", () => {
  const base = {
    correlativo: "000123", cliente_Num_Doc: "20601720621", cliente_Tipo_Doc: "6",
    cliente_Razon_Social: "ACME SAC", detalle: [{}],
  };

  it("rechaza las series inventadas a mano que hay guardadas en Firestore", () => {
    // Casos reales encontrados en la colección Facturas.
    for (const serie of ["111", "123123", "1", ""]) {
      expect(validarPayload({ ...base, tipo_Doc: "01", serie })).not.toBe("");
    }
  });

  it("acepta las series válidas de cada tipo de comprobante", () => {
    expect(validarPayload({ ...base, tipo_Doc: "01", serie: "F001" })).toBe("");
    expect(validarPayload({ ...base, tipo_Doc: "03", serie: "B001", cliente_Tipo_Doc: "1", cliente_Num_Doc: "12345678" })).toBe("");
    expect(validarPayload({ ...base, tipo_Doc: "07", serie: "FC01", afectado_Num_Doc: "F001-24" })).toBe("");
  });

  it("una Factura no puede llevar serie de Boleta ni al revés", () => {
    expect(validarSerie("B001", "01")).toContain("no tiene el formato");
    expect(validarSerie("F001", "03")).toContain("no tiene el formato");
  });

  it("el correlativo debe ser numérico", () => {
    expect(validarPayload({ ...base, tipo_Doc: "01", serie: "F001", correlativo: "12A" })).toContain("solo dígitos");
  });
});

describe("validarPayload reporta todo lo que falta de una vez", () => {
  it("ya no oculta la serie ausente detrás del aviso del RUC", () => {
    const msg = validarPayload({
      tipo_Doc: "01", serie: "", correlativo: "", cliente_Num_Doc: "12345678",
      cliente_Tipo_Doc: "1", cliente_Razon_Social: "Juan", detalle: [{}],
    });
    expect(msg).toContain("serie");
    expect(msg).toContain("número correlativo");
  });
});
