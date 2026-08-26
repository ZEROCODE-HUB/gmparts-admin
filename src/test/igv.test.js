// Desglose de IGV.
//
// El canje de cotización a factura emitía `igv: 0` sobre precios con el impuesto ya
// incluido: un comprobante gravado sin IGV declarado lo rechaza SUNAT.
import { describe, it, expect } from "vitest";
import { desglosarIgv, baseIgvDeOrden } from "../lib/igv";

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

describe("baseIgvDeOrden — de qué se fía el panel al facturar una orden", () => {
  // El caso real: la orden CT001-0000230. La app guardó Subtotal 830, IGV 149.40 y
  // Total 979.40; el cliente aprobó 979.40 en el micrositio y la boleta salió por 830.
  // S/149.40 menos, en cada orden facturada desde el panel.
  it("reconoce como NETAS las líneas que cuadran con el Subtotal de la orden", () => {
    expect(baseIgvDeOrden(830, 830, 979.4)).toBe("MAS");
  });

  it("reconoce que ya llevan IGV cuando cuadran con el Total", () => {
    expect(baseIgvDeOrden(979.4, 830, 979.4)).toBe("INCLUIDO");
  });

  it("aguanta el céntimo de redondeo", () => {
    // Los importes vienen redondeados desde tres sitios distintos; una comparación exacta
    // fallaría por el último céntimo y la boleta saldría con la base equivocada.
    expect(baseIgvDeOrden(830.02, 830, 979.4)).toBe("MAS");
    expect(baseIgvDeOrden(979.38, 830, 979.4)).toBe("INCLUIDO");
  });

  it("no decide nada si la orden no guarda importes", () => {
    // Devolver null es lo correcto: manda lo que hubiera en el formulario. Inventar una
    // base aquí es justo lo que producía el error de S/149.40.
    expect(baseIgvDeOrden(830, 0, 0)).toBe(null);
    expect(baseIgvDeOrden(830, undefined, undefined)).toBe(null);
  });

  it("no decide nada si las líneas no cuadran con ninguno de los dos", () => {
    expect(baseIgvDeOrden(500, 830, 979.4)).toBe(null);
  });

  it("con IGV cero prefiere no añadir un 18% de la nada", () => {
    expect(baseIgvDeOrden(830, 830, 830)).toBe("INCLUIDO");
  });

  it("el importe que resulta es el que aprobó el cliente", () => {
    // La prueba que cierra el círculo: base + desglose = lo que vio el cliente.
    const base = baseIgvDeOrden(830, 830, 979.4);
    const { subtotal, igv, total } = desglosarIgv(830, base === "INCLUIDO");
    expect(subtotal).toBe(830);
    expect(igv).toBe(149.4);
    expect(total).toBe(979.4);
  });
});
