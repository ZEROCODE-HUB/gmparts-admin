// Marca «sin valor fiscal» en el PDF.
//
// El PDF interno se imprimía siempre con el texto «Representación impresa de la FACTURA
// ELECTRÓNICA» y «consulte su documento en sunat.gob.pe», incluso cuando el comprobante no
// se había declarado nunca. Es el papel que se le entrega al cliente: tiene que decir la
// verdad sobre su estado.
import { describe, it, expect } from "vitest";
import { sinValorFiscal } from "../lib/pdfGenerator";

describe("cuándo hay que avisar", () => {
  it("un documento sin enviar no es un comprobante", () => {
    expect(sinValorFiscal("", false)).toMatch(/SIN VALOR FISCAL/);
    expect(sinValorFiscal(undefined, false)).toMatch(/NO DECLARADO/);
  });

  it("uno en error o pendiente tampoco", () => {
    for (const estado of ["Error", "Enviado", "Rechazado", "Vencido", "Registrado"]) {
      expect(sinValorFiscal(estado, false)).toMatch(/SIN VALOR FISCAL/);
    }
  });

  it("lo emitido en pruebas se avisa aunque SUNAT lo haya aceptado", () => {
    expect(sinValorFiscal("Aceptado", true)).toMatch(/PRUEBA/);
  });
});

describe("cuándo no", () => {
  it("aceptado y en producción: es un comprobante de verdad", () => {
    expect(sinValorFiscal("Aceptado", false)).toBe("");
  });
});
