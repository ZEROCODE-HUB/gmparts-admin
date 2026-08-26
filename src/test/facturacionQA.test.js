// ═══════════════════════════════════════════════════════════════════════════
// Camino feliz de la facturación electrónica, contra el entorno QA REAL de Factiliza.
//
// Por qué existe: aquí es donde hay dinero de por medio, y es donde ya han aparecido cuatro
// fallos que ninguna prueba offline podía ver, porque todos estaban en el CONTRATO con
// Factiliza, no en nuestra aritmética:
//
//   1. El PDF descargado podía ser el de otra empresa. Factiliza normaliza el correlativo:
//      pedir «B066-000001» devuelve «B066-1». Se emitió una boleta propia de S/830 y la
//      descarga trajo un comprobante ajeno de S/10, que se guardó en Storage como propio
//      — y es el archivo que el botón «enviar al cliente por correo» le habría mandado.
//   2. En modo pruebas la descarga pedía el comprobante con el RUC de producción: 400
//      siempre, comprobante declarado y sin forma de bajarlo.
//   3. Un choque de correlativo se guardaba con el mensaje del /resend («No se encontró un
//      documento…»), que dice lo contrario de la causa real («Ya existe un documento…»).
//   4. Un rechazo de SUNAT llega con HTTP 200: mirar solo el código HTTP da por bueno un
//      documento rechazado.
//
// NO se ejecuta con `npm test`: sale a la red y emite documentos de verdad en una cuenta
// DEMO compartida con otro proyecto. Se lanza a mano:
//
//   FACTILIZA_INVOICE_TOKEN=... npm run test:facturacion
//
// Cada pasada emite 3 documentos (boleta, factura y nota de crédito) con un correlativo
// derivado del reloj, en una banda alta que nadie usa, para no chocar con la numeración de
// AD360 — cuyos correlativos bajos de B066 están ocupados, y algunos «registrados sin
// declarar», así que ni siquiera se detectan consultando.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  buildFactilizaPayload,
  buildDocumentoRequest,
  leerRespuesta,
  validarPayload,
  apiBase,
  RUC_EMPRESA_PRUEBAS,
} = require("../../functions/factiliza.js");

const TOKEN = process.env.FACTILIZA_INVOICE_TOKEN || process.env.FACTILIZA_TOKEN || "";

// Banda alta y distinta en cada pasada. Repetir un correlativo no es un fallo del código:
// Factiliza responde «ya existe» y la prueba se caería por una razón que no es la suya.
const CORRELATIVO = 800000 + (Date.now() % 100000);

// Se rellena a OCHO cifras, no a seis, y no es un capricho.
//
// El panel numera con seis («000001»), pero un correlativo de la banda alta que usamos aquí
// ya tiene seis dígitos, así que rellenar a seis no añade ni un cero y el relleno —que es
// justo lo que Factiliza normaliza— no llegaría a ejercitarse nunca. Comprobado: con seis
// cifras esta suite pasaba aunque se deshiciera la corrección del correlativo.
//
// Con ocho, el número que se envía lleva ceros delante y sigue siendo único. Si alguien
// quita `correlativoParaFactiliza`, la primera prueba se cae.
const ceros = (n) => String(n).padStart(8, "0");

const NUM_BOLETA = ceros(CORRELATIVO);
const NUM_FACTURA = ceros(CORRELATIVO);
const NUM_NOTA = ceros(CORRELATIVO + 1);

// Los mismos importes de la orden CT001-0000230, que es la que destapó el descuadre del
// IGV: el cliente aprobó S/979.40 sobre una base de S/830.
const LINEAS = [
  { codigo: "MO", descripcion: "Mano de obra: Reemplazar amortiguadores delanteros", cant: 1, pu: 280 },
  { codigo: "RAD", descripcion: "RADIADOR NISSAN ALMERA AT", cant: 1, pu: 550 },
];

const boleta = {
  tipofactura: "Boleta", serie: "B066", numero: NUM_BOLETA, fecha: "2026-08-26",
  moneda: "PEN", tipoIgv: "MAS IGV", cliente: "PRUEBA AUTOMATICA",
  clienteDoc: "71234568", tipoDoc: "DNI", direccion: "AV. PRUEBA 123 - LIMA",
  items: LINEAS,
};

const factura = {
  ...boleta, tipofactura: "Factura", serie: "F066", numero: NUM_FACTURA,
  cliente: "GEAR MOTOR PARTS SOCIEDAD ANONIMA CERRADA", clienteDoc: "20601720621", tipoDoc: "RUC",
};

async function enviar(documento, docKey) {
  const { payload, endpoint } = buildFactilizaPayload(documento, docKey, { esPrueba: true });
  const errValidacion = validarPayload(payload);
  if (errValidacion) throw new Error("La validación local rechazó el documento: " + errValidacion);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(payload),
  });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = JSON.parse(texto); } catch { /* Factiliza puede devolver texto plano */ }
  return { payload, veredicto: leerRespuesta(res.status, cuerpo), httpStatus: res.status, texto };
}

