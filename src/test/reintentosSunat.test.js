// Política de reintentos del envío a SUNAT.
//
// Las reglas vienen del comportamiento real del API: un rechazo por datos no se reintenta
// (reenviar quema correlativo sin cambiar nada), un fallo de comunicación sí, y el plazo
// de 3 días de SUNAT corta por lo sano.
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { leerRespuesta } = require("../../functions/factiliza.js");

// Réplica de la política implementada en functions/index.js. Si allí cambia el backoff o
// el plazo, estos casos lo delatan.
const DIAS_DE_PLAZO = 3;
const MAX_INTENTOS = 20;

function proximoIntento(intentos, ahora = 0) {
  const minutos = Math.min(Math.pow(3, Math.max(0, intentos)), 60);
  return ahora + minutos * 60 * 1000;
}

function fueraDePlazo(fechaDoc, ahora) {
  const dias = (ahora - fechaDoc) / (24 * 60 * 60 * 1000);
  return dias > DIAS_DE_PLAZO;
}

function decidir({ veredicto, intentos, fechaDoc, ahora }) {
  const vencido = !veredicto.aceptado && fueraDePlazo(fechaDoc, ahora);
  const agotado = !veredicto.aceptado && intentos + 1 >= MAX_INTENTOS;
  return {
    seguiraIntentando: veredicto.reintentable && !vencido && !agotado,
    estado: veredicto.aceptado ? "Aceptado" : vencido ? "Vencido" : veredicto.estado,
  };
}

const DIA = 24 * 60 * 60 * 1000;
const HOY = Date.parse("2026-08-16T12:00:00Z");

describe("backoff", () => {
  it("crece 3^n y se topa en 1 hora", () => {
    expect(proximoIntento(0) / 60000).toBe(1);
    expect(proximoIntento(1) / 60000).toBe(3);
    expect(proximoIntento(2) / 60000).toBe(9);
    expect(proximoIntento(3) / 60000).toBe(27);
    expect(proximoIntento(4) / 60000).toBe(60);   // 81 -> tope
    expect(proximoIntento(10) / 60000).toBe(60);  // sigue topado
  });
});

describe("qué se reintenta y qué no", () => {
  it("un rechazo por datos de SUNAT NO se reintenta", () => {
    // error.code numérico: reenviar da lo mismo y quema correlativo.
    const v = leerRespuesta(200, { success: false, data: { error: { code: "2335", message: "Formato inválido" } } });
    const d = decidir({ veredicto: v, intentos: 0, fechaDoc: HOY, ahora: HOY });
    expect(d.seguiraIntentando).toBe(false);
    expect(d.estado).toBe("Rechazado");
  });

  it("un fallo de comunicación SÍ se reintenta", () => {
    const v = leerRespuesta(200, { success: false, data: { error: { code: "HTTP", message: "Timeout" } } });
    expect(decidir({ veredicto: v, intentos: 0, fechaDoc: HOY, ahora: HOY }).seguiraIntentando).toBe(true);
  });

  it("estar en la cola de Factiliza se reintenta sin darlo por perdido", () => {
    const v = leerRespuesta(200, { success: false, message: "El documento está pendiente de envío" });
    const d = decidir({ veredicto: v, intentos: 3, fechaDoc: HOY, ahora: HOY });
    expect(d.seguiraIntentando).toBe(true);
    expect(d.estado).toBe("Pendiente");
  });

  it("un 401 no se reintenta: el token no va a cambiar solo", () => {
    const v = leerRespuesta(401, { title: "Unauthorized", status: 401 });
    expect(decidir({ veredicto: v, intentos: 0, fechaDoc: HOY, ahora: HOY }).seguiraIntentando).toBe(false);
  });

  it("un documento aceptado deja de reintentarse", () => {
    const v = leerRespuesta(200, { success: true, data: { sunatResponse: { success: true, cdrResponse: { id: "CDR" } } } });
    const d = decidir({ veredicto: v, intentos: 2, fechaDoc: HOY, ahora: HOY });
    expect(d.seguiraIntentando).toBe(false);
    expect(d.estado).toBe("Aceptado");
  });
});

describe("plazo de SUNAT", () => {
  const reintentable = leerRespuesta(200, { success: false, data: { error: { code: "HTTP", message: "Timeout" } } });

  it("dentro de los 3 días sigue intentándolo", () => {
    const d = decidir({ veredicto: reintentable, intentos: 1, fechaDoc: HOY - 2 * DIA, ahora: HOY });
    expect(d.seguiraIntentando).toBe(true);
    expect(d.estado).not.toBe("Vencido");
  });

  it("pasado el plazo se marca Vencido y se deja de intentar", () => {
    const d = decidir({ veredicto: reintentable, intentos: 1, fechaDoc: HOY - 4 * DIA, ahora: HOY });
    expect(d.seguiraIntentando).toBe(false);
    expect(d.estado).toBe("Vencido");
  });

  it("un documento aceptado fuera de plazo NO se marca vencido", () => {
    const aceptado = leerRespuesta(200, { success: true, data: { sunatResponse: { success: true } } });
    const d = decidir({ veredicto: aceptado, intentos: 0, fechaDoc: HOY - 10 * DIA, ahora: HOY });
    expect(d.estado).toBe("Aceptado");
  });
});

describe("tope de intentos", () => {
  const reintentable = leerRespuesta(200, { success: false, data: { error: { code: "HTTP", message: "Timeout" } } });

  it("se rinde al llegar al máximo, aunque el error sea reintentable", () => {
    expect(decidir({ veredicto: reintentable, intentos: MAX_INTENTOS - 2, fechaDoc: HOY, ahora: HOY }).seguiraIntentando).toBe(true);
    expect(decidir({ veredicto: reintentable, intentos: MAX_INTENTOS - 1, fechaDoc: HOY, ahora: HOY }).seguiraIntentando).toBe(false);
  });
});
