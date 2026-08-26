import { defineConfig } from "vitest/config";

// Las pruebas de facturación hablan con la API real de Factiliza (entorno QA). Como las de
// reglas, no necesitan jsdom ni el setup del panel —que mockea Firebase, justo lo contrario
// de lo que hace falta aquí— y van en su propio comando para que `npm run check` siga
// funcionando sin red ni token.
//
// `fileParallelism` en false y un solo hilo: las pruebas comparten el correlativo de la
// pasada y se emiten en orden (boleta → descarga → nota que la anula). Ejecutarlas en
// paralelo pediría el PDF de un documento que aún no se ha declarado.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/facturacionQA.test.js"],
    fileParallelism: false,
    sequence: { concurrent: false },
    // La API de Factiliza tarda: declarar ante SUNAT y devolver el CDR no es instantáneo.
    testTimeout: 45000,
    hookTimeout: 45000,
    // Sin reintentos: un fallo aquí es una respuesta real del API y hay que leerla, no
    // volver a tirar el dado.
    retry: 0,
  },
});
