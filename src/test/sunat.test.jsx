import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const httpsCallableMock = vi.fn();

vi.mock("firebase/functions", () => ({
  httpsCallable: () => httpsCallableMock,
  getFunctions: vi.fn(() => ({})),
}));

vi.mock("../lib/firebase", () => ({
  functions: {},
  db: {},
  auth: {},
  app: {},
}));

import EnviarSunatButton from "../components/documents/EnviarSunatButton";
import ToastContainer from "../components/ui/Toast";

function renderBtn(props = {}) {
  return render(
    <>
      <ToastContainer />
      <EnviarSunatButton docKey="va-factura" id="doc-1" {...props} />
    </>
  );
}

beforeEach(() => {
  httpsCallableMock.mockReset();
});

describe("EnviarSunatButton", () => {
  it("muestra notificación de error con el mensaje real de Factiliza cuando SUNAT rechaza", async () => {
    httpsCallableMock.mockResolvedValue({
      data: { success: false, sunatSuccess: false, message: "Factiliza respondió HTTP 404: sin detalle" },
    });

    renderBtn();
    fireEvent.click(screen.getByTitle("Enviar a SUNAT"));

    await waitFor(() => {
      expect(screen.getByText(/Factiliza respondió HTTP 404/)).toBeInTheDocument();
    });
    expect(screen.getByText(/SUNAT:/)).toBeInTheDocument();
  });

  it("la notificación de error se renderiza arriba a la derecha", async () => {
    httpsCallableMock.mockResolvedValue({ data: { sunatSuccess: false, message: "RUC del emisor no válido" } });

    renderBtn();
    fireEvent.click(screen.getByTitle("Enviar a SUNAT"));

    const toast = await screen.findByText(/RUC del emisor no válido/);
    const contenedor = toast.parentElement;
    expect(contenedor.className).toContain("top-4");
    expect(contenedor.className).toContain("right-4");
    expect(contenedor.className).toContain("fixed");
  });

  it("propaga el error cuando la Cloud Function lanza una excepción", async () => {
    httpsCallableMock.mockRejectedValue(new Error("internal: Error al enviar a SUNAT: fetch failed"));

    renderBtn();
    fireEvent.click(screen.getByTitle("Enviar a SUNAT"));

    await waitFor(() => {
      expect(screen.getByText(/fetch failed/)).toBeInTheDocument();
    });
    expect(screen.getByTitle(/Reintentar envío a SUNAT/)).toBeInTheDocument();
  });

  it("marca Registrado y notifica en caso de éxito", async () => {
    httpsCallableMock.mockResolvedValue({
      data: { success: true, sunatSuccess: true, cdrId: "cdr-9", message: "Documento validado correctamente en SUNAT" },
    });
    const onDone = vi.fn();

    renderBtn({ onDone });
    fireEvent.click(screen.getByTitle("Enviar a SUNAT"));

    await waitFor(() => expect(screen.getByText("Registrado")).toBeInTheDocument());
    expect(screen.getByText(/Documento validado correctamente en SUNAT/)).toBeInTheDocument();
    expect(onDone).toHaveBeenCalled();
  });

  it("distingue un comprobante de PRUEBAS de uno con valor fiscal", async () => {
    httpsCallableMock.mockResolvedValue({
      data: { success: true, sunatSuccess: true, esPrueba: true, message: "Documento aceptado en el entorno de PRUEBAS (sin valor fiscal)" },
    });

    renderBtn({ esPrueba: true });
    fireEvent.click(screen.getByTitle("Enviar a SUNAT"));

    await waitFor(() => expect(screen.getByText("Prueba")).toBeInTheDocument());
    expect(screen.queryByText("Registrado")).toBeNull();
  });

  it("un documento Rechazado que admite reintento conserva el botón", () => {
    renderBtn({ estadoActual: "Rechazado", reintentable: true });
    expect(screen.getByText("Rechazado")).toBeInTheDocument();
    expect(screen.getByTitle(/Reintentar envío a SUNAT/)).toBeInTheDocument();
  });

  it("un rechazo definitivo de SUNAT avisa de que hay que corregir, no reenviar", () => {
    // error.code numérico = SUNAT juzgó los datos: reenviar quema correlativo sin cambiar nada.
    renderBtn({ estadoActual: "Rechazado", reintentable: false });
    expect(screen.getByTitle(/corrige el documento antes de reenviar/)).toBeInTheDocument();
  });

  it("un documento Registrado no se reenvía, pero deja bajar el comprobante oficial", () => {
    renderBtn({ estadoActual: "Registrado" });
    expect(screen.getByText("Registrado")).toBeInTheDocument();
    // Ya no hay botón de envío; el único botón es el de descarga del PDF/XML de SUNAT.
    expect(screen.queryByTitle("Enviar a SUNAT")).toBeNull();
    expect(screen.getByTitle("Descargar PDF y XML oficiales de SUNAT")).toBeInTheDocument();
  });

  it("trae el comprobante oficial de Factiliza, no el PDF interno", async () => {
    httpsCallableMock.mockResolvedValue({ data: { pdfUrl: "https://storage/x.pdf", xmlUrl: "https://storage/x.xml" } });
    const abrir = vi.spyOn(window, "open").mockImplementation(() => {});

    renderBtn({ estadoActual: "Registrado" });
    fireEvent.click(screen.getByTitle("Descargar PDF y XML oficiales de SUNAT"));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith("https://storage/x.pdf", "_blank", "noopener"));
    abrir.mockRestore();
  });
});
