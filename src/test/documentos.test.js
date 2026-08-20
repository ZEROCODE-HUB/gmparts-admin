import { describe, it, expect } from "vitest";
import {
  validarDocumento,
  validarTipoPersona,
  validarIdentidad,
  documentoValidoParaComprobante,
} from "../lib/documentos";

describe("validarDocumento — DNI", () => {
  it("acepta 8 dígitos", () => {
    expect(validarDocumento("DNI", "46530103").ok).toBe(true);
  });

  it("rechaza el caso que se coló en producción: un DNI de 3 cifras", () => {
    const r = validarDocumento("DNI", "123");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/8 dígitos/);
  });

  it("rechaza letras", () => {
    expect(validarDocumento("DNI", "4653010A").ok).toBe(false);
  });

  it("rechaza vacío", () => {
    expect(validarDocumento("DNI", "").ok).toBe(false);
    expect(validarDocumento("DNI", null).ok).toBe(false);
  });

  it("no le molestan los espacios de alrededor", () => {
    expect(validarDocumento("DNI", "  46530103  ").ok).toBe(true);
  });
});

describe("validarDocumento — RUC", () => {
  it("acepta el RUC real de la empresa", () => {
    expect(validarDocumento("RUC", "20601720621").ok).toBe(true);
  });

  it("acepta persona natural con negocio (empieza por 10)", () => {
    expect(validarDocumento("RUC", "10465301035").ok).toBe(true);
  });

  it("rechaza longitud distinta de 11", () => {
    expect(validarDocumento("RUC", "2060172062").ok).toBe(false);
    expect(validarDocumento("RUC", "1234567890123").ok).toBe(false);
  });

  it("rechaza un prefijo que no existe", () => {
    const r = validarDocumento("RUC", "99601720621");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/empieza por/i);
  });
});

describe("validarDocumento — otros", () => {
  it("acepta carné de extranjería y pasaporte hasta 12 caracteres", () => {
    expect(validarDocumento("CE", "AB12345").ok).toBe(true);
    expect(validarDocumento("PASAPORTE", "X1234567").ok).toBe(true);
  });

  it("rechaza más de 12", () => {
    expect(validarDocumento("CE", "1234567890123").ok).toBe(false);
  });

  it("rechaza un tipo desconocido", () => {
    expect(validarDocumento("LIBRETA", "12345678").ok).toBe(false);
  });
});

describe("validarTipoPersona", () => {
  it("una jurídica necesita RUC", () => {
    expect(validarTipoPersona("Jurídica", "DNI").ok).toBe(false);
    expect(validarTipoPersona("Jurídica", "RUC").ok).toBe(true);
  });

  it("acepta las variantes que hay guardadas en la base", () => {
    expect(validarTipoPersona("Empresa", "DNI").ok).toBe(false);
    expect(validarTipoPersona("Juridica", "DNI").ok).toBe(false);
  });

  it("una persona natural puede tener RUC (10) o DNI", () => {
    expect(validarTipoPersona("Natural", "RUC").ok).toBe(true);
    expect(validarTipoPersona("Natural", "DNI").ok).toBe(true);
  });
});

describe("validarIdentidad", () => {
  it("caza primero la incoherencia de tipo y luego el formato", () => {
    const r = validarIdentidad({ tipoPersona: "Jurídica", tipoDocumento: "DNI", documento: "12345678" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/jurídica/i);
  });

  it("deja pasar un cliente correcto", () => {
    expect(validarIdentidad({ tipoPersona: "Natural", tipoDocumento: "DNI", documento: "46530103" }).ok).toBe(true);
    expect(validarIdentidad({ tipoPersona: "Jurídica", tipoDocumento: "RUC", documento: "20601720621" }).ok).toBe(true);
  });

  it("rechaza el cliente que se creó en la prueba de extremo a extremo", () => {
    expect(validarIdentidad({ tipoPersona: "Natural", tipoDocumento: "DNI", documento: "123" }).ok).toBe(false);
  });
});

describe("documentoValidoParaComprobante", () => {
  it("una factura exige RUC", () => {
    expect(documentoValidoParaComprobante("Factura", "DNI").ok).toBe(false);
    expect(documentoValidoParaComprobante("factura de venta", "RUC").ok).toBe(true);
  });

  it("una boleta admite DNI", () => {
    expect(documentoValidoParaComprobante("Boleta", "DNI").ok).toBe(true);
  });

  it("no estorba a los documentos que no son comprobantes", () => {
    expect(documentoValidoParaComprobante("Cotización", "DNI").ok).toBe(true);
  });
});