async function descargar(documento, tipoDoc, formato, prefijo = "/invoice") {
  const cuerpo = buildDocumentoRequest(documento, tipoDoc, { esPrueba: true });
  const res = await fetch(apiBase(true) + prefijo + "/" + formato, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: JSON.stringify(cuerpo),
  });
  return { res, buffer: Buffer.from(await res.arrayBuffer()), cuerpoEnviado: cuerpo };
}

const etiqueta = (xml, nombre) => (xml.match(new RegExp(`<${nombre}[^>]*>([^<]+)</${nombre}>`)) || [])[1];

describe("facturación electrónica contra el QA de Factiliza", () => {
  beforeAll(() => {
    if (!TOKEN) {
      throw new Error(
        "Falta FACTILIZA_INVOICE_TOKEN. Estas pruebas hablan con la API real de Factiliza.\n" +
        "  FACTILIZA_INVOICE_TOKEN=<token de facturación> npm run test:facturacion"
      );
    }
  });

  let veredictoBoleta;

  it("emite una boleta y SUNAT la acepta", async () => {
    const { payload, veredicto } = await enviar(boleta, "vs-boleta");
    veredictoBoleta = veredicto;

    // El correlativo viaja SIN ceros aunque el panel numere con ellos.
    expect(payload.correlativo).toBe(String(CORRELATIVO));
    expect(payload.empresa_Ruc).toBe(RUC_EMPRESA_PRUEBAS);
    expect(payload.tipo_Doc).toBe("03");

    expect(veredicto.estado, veredicto.mensaje).toBe("Aceptado");
    expect(veredicto.aceptado).toBe(true);
    expect(veredicto.hash).toBeTruthy();
  });

  it("declara el importe que aprobó el cliente, no la base", async () => {
    // El descuadre de S/149.40: la base son 830 y lo que el cliente aceptó son 979.40.
    const { payload } = buildFactilizaPayload(boleta, "vs-boleta", { esPrueba: true });
    expect(payload.valor_Venta).toBe(830);
    expect(payload.monto_Igv).toBe(149.4);
    expect(payload.monto_Imp_Venta).toBe(979.4);
    expect(payload.legend[0].legend_Code).toBe("1000");
    expect(payload.legend[0].legend_Value).toMatch(/NOVECIENTOS SETENTA Y NUEVE CON 40\/100 SOLES/);
  });

  it("el PDF y el XML que devuelve son los DE ESTE documento", async () => {
    // El fallo que dejó el comprobante de otra empresa guardado como propio.
    expect(veredictoBoleta?.aceptado).toBe(true);

    const { res: resXml, buffer: bufXml, cuerpoEnviado } = await descargar(boleta, "03", "xml");
    expect(cuerpoEnviado.correlativo).toBe(String(CORRELATIVO));
    expect(cuerpoEnviado.empresa_Ruc).toBe(RUC_EMPRESA_PRUEBAS);
    expect(resXml.status).toBe(200);

    const xml = bufXml.toString("utf8");
    expect(etiqueta(xml, "cbc:ID")).toBe(`B066-${CORRELATIVO}`);
    expect(etiqueta(xml, "cbc:PayableAmount")).toBe("979.40");
    expect(xml).toContain("ds:SignatureValue");

    const { res: resPdf, buffer: bufPdf } = await descargar(boleta, "03", "pdf");
    expect(resPdf.status).toBe(200);
    expect(bufPdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("emite una factura a un cliente con RUC", async () => {
    const { payload, veredicto } = await enviar(factura, "vs-factura");
    expect(payload.tipo_Doc).toBe("01");
    expect(payload.cliente_Tipo_Doc).toBe("6");
    expect(veredicto.estado, veredicto.mensaje).toBe("Aceptado");
  });

  it("anula la boleta con una nota de crédito", async () => {
    const nota = {
      ...boleta,
      tipofactura: "Nota de credito",
      serie: "BC66",
      numero: NUM_NOTA,
      docRelacion: `B066-${NUM_BOLETA}`,
      tipoDocAfectado: "03",
      motivoCod: "01",
      motivoDes: "ANULACION DE LA OPERACION",
    };
    const { payload, veredicto } = await enviar(nota, "va-notacredito");

    expect(payload.tipo_Doc).toBe("07");
    // El documento afectado también va sin ceros de relleno.
    expect(payload.afectado_Num_Doc).toBe(`B066-${CORRELATIVO}`);
    expect(payload.afectado_Tipo_Doc).toBe("03");
    expect(veredicto.estado, veredicto.mensaje).toBe("Aceptado");
  });

  it("un correlativo repetido NO se da por aceptado", async () => {
    // Un rechazo de Factiliza llega con HTTP 400 y uno de SUNAT con HTTP 200: mirar solo el
    // código daría por bueno un documento que no existe. Reenviar el mismo debe fallar.
    const { veredicto } = await enviar(boleta, "vs-boleta");
    expect(veredicto.aceptado).toBe(false);
    expect(veredicto.mensaje).toMatch(/ya existe/i);
  });

  it("no descarga nada de un comprobante que no existe", async () => {
    const inexistente = { ...boleta, numero: ceros(CORRELATIVO + 90000) };
    const { res } = await descargar(inexistente, "03", "xml");
    expect(res.status).not.toBe(200);
  });
});
