import { defineConfig } from "vitest/config";

// Las pruebas de reglas hablan con el emulador de Firestore por red: no necesitan jsdom ni
// el setup del panel (que mockea Firebase, justo lo contrario de lo que hace falta aquí).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/reglas.test.js"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
