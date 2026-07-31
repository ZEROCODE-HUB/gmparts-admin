import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const MOCK_CLIENTS = [
  { id: "c1", nombre: "Jose Quiñonez", documento: "12345678", tipoPersona: "Natural", tipoDocumento: "DNI", direccion: "Av. Nicolás Ayllón 12345" },
  { id: "c4", nombre: "Gear Motor Parts SAC", documento: "20601720621", tipoPersona: "Jurídica", tipoDocumento: "RUC", direccion: "Av. Industrial 500" },
];

const MOCK_COTIZACION = {
  id: "cot-1",
  serie: "C001",
  numero: "000123",
  fecha: "2026-07-30",
  cliente: "Gear Motor Parts SAC",
  clienteDoc: "20601720621",
  formaPago: "Contado",
  moneda: "PEN",
  tipoIgv: "INCLUIDO IGV",
  almacen: "Almacén Principal",
  total: 300,
  items: [
    { descripcion: "Filtro de Aceite 150A", codigo: "ART-001", cant: 2, pu: 150, total: 300 },
  ],
};

const useFirestoreDocumentsMock = vi.fn(() => [[MOCK_COTIZACION], { remove: vi.fn() }]);

vi.mock("../store/firestoreDb", async () => {
  const actual = await vi.importActual("../store/firestoreDb");
  return {
    ...actual,
    useFirestoreCollection: vi.fn((col) => (col === "users" ? MOCK_CLIENTS : [])),
    useFirestoreDocuments: (docKey) => useFirestoreDocumentsMock(docKey),
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
  };
  return {
    searchArticles: vi.fn((term) => (
      String(term).includes("ART-001") || String(term).includes("Filtro") ? [MOCK_ARTICLE] : []
    )),
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

beforeEach(() => {
  localStorage.clear();
  useFirestoreDocumentsMock.mockClear();
});

describe("Agregar Cotización en ventas de artículos", () => {
  it("Factura: carga ítems y datos del cliente desde una cotización de artículos", async () => {
    renderWithRouter(<DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" />);

    expect(useFirestoreDocumentsMock).toHaveBeenCalledWith("va-cotizacion");

    fireEvent.click(screen.getByRole("button", { name: /Agregar Cotización/ }));
    expect(screen.getByText("Seleccionar Cotización")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/C001-000123 · Gear Motor Parts SAC/));

    await waitFor(() => {
      const table = screen.getByRole("table");
      expect(within(table).getByText("Filtro de Aceite 150A")).toBeInTheDocument();
    });

    const row = within(screen.getByRole("table")).getByText("Filtro de Aceite 150A").closest("tr");
    const cells = within(row).getAllByRole("cell");
    expect(cells[0].textContent).toBe("ART-001");
    expect(cells[3].textContent).toContain("150.00");
    expect(cells[6].textContent).toContain("300.00");

    expect(screen.getByText(/Origen: cotizacion C001-000123/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("20601720621")).toBeInTheDocument();
    expect(screen.queryByText("Seleccionar Cotización")).toBeNull();
  });

  it("Boleta: el modal filtra por cliente y por serie/número", async () => {
    renderWithRouter(<DocumentEditor title="Boleta" backPath="/va-boleta" docKey="va-boleta" />);

    fireEvent.click(screen.getByRole("button", { name: /Agregar Cotización/ }));
    const filtro = screen.getByPlaceholderText(/Buscar por cliente, serie o número/);

    fireEvent.change(filtro, { target: { value: "C001-000123" } });
    expect(screen.getByText(/C001-000123 · Gear Motor Parts SAC/)).toBeInTheDocument();

    fireEvent.change(filtro, { target: { value: "gear" } });
    expect(screen.getByText(/C001-000123 · Gear Motor Parts SAC/)).toBeInTheDocument();

    fireEvent.change(filtro, { target: { value: "inexistente" } });
    expect(screen.getByText("Sin cotizaciones")).toBeInTheDocument();
  });

  it("Cotización: no muestra el botón Agregar Cotización", () => {
    renderWithRouter(<DocumentEditor title="Cotización" backPath="/va-cotizacion" docKey="va-cotizacion" />);
    expect(screen.queryByRole("button", { name: /Agregar Cotización/ })).toBeNull();
  });
});
