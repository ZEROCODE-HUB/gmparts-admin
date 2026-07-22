import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const cfg = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
};
const db = getFirestore(initializeApp(cfg));

async function main() {
  const snap = await getDocs(collection(db, "FacturasVentasCompras"));
  console.log("Total:", snap.docs.length);
  let bCount = 0, fCount = 0, other = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const serie = (data.serie || "").toString().trim().toUpperCase();
    const pref = serie.charAt(0);
    const tipo = data.tipofactura || "(none)";
    const op = data.TipoOperacion || "(none)";
    console.log(d.id, "serie=" + serie, "tipofactura=" + tipo, "TipoOperacion=" + op);
    if (pref === "B") bCount++;
    else if (pref === "F") fCount++;
    else other++;
  }
  console.log("\nB series:", bCount, "F series:", fCount, "Other:", other);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
