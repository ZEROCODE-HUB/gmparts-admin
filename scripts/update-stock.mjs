// Script para actualizar Stock de todos los artículos en Firestore.
//
// 1. Descargar clave de servicio desde Firebase Console:
//    https://console.firebase.google.com/project/g-m-parts-lac7fg/settings/serviceaccounts/adminsdk
//    → "Generar nueva clave privada" → guardar como "serviceAccountKey.json" en la raíz del proyecto
//
// 2. Ejecutar:
//    node scripts/update-stock.mjs <nuevo-stock>
//    Ejemplo: node scripts/update-stock.mjs 50

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "..", "serviceAccountKey.json");

if (!existsSync(keyPath)) {
  console.error("ERROR: No se encuentra serviceAccountKey.json");
  console.error("Descárgalo desde:");
  console.error("  https://console.firebase.google.com/project/g-m-parts-lac7fg/settings/serviceaccounts/adminsdk");
  console.error("  → Generar nueva clave privada");
  console.error("  → Guardar como serviceAccountKey.json en la raíz del proyecto");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const nuevoStock = parseInt(process.argv[2], 10);
if (isNaN(nuevoStock)) {
  console.error("Uso: node scripts/update-stock.mjs <nuevo-stock>");
  console.error("Ejemplo: node scripts/update-stock.mjs 50");
  process.exit(1);
}

console.log(`Leyendo artículos...`);
const snap = await db.collection("Articles").get();
console.log(`Total artículos: ${snap.size}`);
let count = 0;

for (const d of snap.docs) {
  await d.ref.update({ Stock: nuevoStock });
  count++;
  if (count % 500 === 0) console.log(`Actualizados ${count}...`);
}

console.log(`✅ Stock actualizado a ${nuevoStock} en ${count} artículos`);
process.exit(0);
