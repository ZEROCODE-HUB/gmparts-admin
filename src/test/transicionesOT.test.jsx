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
    // El ciclo del Excel entero, cita incluida. «Cotización» ya no salta a «Reparación»:
    // entre enviar la propuesta y tener el coche en el elevador hay dos pasos que antes se
    // confundían en uno — esperar al cliente, y asignar técnico, bahía y fecha.
    const ciclo = ["Cita programada", "Recepción", "Diagnóstico", "Cotización",
      "Esperando aprobación", "Programado", "Reparación", "Listo para entrega", "Finalizado"];
    for (let i = 0; i < ciclo.length - 1; i++) {
      expect(transicionPermitida(ciclo[i], ciclo[i + 1]), `${ciclo[i]} -> ${ciclo[i + 1]}`).toBe(true);
    }
  });

  it("no se salta pasos del ciclo", () => {
    expect(transicionPermitida("Cotización", "Reparación")).toBe(false);
    expect(transicionPermitida("Cita programada", "Diagnóstico")).toBe(false);
    expect(transicionPermitida("Esperando aprobación", "Reparación")).toBe(false);
  });

  it("se puede anular desde cualquier punto salvo una vez cerrada", () => {
    for (const e of ["Cita programada", "Recepción", "Diagnóstico", "Cotización",
      "Esperando aprobación", "Programado", "Reparación", "Listo para entrega"]) {
      expect(transicionPermitida(e, "Anulado"), e).toBe(true);
    }
  });

  it("permite quedarse en el mismo estado al editar otros campos", () => {
    for (const e of ["Cita programada", "Recepción", "Diagnóstico", "Cotización",
      "Esperando aprobación", "Programado", "Reparación", "Listo para entrega", "Finalizado"]) {
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
    expect(estadosDisponibles("Reparación")).toEqual(
      ["Programado", "Reparación", "Listo para entrega", "Finalizado"]);
  });

  it("nunca ofrece estados que no existen en la base", () => {
    // «Listo para entrega» SÍ existe desde que el taller puede cerrar su parte sin esperar a
    // que el cliente conteste la encuesta; lo escribe la app al pulsar «Está listo para
    // entregar». «Entregado» sigue sin existir en ningún documento.
    const todos = estadosDisponibles(null);
    expect(todos).toContain("Listo para entrega");
    expect(todos).not.toContain("Entregado");
    expect(todos).toContain("Finalizado");
  });

  it("el taller puede cerrar la orden sin pasar por el cliente", () => {
    // Este es el motivo del estado: antes «Finalizado» solo lo escribía el cliente al
    // contestar la encuesta, y una orden acabada cuyo cliente no responde se quedaba en
    // «Reparación» para siempre.
    expect(transicionPermitida("Reparación", "Listo para entrega")).toBe(true);
    expect(transicionPermitida("Listo para entrega", "Finalizado")).toBe(true);
  });

  it("se puede deshacer un cierre prematuro", () => {
    expect(transicionPermitida("Listo para entrega", "Reparación")).toBe(true);
    expect(transicionPermitida("Finalizado", "Listo para entrega")).toBe(true);
  });

  it("no se salta el trabajo para llegar a listo para entrega", () => {
    expect(transicionPermitida("Recepción", "Listo para entrega")).toBe(false);
    expect(transicionPermitida("Cotización", "Listo para entrega")).toBe(false);
  });

  it("una orden nueva empieza pudiendo elegir cualquier estado inicial", () => {
    expect(estadosDisponibles(null)).toContain("Recepción");
  });
});
