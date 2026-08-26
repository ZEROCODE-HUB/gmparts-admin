// La etapa 07 del Excel es decir QUIÉN, DÓNDE y CUÁNDO. El técnico ya se guardaba; la bahía
// y la fecha programada son nuevas, y van por `toRecepcionSchema`, que es una LISTA BLANCA:
// lo que no esté nombrado ahí se pierde al guardar sin ningún aviso.
//
// Ese fallo ya ocurrió una vez: `tecnicoservicioRef` se calculaba en el editor y esta función
// lo descartaba, así que 0 de 48 recepciones lo tenían. Estas pruebas existen para que no se
// repita con los campos nuevos.
import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/firebase", () => ({ db: {}, app: {} }));
vi.mock("../lib/algolia", () => ({ searchArticlesIndex: vi.fn(async () => []) }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(), getDocFromServer: vi.fn(), setDoc: vi.fn(), addDoc: vi.fn(),
  deleteDoc: vi.fn(), runTransaction: vi.fn(), increment: vi.fn(), query: vi.fn(),
  where: vi.fn(), Timestamp: { fromDate: (d) => ({ __fecha: d.toISOString().slice(0, 10) }) },
}));

const { toRecepcionSchema } = await import("../store/firestoreStock");

const base = { cliente: "Cliente X", clienteDoc: "12345678", placa: "ABC123" };

describe("toRecepcionSchema — datos de la asignación y de la cita", () => {
  it("guarda la bahía", () => {
    expect(toRecepcionSchema({ ...base, bahia: "B-2" }).bahia).toBe("B-2");
  });

  it("guarda la fecha programada como Timestamp, no como texto", () => {
    const out = toRecepcionSchema({ ...base, fechaProgramada: "2026-09-01" });
    expect(out.fechaProgramada).toEqual({ __fecha: "2026-09-01" });
  });

  it("guarda la fecha de la cita", () => {
    expect(toRecepcionSchema({ ...base, fechaCita: "2026-09-03" })).toMatchObject({
      fechaCita: { __fecha: "2026-09-03" },
    });
  });

  it("dejar una fecha en blanco la borra, no la ignora", () => {
    // Si no se distinguiera, no habría forma de desprogramar una orden ya programada.
    expect(toRecepcionSchema({ ...base, fechaProgramada: "" }).fechaProgramada).toBe(null);
  });

  it("no inventa campos cuando el formulario no los trae", () => {
    const out = toRecepcionSchema(base);
    expect("bahia" in out).toBe(false);
    expect("fechaProgramada" in out).toBe(false);
    expect("fechaCita" in out).toBe(false);
  });

  it("sigue conservando la referencia al técnico", () => {
    const ref = { path: "users/abc" };
    expect(toRecepcionSchema({ ...base, tecnicoservicioRef: ref }).tecnicoservicioRef).toBe(ref);
  });

  it("una fecha ilegible no se guarda a medias", () => {
    expect(toRecepcionSchema({ ...base, fechaCita: "no es una fecha" }).fechaCita).toBe(null);
  });
});
