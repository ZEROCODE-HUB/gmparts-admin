// Regresión de las correcciones P0 de la auditoría 2026-08-16.
// Cada caso reproduce el bug original: si alguien revierte el arreglo, el test falla.
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Doble de Firestore ────────────────────────────────────────────────────────
// Registra las escrituras para poder afirmar sobre la colección de destino.
const escrituras = [];
const subcolecciones = {}; // "recepciones/<id>/diagnosticos" → [docs]

vi.mock("../lib/firebase", () => ({
  db: { __fake: true },
  app: { options: { projectId: "test" } },
  auth: {},
  functions: {},
}));
vi.mock("../lib/algolia", () => ({ searchArticlesIndex: async () => [] }));

vi.mock("firebase/firestore", () => {
  const ruta = (...partes) => partes.filter((p) => typeof p === "string").join("/");
  return {
    collection: (_db, ...partes) => ({ __path: ruta(...partes) }),
    doc: (_db, ...partes) => {
      if (partes.length === 0) throw new TypeError("doc() sin ruta");
      return { __path: ruta(...partes), id: partes[partes.length - 1] };
    },
    setDoc: async (ref, data) => { escrituras.push({ tipo: "set", path: ref.__path, data }); },
    addDoc: async (ref, data) => { escrituras.push({ tipo: "add", path: ref.__path, data }); return { id: "nuevo-id" }; },
    deleteDoc: async (ref) => { escrituras.push({ tipo: "delete", path: ref.__path }); },
    getDoc: async () => ({ exists: () => false, data: () => ({}) }),
    getDocFromServer: async () => ({ exists: () => true }),
    getDocs: async (q) => {
      const path = q?.__path || "";
      const docs = (subcolecciones[path] || []).map((d) => ({ id: d.id, data: () => d }));
      return { docs, empty: docs.length === 0, size: docs.length };
    },
    runTransaction: async (_db, fn) => fn({
      get: async () => ({ exists: () => false, data: () => ({}) }),
      set: () => {}, update: () => {},
    }),
    increment: (n) => ({ __increment: n }),
    query: (col) => col,
    where: () => ({}),
    orderBy: () => ({}),
    limit: () => ({}),
    onSnapshot: () => () => {},
    Timestamp: { fromDate: (d) => ({ __ts: d.toISOString() }) },
  };
});

import { mapDocKeyToCollection } from "../store/firestoreDb";
import {
  esCredito, normalizaFormaPago, createOrUpdateCreditAccount,
  getOTFacturaItems, marcarRecepcionFacturada, firestoreSaveDocument,
} from "../store/firestoreStock";

beforeEach(() => {
  escrituras.length = 0;
  for (const k of Object.keys(subcolecciones)) delete subcolecciones[k];
});

// ── P0-1 ──────────────────────────────────────────────────────────────────────
describe("P0-1 · la Orden de Trabajo vive en recepciones", () => {
  it("vs-orden apunta a la misma colección que lee la lista y la app móvil", () => {
    expect(mapDocKeyToCollection("vs-orden")).toBe("recepciones");
  });

  it("los comprobantes de servicio siguen yendo a Facturas", () => {
    for (const k of ["vs-factura", "vs-boleta", "vs-cotizacion", "vs-notas"]) {
      expect(mapDocKeyToCollection(k)).toBe("Facturas");
    }
  });

  it("ventas de artículos y compras siguen en FacturasVentasCompras", () => {
    for (const k of ["va-factura", "c-factura", "al-notaventa"]) {
      expect(mapDocKeyToCollection(k)).toBe("FacturasVentasCompras");
    }
  });
});

