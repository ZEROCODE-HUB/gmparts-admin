import { describe, it, expect, vi, beforeEach } from "vitest";

// `getOTFacturaItems` vive junto a las funciones que hablan con Firestore, así que hay que
// silenciar el módulo de Firebase para poder probarla sin red. Solo se ejercita la rama que
// recibe los diagnósticos ya cargados, que es la que decide los importes.
vi.mock("../lib/firebase", () => ({ db: {}, app: {} }));
vi.mock("../lib/algolia", () => ({ searchArticlesIndex: vi.fn(async () => []) }));
vi.mock("./firestoreDb", () => ({ mapDocKeyToCollection: (k) => k }));
vi.mock("../store/firestoreDb", () => ({ mapDocKeyToCollection: (k) => k }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(async () => ({ docs: [] })),
  getDoc: vi.fn(async () => ({ exists: () => false })), getDocFromServer: vi.fn(),
  setDoc: vi.fn(), addDoc: vi.fn(), deleteDoc: vi.fn(), runTransaction: vi.fn(),
  increment: vi.fn(), query: vi.fn(), where: vi.fn(), Timestamp: { fromDate: (d) => d },
}));

const { getOTFacturaItems } = await import("../store/firestoreStock");

const suma = (items) => Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;

describe("getOTFacturaItems — importes de la orden de trabajo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("la mano de obra es un importe, no una tarifa por hora", async () => {
    // Este es el caso que descuadró la prueba de extremo a extremo: el cliente aprobó
    // S/ 153.33 en el micrositio y la boleta salía por S/ 273.33, porque los S/ 120 de mano
    // de obra se multiplicaban por las 2 horas.
    const ot = {
      diagnosticos: [{
        nombreFalla: "Filtro de aceite saturado",
        solucion: "Cambio de aceite y filtro",
        horasTrabajo: 2,
        manoDeObra: 120,
        repuestos: [{ codigo: "LUB-00234", descripcion: "ACEITE 10W 30", cantidad: 1, precio: 33.33 }],
      }],
    };

    const items = await getOTFacturaItems(ot);
    const manoObra = items.find((i) => i.tipo === "mano_obra");

    expect(manoObra.cant).toBe(1);
    expect(manoObra.total).toBe(120);
    expect(suma(items)).toBe(153.33);
  });

  it("las horas se conservan en la descripción, que es información útil", async () => {
    const items = await getOTFacturaItems({
      diagnosticos: [{ nombreFalla: "Frenos", horasTrabajo: 3, manoDeObra: 200, repuestos: [] }],
    });
    expect(items[0].descripcion).toMatch(/3 h/);
  });

  it("con una sola hora no se ensucia la descripción", async () => {
    const items = await getOTFacturaItems({
      diagnosticos: [{ nombreFalla: "Frenos", horasTrabajo: 1, manoDeObra: 200, repuestos: [] }],
    });
    expect(items[0].descripcion).not.toMatch(/h\)/);
  });

  it("el repuesto se valora a su precio por la cantidad", async () => {
    const items = await getOTFacturaItems({
      diagnosticos: [{
        nombreFalla: "x", manoDeObra: 0,
        repuestos: [{ codigo: "A", descripcion: "Pieza", cantidad: 4, precio: 25 }],
      }],
    });
    expect(items).toHaveLength(1);
    expect(items[0].total).toBe(100);
  });

  it("un repuesto sin precio no inventa importe", async () => {
    const items = await getOTFacturaItems({
      diagnosticos: [{ nombreFalla: "x", manoDeObra: 0, repuestos: [{ codigo: "A", cantidad: 2 }] }],
    });
    expect(items[0].total).toBe(0);
  });

  it("una orden sin diagnósticos no genera líneas", async () => {
    expect(await getOTFacturaItems({ diagnosticos: [] })).toEqual([]);
    expect(await getOTFacturaItems(null)).toEqual([]);
  });

  it("acepta los nombres de campo de la app móvil", async () => {
    const items = await getOTFacturaItems({
      diagnosticos: [{
        Nombre_falla: "Embrague", Horas_trabajo: 5, Mano_de_obra: 300,
        Repuestos: [{ Codigo: "B", nombre: "Kit", cantidad: 1, precio: 50 }],
      }],
    });
    expect(suma(items)).toBe(350);
  });
});
