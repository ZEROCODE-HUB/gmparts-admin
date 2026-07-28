import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const MOCK_CLIENTS = [
  { id: "c1", nombre: "Jose Quiñonez", documento: "12345678", tipoPersona: "Natural", tipoDocumento: "DNI", direccion: "Av. Nicolás Ayllón 12345" },
  { id: "c4", nombre: "Gear Motor Parts SAC", documento: "20601720621", tipoPersona: "Jurídica", tipoDocumento: "RUC", direccion: "Av. Industrial 500" },
];

vi.mock("../store/firestoreDb", async () => {
  const actual = await vi.importActual("../store/firestoreDb");
  return {
    ...actual,
    useFirestoreCollection: vi.fn((col) => {
      if (col === "users") return MOCK_CLIENTS;
      if (col === "Proveedores") return [
        { id: "p1", nombre: "Proveedor Test", documento: "20123456789", Documento: "20123456789" },
      ];
      return [];
    }),
  };
});

vi.mock("../store/firestoreStock", () => {
  const MOCK_ARTICLE = {
    id: "art-001",
    Codigo: "ART-001",
    Nombre_name: "Filtro de Aceite 150A",
    Stock: 10,
    Precio_Venta_Sale_price: 150,
    Precio_compra_Purchase_price: 100,
    Utilidad_Profit_Percentage: 20,
    Marca_brand: "MarcaTest",
    Unidad_de_medida_Measurement_unit: "Unidad",
    Product_type: "Repuesto",
  };

  return {
    searchArticles: vi.fn((term) => {
      if (term.includes("ART-001") || term.includes("Filtro")) return [MOCK_ARTICLE];
      return [];
    }),
    firestoreSaveDocument: vi.fn(() => "mock-doc-id"),
    updateArticleStockByCode: vi.fn(),
    applyStockToItems: vi.fn(),
    firestoreDeleteDocument: vi.fn(),
  };
});

import DocumentEditor from "../components/documents/DocumentEditor";
import CompraEditor from "../components/documents/CompraEditor";
import ToastContainer from "../components/ui/Toast";

const ARTICULO = "ART-001 - Filtro de Aceite 150A";

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

describe("Flujos de usuario - editores de documento", () => {
  it("Test 1: fórmula de precio en Compra (precioCompra=100, utilidad=20 → pu=120)", async () => {
    renderWithRouter(<CompraEditor title="Factura Compra" backPath="/c-factura" docKey="c-factura" />);

    fireEvent.change(screen.getByPlaceholderText("Nombre o código..."), { target: { value: ARTICULO } });
    await flush();
    fireEvent.click(screen.getByTitle("Agregar artículo"));
    await flush();

    const table = screen.getByRole("table");
    const row = within(table).getByText("Filtro de Aceite 150A").closest("tr");
    const inputs = within(row).getAllByRole("spinbutton");

    fireEvent.change(inputs[1], { target: { value: "100" } });
    fireEvent.change(inputs[2], { target: { value: "20" } });

    await waitFor(
      () => {
        const cells = within(row).getAllByRole("cell");
        expect(cells[3].textContent).toContain("120.00");
      },
      { timeout: 3500 }
    );
  });

  it("Test 3: Factura bloquea guardar con cliente Natural", async () => {
    renderWithRouter(<DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" />);

    fireEvent.change(screen.getByPlaceholderText("Nombre o código..."), { target: { value: ARTICULO } });
    await flush();
    fireEvent.click(screen.getByTitle("Agregar artículo"));
    await flush();

    screen.getByText("Filtro de Aceite 150A");
    fireEvent.change(selectByOption("Jose Quiñonez"), { target: { value: "Jose Quiñonez" } });
    fireEvent.change(selectByOption("Almacén Principal"), { target: { value: "Almacén Principal" } });
    fireEvent.click(screen.getByRole("button", { name: /Generar documento/ }));

    expect(screen.getByText(/Persona debe ser Jurídica para generar Factura/)).toBeInTheDocument();
  });

  it("Test 4: Boleta bloquea Jurídica y permite Natural", async () => {
    renderWithRouter(<DocumentEditor title="Boleta" backPath="/va-boleta" docKey="va-boleta" />);

    fireEvent.change(screen.getByPlaceholderText("Nombre o código..."), { target: { value: ARTICULO } });
    await flush();
    fireEvent.click(screen.getByTitle("Agregar artículo"));
    await flush();

    screen.getByText("Filtro de Aceite 150A");
    fireEvent.change(selectByOption("Gear Motor Parts SAC"), { target: { value: "Gear Motor Parts SAC" } });
    fireEvent.change(selectByOption("Almacén Principal"), { target: { value: "Almacén Principal" } });
    fireEvent.click(screen.getByRole("button", { name: /Generar documento/ }));

    expect(screen.getByText(/Persona debe ser Natural para generar Boleta/)).toBeInTheDocument();

    fireEvent.change(selectByOption("Jose Quiñonez"), { target: { value: "Jose Quiñonez" } });
    fireEvent.click(screen.getByRole("button", { name: /Generar documento/ }));

    expect(screen.queryByText(/Persona debe ser Natural para generar Boleta/)).toBeNull();
  });
});
