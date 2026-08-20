// Enrutado de las acciones sobre comprobantes.
//
// Las tres acciones tienen su propia Cloud Function, pero desplegarlas exige un permiso de
// IAM que la cuenta de despliegue no tiene todavía: existen y devuelven 403. Mientras
// tanto van por `sendToSunat`, que sí tiene política de invocador. Lo que estas pruebas
// fijan es que el cambio de una vía a otra no altera lo que se manda ni lo que se recibe.
import { describe, it, expect, vi, beforeEach } from "vitest";

const llamada = vi.fn();
const nombrePedido = vi.fn();

vi.mock("firebase/functions", () => ({
  httpsCallable: (_fns, nombre) => {
    nombrePedido(nombre);
    return llamada;
  },
}));
vi.mock("../lib/firebase", () => ({ functions: {} }));

import { llamarComprobantes } from "../lib/comprobantes";

beforeEach(() => {
  llamada.mockReset();
  nombrePedido.mockReset();
  llamada.mockResolvedValue({ data: { ok: true } });
});

describe("vía sendToSunat (la activa mientras falte el permiso de IAM)", () => {
  it("llama siempre a sendToSunat, nunca al callable individual", async () => {
    for (const accion of ["previsualizarAnulacion", "anular", "descargar"]) {
      await llamarComprobantes(accion, { collection: "vs-factura", docId: "abc" });
    }
    expect(nombrePedido.mock.calls.flat()).toEqual(["sendToSunat", "sendToSunat", "sendToSunat"]);
  });

  it("añade la acción al payload sin tocar el resto", async () => {
    await llamarComprobantes("anular", { collection: "vs-boleta", docId: "xyz", motivo: "ERROR EN EL MONTO" });
    expect(llamada).toHaveBeenCalledWith({
      collection: "vs-boleta",
      docId: "xyz",
      motivo: "ERROR EN EL MONTO",
      accion: "anular",
    });
  });

  it("devuelve el cuerpo ya desenvuelto, sin el .data del callable", async () => {
    llamada.mockResolvedValue({ data: { pdfUrl: "https://storage/x.pdf" } });
    const res = await llamarComprobantes("descargar", { collection: "vs-factura", docId: "abc" });
    expect(res).toEqual({ pdfUrl: "https://storage/x.pdf" });
  });

  it("deja pasar el error tal cual para que la interfaz lo muestre", async () => {
    llamada.mockRejectedValue(new Error("aborted: SUNAT no aceptó la nota de crédito"));
    await expect(
      llamarComprobantes("anular", { collection: "vs-factura", docId: "abc" })
    ).rejects.toThrow(/no aceptó la nota de crédito/);
  });
});
