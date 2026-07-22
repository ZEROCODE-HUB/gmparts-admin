// Script único: agrega tipofactura + TipoOperacion a documentos existentes
// que no los tengan. Lee desde _docType (campo legacy que se usó en D3)
// o infiere desde los campos del documento.
//
// Uso: node scripts/migrate-doctype.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
  storageBucket: "g-m-parts-lac7fg.appspot.com",
  messagingSenderId: "192029790072",
  appId: "1:192029790072:web:09dd0119229174fcc6428d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DOC_TYPE_MAP = {
  "va-factura": "Factura", "va-boleta": "Boleta", "va-cotizacion": "Cotizacion",
  "va-guia": "Guia", "va-notacredito": "NotaCredito",
  "vs-factura": "Factura", "vs-boleta": "Boleta", "vs-cotizacion": "Cotizacion",
  "vs-orden": "OrdenTrabajo", "vs-notas": "NotaVenta",
  "c-factura": "Factura", "c-boleta": "Boleta", "c-notas": "NotaPedido",
  "c-guia": "Guia", "c-orden": "OrdenPago",
  "al-notaventa": "NotaVenta",
};

function inferType(docKey, data) {
  if (docKey) return DOC_TYPE_MAP[docKey] || docKey;
  return "Factura";
}

function inferOperation(data) {
  if (data.TipoOperacion) return data.TipoOperacion;
  if (data.proveedor) return "compra";
  return "venta";
}

async function migrateCollection(colName) {
  console.log(`\n=== Migrando colección: ${colName} ===`);
  const snap = await getDocs(collection(db, colName));
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const needsTipo = !data.tipofactura;
    const needsOp = colName === "FacturasVentasCompras" && !data.TipoOperacion;
    if (!needsTipo && !needsOp) continue;

    const docKey = data._docType || data.docKey || "";
    const tipofactura = data.tipofactura || inferType(docKey, data);
    const TipoOperacion = data.TipoOperacion || inferOperation(data);

    const updates = {};
    if (needsTipo) updates.tipofactura = tipofactura;
    if (needsOp) updates.TipoOperacion = TipoOperacion;

    console.log(`  ${d.id}: tipofactura="${tipofactura}" TipoOperacion="${TipoOperacion || "(no aplica)"}"`);
    await setDoc(doc(db, colName, d.id), updates, { merge: true });
    updated++;
  }
  console.log(`  → ${updated} documentos actualizados en ${colName}`);
  return updated;
}

async function main() {
  console.log("=== Migración de tipofactura + TipoOperación ===");
  let total = 0;
  total += await migrateCollection("Facturas");
  total += await migrateCollection("FacturasVentasCompras");
  total += await migrateCollection("cuentasPorCobrar");
  console.log(`\n✅ Total: ${total} documentos actualizados.`);
  process.exit(0);
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });
