// Ciclo de estados de una Orden de Trabajo.
//
// Los estados son los que existen de verdad en Firestore (verificado sobre las 48
// recepciones): Recepción · Diagnóstico · Cotización · Reparación · Finalizado, más
// Anulado. El editor ofrecía "Listo para entrega" y "Entregado", que no existen en ningún
// documento, y no ofrecía "Finalizado", que es el más común.
import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/firebase", () => ({ db: {}, app: {}, auth: {}, functions: {} }));
vi.mock("../lib/algolia", () => ({ searchArticlesIndex: async () => [] }));

import { transicionPermitida, estadosDisponibles } from "../pages/ventas/servicios/OrdenTrabajoEditor";

describe("avance normal del ciclo", () => {
  it("permite el recorrido completo paso a paso", () => {
    expect(transicionPermitida("Recepción", "Diagnóstico")).toBe(true);
    expect(transicionPermitida("Diagnóstico", "Cotización")).toBe(true);
    expect(transicionPermitida("Cotización", "Reparación")).toBe(true);
    expect(transicionPermitida("Reparación", "Finalizado")).toBe(true);
  });

  it("permite quedarse en el mismo estado al editar otros campos", () => {
    for (const e of ["Recepción", "Diagnóstico", "Cotización", "Reparación", "Finalizado"]) {
      expect(transicionPermitida(e, e)).toBe(true);
    }
  });
});

describe("saltos que no deben permitirse", () => {
  it("no se puede finalizar un vehículo recién recibido", () => {
    expect(transicionPermitida("Recepción", "Finalizado")).toBe(false);
    expect(transicionPermitida("Recepción", "Reparación")).toBe(false);
    expect(transicionPermitida("Recepción", "Cotización")).toBe(false);
  });

  it("no se puede reparar sin cotización aprobada", () => {
    expect(transicionPermitida("Diagnóstico", "Reparación")).toBe(false);
    expect(transicionPermitida("Diagnóstico", "Finalizado")).toBe(false);
  });

  it("una orden anulada no revive", () => {
    expect(transicionPermitida("Anulado", "Reparación")).toBe(false);
    expect(transicionPermitida("Anulado", "Recepción")).toBe(false);
  });
});

describe("correcciones", () => {
  it("se puede retroceder un paso si alguien se equivocó", () => {
    expect(transicionPermitida("Diagnóstico", "Recepción")).toBe(true);
    expect(transicionPermitida("Cotización", "Diagnóstico")).toBe(true);
    expect(transicionPermitida("Finalizado", "Reparación")).toBe(true);
  });

  it("pero no se retroceden dos pasos de golpe", () => {
    expect(transicionPermitida("Cotización", "Recepción")).toBe(false);
    expect(transicionPermitida("Finalizado", "Diagnóstico")).toBe(false);
  });
});

describe("opciones que ve el usuario", () => {
  it("el desplegable solo ofrece destinos alcanzables", () => {
    expect(estadosDisponibles("Recepción")).toEqual(["Recepción", "Diagnóstico"]);
    expect(estadosDisponibles("Reparación")).toEqual(["Cotización", "Reparación", "Finalizado"]);
  });

  it("nunca ofrece estados que no existen en la base", () => {
    const todos = estadosDisponibles(null);
    expect(todos).not.toContain("Listo para entrega");
    expect(todos).not.toContain("Entregado");
    expect(todos).toContain("Finalizado");
  });

  it("una orden nueva empieza pudiendo elegir cualquier estado inicial", () => {
    expect(estadosDisponibles(null)).toContain("Recepción");
  });
});