// ── P0-2 ──────────────────────────────────────────────────────────────────────
describe("P0-2 · cuenta por cobrar de documentos a crédito", () => {
  it("reconoce el 'Crédito' con tilde que guarda la interfaz", () => {
    expect(esCredito("Crédito")).toBe(true);   // el valor real del <select>
    expect(esCredito("Credito")).toBe(true);
    expect(esCredito("CRÉDITO")).toBe(true);
    expect(esCredito(" crédito ")).toBe(true);
    expect(esCredito("Contado")).toBe(false);
    expect(esCredito("CONTADO")).toBe(false);  // forma que escribe la app Flutter
    expect(esCredito(undefined)).toBe(false);
  });

  it("normaliza sin depender de tildes ni mayúsculas", () => {
    expect(normalizaFormaPago("CONTADO")).toBe("contado");
    expect(normalizaFormaPago("Crédito")).toBe("credito");
  });

  it("crea la cuenta sin lanzar TypeError (el parámetro ya no tapa doc())", async () => {
    await expect(
      createOrUpdateCreditAccount(
        { formaPago: "Crédito", total: 236, cliente: "ACME SAC", serie: "F001", numero: "000010", fecha: "2026-08-16" },
        "doc123",
        "va-factura"
      )
    ).resolves.toBeUndefined();

    const cuenta = escrituras.find((e) => e.path === "cuentasPorCobrar/doc123");
    expect(cuenta).toBeDefined();
    expect(cuenta.data.montoTotal).toBe(236);
    expect(cuenta.data.saldoPendiente).toBe(236);
    expect(cuenta.data.tipoCuenta).toBe("Cobrar");
    expect(cuenta.data.estado).toBe("Pendiente");
  });

  it("una compra a crédito genera cuenta por PAGAR", async () => {
    await createOrUpdateCreditAccount({ formaPago: "Crédito", total: 100, proveedor: "Repuestos SA" }, "compra1", "c-factura");
    const cuenta = escrituras.find((e) => e.path === "cuentasPorCobrar/compra1");
    expect(cuenta.data.tipoCuenta).toBe("Pagar");
    expect(cuenta.data.clientenombre).toBe("Repuestos SA");
  });

  it("al pasar de crédito a contado no deja la cuenta creada", async () => {
    await createOrUpdateCreditAccount({ formaPago: "Contado", total: 100 }, "doc9", "va-factura");
    expect(escrituras.find((e) => e.tipo === "set" && e.path === "cuentasPorCobrar/doc9")).toBeUndefined();
  });
});

// ── P0-3 ──────────────────────────────────────────────────────────────────────
describe("P0-3 · ítems de factura desde la Orden de Trabajo", () => {
  it("convierte los diagnósticos embebidos en líneas de mano de obra y repuestos", async () => {
    const items = await getOTFacturaItems({
      id: "ot1",
      diagnosticos: [{
        nombreFalla: "Cambio de amortiguadores",
        horasTrabajo: 2,
        manoDeObra: 140,
        repuestos: [{ descripcion: "Amortiguador", codigo: "ART-9", cantidad: 2, precio: 168 }],
      }],
    });

    expect(items).toHaveLength(2);
    const mo = items.find((i) => i.tipo === "mano_obra");

    // La expectativa cambió a propósito el 2026-08-18. Antes esta prueba fijaba
    // `total: 280` (140 × 2 horas), tratando la mano de obra como una tarifa horaria. La
    // prueba de extremo a extremo demostró que eso descuadra el negocio: el cliente aprueba
    // en el micrositio un importe —donde la mano de obra se muestra tal cual, sin horas— y
    // la factura le llegaba multiplicada. Se aprobaron S/ 153.33 y la boleta salía por
    // S/ 273.33. `Mano de obra (S/)` es un importe; las horas solo se informan.
    expect(mo.descripcion).toBe("Mano de obra (2 h): Cambio de amortiguadores");
    expect(mo.cant).toBe(1);
    expect(mo.total).toBe(140);
    const rep = items.find((i) => i.tipo === "repuesto");
    expect(rep.codigo).toBe("ART-9");
    expect(rep.total).toBe(336);         // 168 × 2
  });

  it("lee la subcolección de la app móvil cuando no hay diagnósticos embebidos", async () => {
    subcolecciones["recepciones/ot2/diagnosticos"] = [{
      id: "d1",
      Nombre_falla: "Fuga de aceite",
      Horas_trabajo: 1,
      Mano_de_obra: 90,
      Repuestos: [{ nombre: "Empaque", cantidad: 1, precio: 25 }],
    }];

    const items = await getOTFacturaItems({ id: "ot2" });
    expect(items).toHaveLength(2);
    expect(items[0].descripcion).toBe("Mano de obra: Fuga de aceite");
    expect(items[1].descripcion).toBe("Empaque");
    expect(items[1].total).toBe(25);
  });

  it("devuelve vacío si la orden no tiene importes, sin reventar", async () => {
    expect(await getOTFacturaItems(null)).toEqual([]);
    expect(await getOTFacturaItems({ id: "sin-diags" })).toEqual([]);
  });
});

