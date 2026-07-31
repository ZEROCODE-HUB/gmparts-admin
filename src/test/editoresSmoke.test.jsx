import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../store/firestoreDb", async () => {
  const actual = await vi.importActual("../store/firestoreDb");
  return {
    ...actual,
    useFirestoreCollection: vi.fn(() => []),
    useFirestoreDocuments: vi.fn(() => [[], { remove: vi.fn() }]),
  };
});

vi.mock("../store/firestoreStock", () => ({
  searchArticles: vi.fn(() => []),
  firestoreSaveDocument: vi.fn(() => "mock-doc-id"),
  updateArticleStockByCode: vi.fn(),
  applyStockToItems: vi.fn(),
  firestoreDeleteDocument: vi.fn(),
}));

import DocumentEditor from "../components/documents/DocumentEditor";
import ServicioEditor from "../components/documents/ServicioEditor";
import CompraEditor from "../components/documents/CompraEditor";
import ToastContainer from "../components/ui/Toast";

function renderWithRouter(ui) {
  return render(<MemoryRouter><ToastContainer />{ui}</MemoryRouter>);
}

const VENTA_ARTICULOS = [
  ["va-factura", "Factura"],
  ["va-boleta", "Boleta"],
  ["va-cotizacion", "Cotización"],
  ["va-guia", "Guía de Remisión"],
  ["va-notacredito", "Nota de Crédito"],
  ["al-notaventa", "Nota de Venta"],
];

describe("Smoke: editores renderizan sin pantalla en negro", () => {
  it.each(VENTA_ARTICULOS)("DocumentEditor %s monta y muestra el formulario", (docKey, title) => {
    const { unmount } = renderWithRouter(<DocumentEditor title={title} backPath={`/${docKey}`} docKey={docKey} />);
    expect(screen.getByText("Datos del documento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generar documento/ })).toBeInTheDocument();
    unmount();
  });

  it("DocumentEditor muestra Agregar Cotización solo fuera de va-cotizacion", () => {
    const { unmount } = renderWithRouter(<DocumentEditor title="Factura" backPath="/va-factura" docKey="va-factura" />);
    expect(screen.getByRole("button", { name: /Agregar Cotización/ })).toBeInTheDocument();
    unmount();

    renderWithRouter(<DocumentEditor title="Cotización" backPath="/va-cotizacion" docKey="va-cotizacion" />);
    expect(screen.queryByRole("button", { name: /Agregar Cotización/ })).toBeNull();
  });

  it("ServicioEditor (vs-factura) monta y conserva Agregar Cotización", () => {
    renderWithRouter(<ServicioEditor title="Factura Taller" backPath="/vs-factura" docKey="vs-factura" />);
    expect(screen.getByText("Datos del documento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar Cotización/ })).toBeInTheDocument();
  });

  it("CompraEditor (c-factura) monta sin errores", () => {
    renderWithRouter(<CompraEditor title="Factura Compra" backPath="/c-factura" docKey="c-factura" />);
    expect(screen.getByRole("button", { name: /Generar documento/ })).toBeInTheDocument();
  });
});
