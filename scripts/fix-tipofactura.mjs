import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const cfg = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
};
const db = getFirestore(initializeApp(cfg));

async function main() {
  let count = 0;
  const snap = await getDocs(collection(db, "FacturasVentasCompras"));
  console.log("Total docs:", snap.docs.length);
  for (const d of snap.docs) {
    const data = d.data();
    const serie = (data.serie || "").toString().trim().toUpperCase();
    const pref = serie.charAt(0);
    const isCompra = !!data.proveedor;
    const current = data.tipofactura || "(none)";
    let tipo = "Factura";
    if (pref === "B") tipo = isCompra ? "boleta" : "Boleta";
    else if (pref === "F") tipo = "Factura";
    else if (pref === "N") tipo = "Nota de venta";
    if (current !== tipo) {
      console.log(d.id, "serie=" + serie, "current=" + current, "new=" + tipo, "compra=" + isCompra);
      await setDoc(doc(db, "FacturasVentasCompras", d.id), { tipofactura: tipo }, { merge: true });
      count++;
    }
  }
  console.log("Updated:", count);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
