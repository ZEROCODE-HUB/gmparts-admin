import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATALOG_SEED, CATALOG_MAP, CATALOG_NAME_FIELD, addCatalogEntry, editCatalogEntry, deleteCatalogEntry } from "../store/firestoreDb";
import { renderHook, waitFor } from "@testing-library/react";
import { useCatalog } from "../store/useCatalog";

// Mock Firebase
vi.mock("../lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "mocked-col"),
  query: vi.fn(() => "mocked-query"),
  orderBy: vi.fn(() => "mocked-order"),
  onSnapshot: vi.fn((_q, cb) => {
    cb({ docs: [] });
    return vi.fn();
  }),
  addDoc: vi.fn(() => Promise.resolve({ id: "new-id" })),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => "mocked-doc"),
}));

import { addDoc, setDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";

describe("CATALOG_SEED structure", () => {
  it("should have 7 catalog entries", () => {
    expect(Object.keys(CATALOG_SEED)).toHaveLength(7);
  });

  it("should have correct catalog keys", () => {
    const keys = Object.keys(CATALOG_SEED).sort();
    expect(keys).toEqual([
      "cat-encargado", "cat-grupo", "cat-marca",
      "cat-subgrupo", "cat-unidad", "cat-vehmarca",
      "cat-vehmodelo",
    ].sort());
  });

  it("cat-marca should have string seeds", () => {
    CATALOG_SEED["cat-marca"].forEach((s) => {
      expect(typeof s).toBe("string");
    });
  });

  it("cat-grupo should have string seeds", () => {
    CATALOG_SEED["cat-grupo"].forEach((s) => {
      expect(typeof s).toBe("string");
    });
  });

  it("cat-subgrupo should have object seeds with name and grupo", () => {
    CATALOG_SEED["cat-subgrupo"].forEach((s) => {
      expect(typeof s).toBe("object");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("grupo");
      expect(typeof s.name).toBe("string");
      expect(typeof s.grupo).toBe("string");
    });
  });

  it("cat-subgrupo seeds should have correct grupo associations", () => {
    const subgrupos = CATALOG_SEED["cat-subgrupo"];
    const filtros = subgrupos.find((s) => s.name === "Aceite");
    expect(filtros?.grupo).toBe("Filtros");

    const frenos = subgrupos.find((s) => s.name === "Pastillas");
    expect(frenos?.grupo).toBe("Frenos");

    const amortiguadores = subgrupos.find((s) => s.name === "Amortiguadores");
    expect(amortiguadores?.grupo).toBe("Suspensión");
  });

  it("cat-vehmodelo should have object seeds with name and marca", () => {
    CATALOG_SEED["cat-vehmodelo"].forEach((s) => {
      expect(typeof s).toBe("object");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("marca");
      expect(typeof s.name).toBe("string");
      expect(typeof s.marca).toBe("string");
    });
  });

  it("cat-vehmodelo seeds should have correct marca associations", () => {
    const modelos = CATALOG_SEED["cat-vehmodelo"];
    const corolla = modelos.find((m) => m.name === "Corolla");
    expect(corolla?.marca).toBe("Toyota");

    const sentra = modelos.find((m) => m.name === "Sentra");
    expect(sentra?.marca).toBe("Nissan");
  });

  it("cat-unidad should have string seeds", () => {
    CATALOG_SEED["cat-unidad"].forEach((s) => {
      expect(typeof s).toBe("string");
    });
  });

  it("cat-vehmarca should have string seeds", () => {
    CATALOG_SEED["cat-vehmarca"].forEach((s) => {
      expect(typeof s).toBe("string");
    });
  });

  it("cat-encargado should have empty seeds", () => {
    expect(CATALOG_SEED["cat-encargado"]).toEqual([]);
  });

  it("cat-vehmodelo should contain models for all brands", () => {
    const expectedBrands = ["Toyota", "Nissan", "Hyundai", "Mitsubishi", "Ford", "Chevrolet", "Volkswagen", "Mazda", "Kia", "Suzuki"];
    const brandsPresent = [...new Set(CATALOG_SEED["cat-vehmodelo"].map((m) => m.marca))].sort();
    expect(brandsPresent).toEqual(expectedBrands.sort());
  });
});

describe("CATALOG_MAP", () => {
  it("should map all 7 catalog keys to Firestore collections", () => {
    expect(CATALOG_MAP["cat-marca"]).toBe("article_brand_marca");
    expect(CATALOG_MAP["cat-grupo"]).toBe("Group");
    expect(CATALOG_MAP["cat-subgrupo"]).toBe("subgroup");
    expect(CATALOG_MAP["cat-unidad"]).toBe("measurement_unit");
    expect(CATALOG_MAP["cat-vehmarca"]).toBe("vehicle_marca_brand");
    expect(CATALOG_MAP["cat-vehmodelo"]).toBe("vehicle_model_modelo");
    expect(CATALOG_MAP["cat-encargado"]).toBe("encargados");
  });
});

describe("CATALOG_NAME_FIELD", () => {
  it("should only override for encargados", () => {
    expect(CATALOG_NAME_FIELD["cat-encargado"]).toBe("nombre");
    expect(CATALOG_NAME_FIELD["cat-marca"]).toBeUndefined();
    expect(CATALOG_NAME_FIELD["cat-grupo"]).toBeUndefined();
    expect(CATALOG_NAME_FIELD["cat-subgrupo"]).toBeUndefined();
    expect(CATALOG_NAME_FIELD["cat-unidad"]).toBeUndefined();
    expect(CATALOG_NAME_FIELD["cat-vehmarca"]).toBeUndefined();
    expect(CATALOG_NAME_FIELD["cat-vehmodelo"]).toBeUndefined();
  });
});

describe("addCatalogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call addDoc with correct collection and data", async () => {
    await addCatalogEntry("cat-marca", "TestMarca");
    expect(addDoc).toHaveBeenCalledWith("mocked-col", { name: "TestMarca" });
  });

  it("should use nombre field for encargados", async () => {
    await addCatalogEntry("cat-encargado", "Juan Pérez");
    expect(addDoc).toHaveBeenCalledWith("mocked-col", { nombre: "Juan Pérez" });
  });

  it("should include extra data for subgrupo", async () => {
    await addCatalogEntry("cat-subgrupo", "TestSub", { grupo: "Frenos" });
    expect(addDoc).toHaveBeenCalledWith("mocked-col", { name: "TestSub", grupo: "Frenos" });
  });

  it("should include extra data for modelo", async () => {
    await addCatalogEntry("cat-vehmodelo", "TestModelo", { marca: "Toyota" });
    expect(addDoc).toHaveBeenCalledWith("mocked-col", { name: "TestModelo", marca: "Toyota" });
  });
});

