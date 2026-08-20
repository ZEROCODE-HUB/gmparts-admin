import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    // Las pruebas propias viven todas en src/test. Acotar `include` evita que vitest
    // recoja las suites que traen las dependencias en functions/node_modules.
    include: ["src/test/**/*.test.{js,jsx}"],
    // Las reglas de Firestore se prueban contra el emulador, que no siempre está
    // levantado. Van aparte, con `npm run test:reglas`, para que `npm run check` no
    // dependa de tener Java y el emulador instalados.
    exclude: ["**/node_modules/**", "dist/**", "src/test/reglas.test.js"],
  },
});
