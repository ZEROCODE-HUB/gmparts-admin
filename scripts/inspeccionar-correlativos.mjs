// Radiografía de la numeración antes de tocarla.
//
// Hay dos contadores conviviendo: el frontend guarda en LastCode/{docKey} y el backend en
// LastCode/{serie}. Antes de unificarlos hay que saber qué números hay ya emitidos, porque
// si el contador nuevo arranca por debajo del último documento real se repiten números —
// y un correlativo repetido ante SUNAT es peor que un hueco.
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const cfg = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
};
const db = getFirestore(initializeApp(cfg));

const num = (v) => Number(String(v ?? "").replace(/\D/g, "") || 0);

async function main() {
  console.log("=== LastCode: contadores tal como están hoy ===");
  const lc = await getDocs(collection(db, "LastCode"));
  if (!lc.docs.length) console.log("  (vacío)");
  for (const d of lc.docs) {
    console.log(`  ${d.id.padEnd(24)} ${JSON.stringify(d.data())}`);
  }

  console.log("\n=== Números realmente emitidos, por serie ===");
  const porSerie = {};
  for (const col of ["Facturas", "FacturasVentasCompras", "recepciones"]) {
    const snap = await getDocs(collection(db, col));
    for (const d of snap.docs) {
      const x = d.data();
      const serie = String(x.serie || x.nserie || "").trim().toUpperCase();
      if (!serie) continue;
      const n = num(x.numero);
      const k = `${col}/${serie}`;
      if (!porSerie[k]) porSerie[k] = { max: 0, count: 0, sunat: {} };
      porSerie[k].count++;
      if (n > porSerie[k].max) porSerie[k].max = n;
      const est = x.estadoSunat || "(sin enviar)";
      porSerie[k].sunat[est] = (porSerie[k].sunat[est] || 0) + 1;
    }
  }
  for (const [k, v] of Object.entries(porSerie).sort()) {
    console.log(`  ${k.padEnd(34)} docs=${String(v.count).padStart(4)}  mayor=${String(v.max).padStart(7)}  ${JSON.stringify(v.sunat)}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