describe("editCatalogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call setDoc with correct ref and data (merge)", async () => {
    await editCatalogEntry("cat-marca", "doc-123", "NewName");
    expect(doc).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith("mocked-doc", { name: "NewName" }, { merge: true });
  });

  it("should include extra data when editing subgrupo", async () => {
    await editCatalogEntry("cat-subgrupo", "doc-123", "NewSub", { grupo: "Frenos" });
    expect(setDoc).toHaveBeenCalledWith("mocked-doc", { name: "NewSub", grupo: "Frenos" }, { merge: true });
  });
});

describe("deleteCatalogEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call deleteDoc for non-seed id", async () => {
    await deleteCatalogEntry("cat-marca", "doc-123");
    expect(deleteDoc).toHaveBeenCalled();
  });

  it("should NOT delete seed items", async () => {
    await deleteCatalogEntry("cat-marca", "seed:Test");
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("should NOT delete with empty id", async () => {
    await deleteCatalogEntry("cat-marca", "");
    expect(deleteDoc).not.toHaveBeenCalled();
  });
});

describe("useCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return seed items when Firestore is empty", () => {
    const { result } = renderHook(() => useCatalog("cat-marca"));
    const names = result.current.map((o) => o.name);
    expect(names).toContain("Toyota");
    expect(names).toContain("Bosch");
  });

  it("should mark seed items with seed: true", () => {
    const { result } = renderHook(() => useCatalog("cat-marca"));
    const seedItems = result.current.filter((o) => o.seed);
    expect(seedItems.length).toBeGreaterThan(0);
    seedItems.forEach((o) => {
      expect(o.id).toMatch(/^seed:/);
    });
  });

  it("should return empty array for unknown docKey", () => {
    const { result } = renderHook(() => useCatalog("non-existent"));
    expect(result.current).toEqual([]);
  });

  it("should return empty array for falsy docKey", () => {
    const { result } = renderHook(() => useCatalog(""));
    expect(result.current).toEqual([]);
  });

  it("subgrupo seeds should have grupo field", () => {
    const { result } = renderHook(() => useCatalog("cat-subgrupo"));
    const seedItems = result.current.filter((o) => o.seed);
    seedItems.forEach((o) => {
      expect(o).toHaveProperty("grupo");
      expect(typeof o.grupo).toBe("string");
      expect(o.grupo.length).toBeGreaterThan(0);
    });
  });

  it("modelo seeds should have marca field", () => {
    const { result } = renderHook(() => useCatalog("cat-vehmodelo"));
    const seedItems = result.current.filter((o) => o.seed);
    seedItems.forEach((o) => {
      expect(o).toHaveProperty("marca");
      expect(typeof o.marca).toBe("string");
      expect(o.marca.length).toBeGreaterThan(0);
    });
  });

  it("should merge live items with seed items", async () => {
    onSnapshot.mockImplementationOnce((_q, cb) => {
      cb({
        docs: [
          { id: "live-1", data: () => ({ name: "LiveBrand" }) },
        ],
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useCatalog("cat-marca"));
    await waitFor(() => {
      expect(result.current.some((o) => o.id === "live-1")).toBe(true);
    });
  });

  it("should hide seed duplicates when live has same name", async () => {
    onSnapshot.mockImplementationOnce((_q, cb) => {
      cb({
        docs: [
          { id: "live-toyota", data: () => ({ name: "Toyota" }) },
        ],
      });
      return vi.fn();
    });

    const { result } = renderHook(() => useCatalog("cat-marca"));
    await waitFor(() => {
      const seedToyotas = result.current.filter((o) => o.name === "Toyota" && o.seed);
      expect(seedToyotas).toHaveLength(0);
    });
  });
});
