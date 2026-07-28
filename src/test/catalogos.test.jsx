import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATALOG_MAP, CATALOG_NAME_FIELD, addCatalogEntry, editCatalogEntry, deleteCatalogEntry } from "../store/firestoreDb";
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
  beforeEach(() => { vi.clearAllMocks(); });

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
});

describe("editCatalogEntry", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should call setDoc with correct ref and data (merge)", async () => {
    await editCatalogEntry("cat-marca", "doc-123", "NewName");
    expect(doc).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith("mocked-doc", { name: "NewName" }, { merge: true });
  });
});

describe("deleteCatalogEntry", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should call deleteDoc for non-seed id", async () => {
    await deleteCatalogEntry("cat-marca", "doc-123");
    expect(deleteDoc).toHaveBeenCalled();
  });

  it("should NOT delete seed items", async () => {
    await deleteCatalogEntry("cat-marca", "seed:Test");
    expect(deleteDoc).not.toHaveBeenCalled();
  });
});

describe("useCatalog", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should return empty array when Firestore has no data", () => {
    const { result } = renderHook(() => useCatalog("cat-marca"));
    expect(result.current).toEqual([]);
  });

  it("should return empty array for unknown docKey", () => {
    const { result } = renderHook(() => useCatalog("non-existent"));
    expect(result.current).toEqual([]);
  });

  it("should return empty array for falsy docKey", () => {
    const { result } = renderHook(() => useCatalog(""));
    expect(result.current).toEqual([]);
  });

  it("should return live items from Firestore", async () => {
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
      expect(result.current).toHaveLength(1);
      expect(result.current[0].name).toBe("LiveBrand");
    });
  });
});
