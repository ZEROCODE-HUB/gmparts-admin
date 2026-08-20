// Desglose de IGV.
//
// El canje de cotización a factura emitía `igv: 0` sobre precios con el impuesto ya
// incluido: un comprobante gravado sin IGV declarado lo rechaza SUNAT.
import { describe, it, expect } from "vitest";
import { desglosarIgv } from "../lib/igv";

describe("precio con IGV incluido", () => {
  it("extrae el impuesto en vez de sumarlo: el total no cambia", () => {
    const { subtotal, igv, total } = desglosarIgv(118, true);
    expect(total).toBe(118);
    expect(subtotal).toBe(100);
    expect(igv).toBe(18);
  });

  it("nunca deja el IGV en cero sobre un importe gravado", () => {
    const { igv } = desglosarIgv(1234.56, true);
    expect(igv).toBeGreaterThan(0);
  });
});

describe("precio sin IGV", () => {
  it("lo suma por encima", () => {
    const { subtotal, igv, total } = desglosarIgv(100, false);
    expect(subtotal).toBe(100);
    expect(igv).toBe(18);
    expect(total).toBe(118);
  });
});

describe("cuadre", () => {
  it("subtotal + igv da el total, con dos decimales exactos", () => {
    for (const suma of [0, 1, 33.33, 99.99, 1234.56, 7777.77]) {
      for (const incluido of [true, false]) {
        const { subtotal, igv, total } = desglosarIgv(suma, incluido);
        expect(+(subtotal + igv).toFixed(2)).toBe(total);
        for (const n of [subtotal, igv, total]) {
          expect(Number.isInteger(Math.round(n * 100))).toBe(true);
        }
      }
    }
  });

  it("un importe vacío no produce NaN", () => {
    expect(desglosarIgv(undefined, true)).toEqual({ subtotal: 0, igv: 0, total: 0 });
    expect(desglosarIgv(null, false)).toEqual({ subtotal: 0, igv: 0, total: 0 });
  });
});
