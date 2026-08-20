// ¿Coincide el ID del documento de usuario con su uid de Firebase Auth?
//
// Las reglas nuevas resuelven el rol con get(users/$(request.auth.uid)), así que dan por
// hecho que el ID del documento ES el uid. Si no lo es, ese usuario no tendrá rol a ojos de
// las reglas y no podrá borrar nada — aunque sea Administrador.
//
// Un uid de Firebase Auth tiene 28 caracteres; un ID autogenerado por Firestore, 20.
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const cfg = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
};
const db = getFirestore(initializeApp(cfg));

const snap = await getDocs(collection(db, "users"));
const sospechosos = [];
let conRol = 0;

for (const d of snap.docs) {
  const x = d.data();
  const rol = x.user_role || x.rol || "(sin rol)";
  if (rol !== "(sin rol)") conRol++;
  const pinta = d.id.length === 28 ? "uid" : `${d.id.length} chars`;
  if (d.id.length !== 28) sospechosos.push({ id: d.id, rol, email: x.email || x.correo || "" });
  console.log(`${d.id.padEnd(30)} ${String(pinta).padEnd(10)} ${String(rol).padEnd(20)} ${x.email || ""}`);
}

console.log(`\nTotal usuarios: ${snap.docs.length} · con rol asignado: ${conRol}`);
console.log(`IDs que NO son uid de Auth: ${sospechosos.length}`);
for (const s of sospechosos) {
  console.log(`  · ${s.id}  rol=${s.rol}  ${s.email}`);
}
if (sospechosos.some((s) => /admin|gerente/i.test(s.rol))) {
  console.log("\n⚠️  Hay administradores cuyo documento NO se llama como su uid:");
  console.log("   con las reglas nuevas no podrían borrar nada. Hay que normalizarlos");
  console.log("   o pasar el rol a custom claims antes de desplegar.");
}
process.exit(0);
