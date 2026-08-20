// Numeración de comprobantes.
//
// Dos cosas que hay que dejar clavadas: la numeración se cuenta por SERIE (no por tipo de
// documento, que es como estaba y rompe la continuidad en cuanto se usa más de una serie),
// y los correlativos de prueba salen de un contador aparte para no gastar los reales.
import { describe, it, expect, vi, afterEach } from "vitest";
import { claveCorrelativo, validarSerie, esDocumentoFiscal, serieSugerida } from "../lib/series";

// El modo se lee de import.meta.env; por defecto los tests corren en pruebas.
const enProduccion = (fn) => {
  vi.stubEnv("VITE_FACTILIZA_MODO", "produccion");
  try { return fn(); } finally { vi.unstubAllEnvs(); }
};

afterEach(() => vi.unstubAllEnvs());

describe("de qué contador sale cada número", () => {
  it("en pruebas usa un contador aparte, para no quemar numeración real", () => {
    expect(claveCorrelativo("vs-factura", "F001")).toBe("PRUEBA-F001");
    expect(claveCorrelativo("va-boleta", "B001")).toBe("PRUEBA-B001");
  });

  it("en producción cuenta por la serie a secas", () => {
    enProduccion(() => {
      expect(claveCorrelativo("vs-factura", "F001")).toBe("F001");
      expect(claveCorrelativo("va-notacredito", "FC01")).toBe("FC01");
    });
  });

  it("dos series del mismo tipo llevan contadores independientes", () => {
    enProduccion(() => {
      expect(claveCorrelativo("vs-factura", "F001")).not.toBe(claveCorrelativo("vs-factura", "F002"));
    });
  });

  it("los documentos internos siguen contando por tipo, no por serie", () => {
    expect(claveCorrelativo("vs-cotizacion", "C001")).toBe("vs-cotizacion");
    expect(claveCorrelativo("vs-orden", "")).toBe("vs-orden");
  });

  it("si no se indica serie, cae en la sugerida del tipo", () => {
    enProduccion(() => expect(claveCorrelativo("vs-factura", "")).toBe("F001"));
  });
});

describe("qué documentos van a SUNAT", () => {
  it("facturas, boletas, notas de crédito y guías sí", () => {
    for (const k of ["vs-factura", "vs-boleta", "va-factura", "va-notacredito", "va-guia"]) {
      expect(esDocumentoFiscal(k)).toBe(true);
    }
  });

  it("cotizaciones, notas de venta y órdenes de trabajo no", () => {
    for (const k of ["vs-cotizacion", "vs-notas", "al-notaventa", "vs-orden"]) {
      expect(esDocumentoFiscal(k)).toBe(false);
    }
  });
});

describe("series que SUNAT rechazaría", () => {
  it("caza las que hay escritas a mano en Firestore", () => {
    // Estas cuatro existen de verdad en la base de producción.
    for (const mala of ["123123", "1234", "NS", "0001"]) {
      expect(validarSerie("vs-factura", mala)).toMatch(/no es una serie válida/);
    }
  });

  it("exige la letra que corresponde al tipo", () => {
    expect(validarSerie("vs-factura", "B001")).toMatch(/empiece por «F»/);
    expect(validarSerie("vs-boleta", "F001")).toMatch(/empiece por «B»/);
    expect(validarSerie("va-guia", "F001")).toMatch(/empiece por «T»/);
  });

  it("acepta las válidas", () => {
    expect(validarSerie("vs-factura", "F001")).toBe("");
    expect(validarSerie("vs-boleta", "B001")).toBe("");
    expect(validarSerie("va-guia", "T001")).toBe("");
  });

  it("no molesta con los documentos internos, que no tienen formato obligatorio", () => {
    expect(validarSerie("vs-cotizacion", "loquesea")).toBe("");
    expect(validarSerie("vs-notas", "")).toBe("");
  });

  it("todas las series sugeridas pasan su propia validación", () => {
    for (const k of ["vs-factura", "vs-boleta", "va-factura", "va-boleta", "va-guia"]) {
      expect(validarSerie(k, serieSugerida(k))).toBe("");
    }
  });
});
