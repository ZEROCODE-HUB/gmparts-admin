import { describe, it, expect } from "vitest";
import { normalizarPlaca, validarPlaca, validarAnio, validarVehiculo } from "../lib/vehiculos";

describe("normalizarPlaca", () => {
  it("iguala mayúsculas, guiones y espacios", () => {
    expect(normalizarPlaca("b1d-123")).toBe("B1D123");
    expect(normalizarPlaca(" B1D 123 ")).toBe("B1D123");
  });

  it("hace que dos formas de escribir la misma placa choquen entre sí", () => {
    expect(normalizarPlaca("b1d-123")).toBe(normalizarPlaca("B1D123"));
  });
});

describe("validarPlaca", () => {
  it("acepta las placas reales de la base", () => {
    expect(validarPlaca("B1D123").ok).toBe(true);
    expect(validarPlaca("2907TEST").ok).toBe(true);
    expect(validarPlaca("123ABV").ok).toBe(true);
  });

  it("exige placa", () => {
    expect(validarPlaca("").ok).toBe(false);
    expect(validarPlaca(null).ok).toBe(false);
  });

  it("rechaza demasiado corta o demasiado larga", () => {
    expect(validarPlaca("AB1").ok).toBe(false);
    expect(validarPlaca("ABC123456").ok).toBe(false);
  });

  it("rechaza símbolos", () => {
    expect(validarPlaca("ABC/123").ok).toBe(false);
  });
});

describe("validarAnio", () => {
  const ANIO = 2026;

  it("admite vacío: no siempre se conoce", () => {
    expect(validarAnio("", ANIO).ok).toBe(true);
    expect(validarAnio(null, ANIO).ok).toBe(true);
  });

  it("acepta un año normal y el del modelo siguiente", () => {
    expect(validarAnio("2020", ANIO).ok).toBe(true);
    expect(validarAnio("2027", ANIO).ok).toBe(true);
  });

  it("rechaza el año 3025 que aceptó el formulario en la prueba", () => {
    const r = validarAnio("3025", ANIO);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/1900 y 2027/);
  });

  it("rechaza los valores que hay guardados en la base", () => {
    expect(validarAnio("30073", ANIO).ok).toBe(false);   // 5 cifras
    expect(validarAnio("1234", ANIO).ok).toBe(false);    // anterior a 1900
  });

  it("rechaza texto", () => {
    expect(validarAnio("dos mil", ANIO).ok).toBe(false);
  });
});

describe("validarVehiculo", () => {
  const ANIO = 2026;

  it("acepta un vehículo bien rellenado", () => {
    const r = validarVehiculo({ Placa: "E2E001", anio_de_fabricion: "2020", aniodemodelo: "2021" }, ANIO);
    expect(r.ok).toBe(true);
  });

  it("señala cuál de los dos años está mal", () => {
    const r = validarVehiculo({ Placa: "E2E001", anio_de_fabricion: "2020", aniodemodelo: "3025" }, ANIO);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Año de modelo/);
  });

  it("la placa se comprueba antes que los años", () => {
    const r = validarVehiculo({ Placa: "", anio_de_fabricion: "3025" }, ANIO);
    expect(r.error).toMatch(/placa/i);
  });
});