// ── P0-4 ──────────────────────────────────────────────────────────────────────
describe("P0-4 · marcado de orden facturada", () => {
  it("escribe facturado=true en la recepción de Firestore, no en localStorage", async () => {
    await marcarRecepcionFacturada("rec-77", { status: "Finalizado" });
    const w = escrituras.find((e) => e.path === "recepciones/rec-77");
    expect(w).toBeDefined();
    expect(w.data.facturado).toBe(true);
    expect(w.data.status).toBe("Finalizado");
  });

  it("no hace nada si no recibe id", async () => {
    await marcarRecepcionFacturada("");
    expect(escrituras).toHaveLength(0);
  });
});

// ── P0-5 ──────────────────────────────────────────────────────────────────────
describe("P0-5 · la Orden de Trabajo no mueve inventario", () => {
  const orden = {
    cliente: "PRUEBA", clienteDoc: "46530103", placa: "E2E001", estado: "Recepción",
    diagnosticos: [{
      nombreFalla: "Filtro saturado", manoDeObra: 120, horasTrabajo: 2,
      repuestos: [{ codigo: "LUB-00234", descripcion: "Aceite", cantidad: 1, precio: 33.33, articleId: "art-1" }],
    }],
  };

  it("guardar una orden no escribe en el catálogo de artículos", async () => {
    // El stock se descontaba al guardar la orden Y otra vez al facturarla. Y como la
    // reconciliación de la edición dependía de `OPERATION`, que no tiene entrada para
    // «vs-orden», cada vez que se reabría y guardaba la misma orden se comía otra unidad
    // sin revertir la anterior.
    await firestoreSaveDocument("vs-orden", orden);
    const tocaArticulos = escrituras.filter((e) => String(e.path).startsWith("Articles"));
    expect(tocaArticulos).toEqual([]);
  });

  it("tampoco escribe kárdex: el movimiento lo genera la facturación", async () => {
    await firestoreSaveDocument("vs-orden", orden);
    expect(escrituras.filter((e) => String(e.path).startsWith("Kardex_element"))).toEqual([]);
  });

  it("al editar conserva el código que ya tenía, no lo renumera", async () => {
    // Se vio en producción: volver a guardar la misma orden la pasaba de CT001-0000231 a
    // CT001-0000232. El formulario no arrastra `codeCT`, así que hay que mirarlo en la base.
    const { getDoc } = await import("firebase/firestore");
    const espia = vi.spyOn({ getDoc }, "getDoc");
    escrituras.length = 0;
    await firestoreSaveDocument("vs-orden", { ...orden, id: "rec-1" });
    const enRecepciones = escrituras.filter((e) => String(e.path).startsWith("recepciones/rec-1"));
    expect(enRecepciones.length).toBeGreaterThan(0);
    espia.mockRestore();
  });

  it("pero sí guarda la recepción y le pone su código de documento", async () => {
    await firestoreSaveDocument("vs-orden", orden);
    const enRecepciones = escrituras.filter((e) => String(e.path).startsWith("recepciones"));
    expect(enRecepciones.length).toBeGreaterThan(0);
    // `codeCT` es lo que la lista de Órdenes de Trabajo imprime en la columna «Documento»;
    // sin él la orden salía con el hueco en blanco.
    const conCodigo = enRecepciones.find((e) => e.data?.codeCT);
    expect(conCodigo?.data.codeCT).toMatch(/^CT001-\d{7}$/);
  });
});
