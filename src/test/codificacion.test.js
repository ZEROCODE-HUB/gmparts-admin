// Ningún archivo fuente debe contener el carácter de reemplazo U+FFFD.
//
// Tres archivos lo tenían y no era cosmético: en OrdenTrabajoList el mapa de colores por
// estado ("Recepción", "Diagnóstico"…) tenía las claves corrompidas, así que ningún estado
// con tilde hacía match y todas las órdenes salían en gris.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

// Vitest ejecuta desde la raíz del proyecto; import.meta.url no resuelve a file:// aquí.
const RAIZ = join(process.cwd(), "src");
const EXTENSIONES = [".js", ".jsx", ".css"];
// Se construye por código: escribirlo literal haría que este archivo se delatara a sí mismo.
const REEMPLAZO = String.fromCharCode(0xfffd);

function archivosFuente(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      salida.push(...archivosFuente(ruta));
    } else if (EXTENSIONES.includes(extname(entrada))) {
      salida.push(ruta);
    }
  }
  return salida;
}

describe("codificación de los archivos fuente", () => {
  it("no queda ningún carácter de reemplazo (mojibake)", () => {
    const corruptos = archivosFuente(RAIZ)
      .filter((ruta) => readFileSync(ruta, "utf8").includes(REEMPLAZO))
      .map((ruta) => ruta.slice(RAIZ.length));

    expect(corruptos).toEqual([]);
  });
});
