import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  toFactilizaDate,
  tipoDocIdentidad,
  extractFactilizaError,
  buildFactilizaPayload,
  validarPayload,
  RUC_EMPRESA,
} = require("../../functions/factiliza.js");

const ISO_SUNAT = /^\d{4}-\d{2}-\d{2}T00:00:00-05:00$/;

// Imita el objeto Timestamp que Firestore devuelve en los documentos creados
// por la app Flutter — la causa del HTTP 400 de Factiliza.
function fakeTimestamp(seconds) {
  return { _seconds: seconds, _nanoseconds: 0, toDate: () => new Date(seconds * 1000) };
}

describe("toFactilizaDate", () => {
  it("convierte un Timestamp de Firestore (regresión del HTTP 400)", () => {
    // Antes producía "[object Object]T00:00:00-05:00"
    const ts = fakeTimestamp(1767337200); // 2026-01-02 07:00 UTC = 02:00 Lima
    expect(toFactilizaDate(ts)).toBe("2026-01-02T00:00:00-05:00");
    expect(String(ts) + "T00:00:00-05:00").toContain("[object Object]");
  });

  it("soporta un Timestamp sin método toDate (objeto plano _seconds)", () => {
    expect(toFactilizaDate({ _seconds: 1767337200, _nanoseconds: 0 })).toBe("2026-01-02T00:00:00-05:00");
  });

  it("deja intacta una fecha ya normalizada YYYY-MM-DD", () => {
    expect(toFactilizaDate("2026-07-21")).toBe("2026-07-21T00:00:00-05:00");
  });

  it("convierte el formato DD/MM/YYYY que usa la app Flutter", () => {
    expect(toFactilizaDate("2/1/2026")).toBe("2026-01-02T00:00:00-05:00");
    expect(toFactilizaDate("21/07/2026")).toBe("2026-07-21T00:00:00-05:00");
  });

  it("acepta Date e ISO completo, usando la fecha calendario de Lima", () => {
    expect(toFactilizaDate(new Date("2025-10-28T03:03:15Z"))).toBe("2025-10-27T00:00:00-05:00");
    expect(toFactilizaDate("2025-10-28T03:03:15.703Z")).toBe("2025-10-27T00:00:00-05:00");
  });

  it("nunca devuelve un valor no parseable, incluso con basura o vacío", () => {
    for (const v of [undefined, null, "", "no-es-fecha", {}, 0, NaN]) {
      expect(toFactilizaDate(v)).toMatch(ISO_SUNAT);
    }
  });
});

describe("tipoDocIdentidad (catálogo SUNAT 06)", () => {
  it("mapea los tipos conocidos", () => {
    expect(tipoDocIdentidad("RUC", "20601720621")).toBe("6");
    expect(tipoDocIdentidad("DNI", "12345678")).toBe("1");
    expect(tipoDocIdentidad("CE", "000111")).toBe("4");
    expect(tipoDocIdentidad("Pasaporte", "X1")).toBe("7");
  });

  it("deduce por longitud cuando no hay tipo declarado", () => {
    expect(tipoDocIdentidad("", "20601720621")).toBe("6");
    expect(tipoDocIdentidad("", "12345678")).toBe("1");
    expect(tipoDocIdentidad("", "abc")).toBe("0");
  });
});

describe("extractFactilizaError", () => {
  it("desglosa el error de validación de ASP.NET que devolvió Factiliza", () => {
    const real = {
      title: "One or more validation errors occurred.",
      status: 400,
      errors: {
        dCInvoiceDTO: ["The dCInvoiceDTO field is required."],
        "$.fecha_Emision": ["The JSON value could not be converted to System.DateTime."],
      },
    };
    const msg = extractFactilizaError(real);
    expect(msg).toContain("One or more validation errors occurred.");
    expect(msg).toContain("dCInvoiceDTO");
    expect(msg).toContain("fecha_Emision");
  });

  it("lee el 401 y el CDR de SUNAT", () => {
    expect(extractFactilizaError({ title: "Unauthorized", status: 401 })).toBe("Unauthorized");
    expect(extractFactilizaError({ data: { sunatResponse: { cdrResponse: { description: "Aceptado" } } } })).toBe("Aceptado");
  });

  it("no revienta con entradas vacías", () => {
    expect(extractFactilizaError(null)).toBe("");
    expect(extractFactilizaError({})).toBe("");
  });
});

