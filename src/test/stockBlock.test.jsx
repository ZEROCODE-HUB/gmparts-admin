import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../store/firestoreDb", () => ({
  useFirestoreCollection: vi.fn((col) => {
    if (col === "users") return [
      { id: "c1", nombre: "Jose Quiñonez", documento: "12345678", tipoPersona: "Natural", tipoDocumento: "DNI", direccion: "" },
      { id: "c4", nombre: "Gear Motor Parts SAC", documento: "20601720621", tipoPersona: "Jurídica", tipoDocumento: "RUC", direccion: "" },
    ];
    if (col === "Proveedores") return [
      { id: "p1", nombre: "Proveedor Test", documento: "20123456789", Documento: "20123456789" },
    ];
    return [];
  }),
  useCatalog: vi.fn(() => []),
  saveMaestro: vi.fn(),
  deleteMaestro: vi.fn(),
  addCatalogEntry: vi.fn(),
  editCatalogEntry: vi.fn(),
  deleteCatalogEntry: vi.fn(),
}));

vi.mock("../store/firestoreStock", () => {
  const spy = vi.fn((term) => {
    if (term.includes("ART-000") || term.includes("Sin Stock")) return [{
      id: "z0", Codigo: "ART-000", Nombre_name: "Sin Stock", Stock: 0,
      Precio_Venta_Sale_price: 10, Precio_compra_Purchase_price: 5, Utilidad_Profit_Percentage: 10,
      Marca_brand: "Test", Unidad_de_medida_Measurement_unit: "Unidad", Product_type: "Repuesto",
    }];
    if (term.includes("ART-010") || term.includes("Con Stock")) return [{
      id: "z1", Codigo: "ART-010", Nombre_name: "Con Stock", Stock: 10,
      Precio_Venta_Sale_price: 10, Precio_compra_Purchase_price: 5, Utilidad_Profit_Percentage: 10,
      Marca_brand: "Test", Unidad_de_medida_Measurement_unit: "Unidad", Product_type: "Repuesto",
    }];
    return [];
  });
  return {
    searchArticles: spy,
    firestoreSaveDocument: vi.fn(() => "mock-doc-id"),
    updateArticleStockByCode: vi.fn(),
    applyStockToItems: vi.fn(),
    firestoreDeleteDocument: vi.fn(),
  };
});

import DocumentEditor from "../components/documents/DocumentEditor";
import ToastContainer from "../components/ui/Toast";

function renderWithRouter(ui) {
  return render(<MemoryRouter><ToastContainer />{ui}</MemoryRouter>);
}

function selectByOption(text) {
  return screen
    .getAllByRole("combobox")
    .find((sel) => Array.from(sel.options).some((o) => o.textContent.includes(text)));
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  localStorage.clear();
});

describe("Test 2: bloqueo/aviso de stock en Venta", () => {
  it("seleccionar artículo con stock 0 bloquea la selección", async () => {
    renderWithRouter(<DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" />);

    fireEvent.change(screen.getByPlaceholderText("Nombre o código..."), { target: { value: "ART-000 - Sin Stock" } });
    await flush();
    fireEvent.click(screen.getByTitle("Agregar artículo"));
    await flush();

    expect(screen.getByText(/No hay stock disponible/)).toBeInTheDocument();
    expect(screen.queryByText("Sin Stock")).toBeNull();
  });

  it("stock disponible + cantidad > stock muestra advertencia pero no bloquea guardar", async () => {
    renderWithRouter(<DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" />);

    fireEvent.change(screen.getByPlaceholderText("Nombre o código..."), { target: { value: "ART-010 - Con Stock" } });
    await flush();
    fireEvent.click(screen.getByTitle("Agregar artículo"));
    await flush();

    const table = screen.getByRole("table");
    const row = within(table).getByText("Con Stock").closest("tr");
    const cantInput = within(row).getAllByRole("spinbutton")[0];
    fireEvent.change(cantInput, { target: { value: "15" } });

    expect(screen.getByText(/No tienes stock disponible/)).toBeInTheDocument();

    fireEvent.change(selectByOption("Gear Motor Parts SAC"), { target: { value: "Gear Motor Parts SAC" } });
    fireEvent.change(selectByOption("Almacén Principal"), { target: { value: "Almacén Principal" } });
    fireEvent.click(screen.getByRole("button", { name: /Generar documento/ }));
  });
});
