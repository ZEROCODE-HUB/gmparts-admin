// Escanea la colección Articles de Firestore buscando documentos
// "basura" creados por fallbacks anteriores (documentos mínimos con
// muy pocos campos, sin fecha de creación, sin datos de precio/marca/etc.)
//
// Uso: node scripts/find-garbage-articles.mjs
//
// Solo lista candidatos. No borra nada.

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

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

const CAMPOS_REAL = [
  "Codigo", "Product_type", "OEM", "Codigo_proveedor", "Nombre_name",
  "Marca_brand", "Unidad_de_medida_Measurement_unit", "Group_Grupo", "Subgroup_Subgrupo",
  "Garantia_Warranty", "No_Sere_If_Have_Serial_Nr", "Stock_minimo_Minimum_Stock",
  "Moneda_Currency", "Precio_compra_Purchase_price", "Utilidad_Profit_Percentage",
  "Precio_Venta_Sale_price", "Codigo_de_Barras_Bar_Code", "Imagen_Picture",
  "Ubicacion_Location", "Comentario", "Precio_Fabrica_P1_FactoryPriceP1",
  "Precio_Fabrica_P2_FactoryPriceP2", "Precio_Fabrica_P3_FactoryPriceP3",
  "Precio_Fabrica_PvtaM_FactoryPricePvtaM", "Fecha_de_Creacion_Created_Date",
  "Stock", "precioventaconigv",
];

async function main() {
  console.log("=== Buscando documentos basura en Articles ===\n");
  console.log(`Campos esperados en un artículo real: ~${CAMPOS_REAL.length}\n`);

  const allSnap = await getDocs(query(collection(db, "Articles"), orderBy("Codigo")));
  console.log(`Total documentos en Articles: ${allSnap.size}\n`);

  const candidatos = [];

  for (const d of allSnap.docs) {
    const data = d.data();
    const campos = Object.keys(data);
    const nCampos = campos.length;

    // Criterio principal: muy pocos campos (< 5 indica documento mínimo del fallback)
    if (nCampos < 5) {
      candidatos.push({
        id: d.id,
        nCampos,
        campos: campos.sort(),
        datos: data,
        razon: `Solo ${nCampos} campos (real tiene ~${CAMPOS_REAL.length})`,
      });
      continue;
    }

    // Criterio secundario: tiene Codigo y Stock pero carece de campos de precio/marca
    if (nCampos < 10 && data.Codigo && !data.Marca_brand && !data.Precio_compra_Purchase_price && !data.Fecha_de_Creacion_Created_Date) {
      candidatos.push({
        id: d.id,
        nCampos,
        campos: campos.sort(),
        datos: data,
        razon: `Solo ${nCampos} campos, sin Marca/Precio/Fecha (posible fallback)`,
      });
    }
  }

  if (candidatos.length === 0) {
    console.log("✅ No se encontraron documentos candidatos (basura).");
  } else {
    console.log(`⚠️  Se encontraron ${candidatos.length} candidatos:\n`);
    for (const c of candidatos) {
      console.log("─".repeat(60));
      console.log(`ID:       ${c.id}`);
      console.log(`Razón:    ${c.razon}`);
      console.log(`Campos:   ${c.campos.join(", ")}`);
      console.log(`Datos:`);
      console.log(JSON.stringify(c.datos, null, 2));
      console.log("");
    }
  }

  // Si hay exactamente el número esperado de candidatos con nombres genéricos,
  // sugerir que son basura con alta confianza
  const sospechosos = candidatos.filter((c) => {
    const cg = c.datos.Codigo || "";
    const nm = c.datos.Nombre_name || "";
    return cg.startsWith("ART-") || nm === cg || c.nCampos <= 3;
  });
  if (sospechosos.length > 0) {
    console.log("=".repeat(60));
    console.log(`\n🧹 ${sospechosos.length} candidatos tienen alta probabilidad de ser basura`);
    console.log("   (Codigo genérico o Nombre_name == Codigo, típico del fallback).");
    console.log("   IDs:");
    sospechosos.forEach((c) => console.log(`   - ${c.id}  (Codigo: ${c.datos.Codigo || "(sin codigo)"})`));
  }

  console.log("\n=== Fin del escaneo ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