describe("buildFactilizaPayload", () => {
  const docBase = {
    serie: "F001",
    numero: "000123",
    cliente: "GEAR MOTOR PARTS SAC",
    clienteDoc: "20601720621",
    tipoDoc: "RUC",
    direccion: "Av. Industrial 500",
    tipoIgv: "INCLUIDO",
    items: [{ codigo: "ART-001", descripcion: "Filtro", cant: 2, pu: 118 }],
  };

  it("genera fecha_Emision válida desde un Timestamp de Firestore", () => {
    const { payload } = buildFactilizaPayload({ ...docBase, Fecha: fakeTimestamp(1767337200) }, "va-factura");
    expect(payload.fecha_Emision).toMatch(ISO_SUNAT);
    expect(payload.fecha_Emision).not.toContain("[object Object]");
    expect(payload.forma_pago[0].fecha_Pago).toMatch(ISO_SUNAT);
  });

  it("usa el RUC emisor correcto", () => {
    const { payload } = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-factura");
    expect(payload.empresa_Ruc).toBe("20601720621");
    expect(RUC_EMPRESA).toBe("20601720621");
  });

  it("calcula IGV incluido y arma el detalle", () => {
    const { payload } = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-factura");
    expect(payload.detalle).toHaveLength(1);
    expect(payload.monto_Oper_Gravadas).toBeCloseTo(200, 1);
    expect(payload.monto_Igv).toBeCloseTo(36, 1);
    expect(payload.monto_Imp_Venta).toBeCloseTo(236, 1);
  });

  it("elige tipo de documento y endpoint según el docKey", () => {
    const f = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-factura");
    expect(f.payload.tipo_Doc).toBe("01");
    expect(f.endpoint).toContain("/invoice/send");

    const b = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21", tipoDoc: "DNI", clienteDoc: "12345678" }, "va-boleta");
    expect(b.payload.tipo_Doc).toBe("03");
    expect(b.payload.cliente_Tipo_Doc).toBe("1");

    const nc = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-notacredito");
    expect(nc.payload.tipo_Doc).toBe("07");
    expect(nc.endpoint).toContain("/note/send");
    expect(nc.payload.forma_pago).toBeUndefined();

    const g = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-guia");
    expect(g.payload.tipo_Doc).toBe("09");
    expect(g.endpoint).toContain("/despatch/send");
  });

  it("apunta al host de producción, no al de QA que devolvía 404", () => {
    const { endpoint } = buildFactilizaPayload({ ...docBase, fecha: "2026-07-21" }, "va-factura");
    expect(endpoint).toContain("https://apife.factiliza.com");
    expect(endpoint).not.toContain("apife-qa");
  });
});

describe("validarPayload", () => {
  const ok = {
    tipo_Doc: "01",
    serie: "F001",
    correlativo: "000123",
    cliente_Num_Doc: "20601720621",
    cliente_Tipo_Doc: "6",
    cliente_Razon_Social: "GEAR MOTOR PARTS SAC",
    detalle: [{}],
  };

  it("acepta un documento completo", () => {
    expect(validarPayload(ok)).toBe("");
  });

  it("reporta los campos faltantes en español", () => {
    const msg = validarPayload({ ...ok, serie: "", correlativo: "" });
    expect(msg).toContain("serie");
    expect(msg).toContain("número correlativo");
  });

  it("rechaza una Factura a cliente sin RUC antes de llamar al API", () => {
    const msg = validarPayload({ ...ok, cliente_Tipo_Doc: "1", cliente_Num_Doc: "12345678" });
    expect(msg).toContain("Factura requiere que el cliente tenga RUC");
  });

  it("rechaza un documento sin ítems", () => {
    expect(validarPayload({ ...ok, detalle: [] })).toContain("al menos un ítem");
  });
});
