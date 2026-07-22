// GM Parts Admin — onUserDeleted
// Se dispara cuando Firebase Auth elimina un usuario.
// Borra/limpia en cascada los datos relacionados en Firestore.
//
// Despliegue:
//   cd functions && npm install && firebase deploy --only functions
//
// ═════════════════════════════════════════════════════════════════

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// ── Helpers ────────────────────────────────────────────────────

/** Obtiene el DocumentReference del usuario borrado. */
function userRef(uid) {
  return db.doc("users/" + uid);
}

/** Ejecuta un batch con cleanup de referencias a un usuario. */
async function cleanupUserReferences(uid) {
  const batch = db.batch();
  const ref = userRef(uid);
  let ops = 0;

  // 1. Eliminar el documento del usuario en users/{uid}
  batch.delete(ref);
  ops++;

  // 2. cuentasPorCobrar — donde clienteid apunte a este usuario
  const cuentasSnap = await db
    .collection("cuentasPorCobrar")
    .where("clienteid", "==", ref)
    .get();
  cuentasSnap.forEach((doc) => {
    // Nullificar en vez de borrar — conserva trazabilidad financiera
    // (montos adeudados, pagos registrados en subcolección pagos_CporCobrar)
    batch.update(doc.ref, { clienteid: null, clienteid_uid: uid });
    ops++;
  });

  // 3. recepciones — donde clienteRef apunte a este usuario
  const recepcionesSnap = await db
    .collection("recepciones")
    .where("clienteRef", "==", ref)
    .get();
  recepcionesSnap.forEach((doc) => {
    // Nullificar la referencia en vez de borrar el documento (conservar historial)
    batch.update(doc.ref, { clienteRef: null, clienteRef_uid: uid });
    ops++;
  });

  // 4. recepciones — donde tecnicoservicioRef apunte a este usuario
  const tecSnap = await db
    .collection("recepciones")
    .where("tecnicoservicioRef", "==", ref)
    .get();
  tecSnap.forEach((doc) => {
    batch.update(doc.ref, { tecnicoservicioRef: null, tecnicoservicioRef_uid: uid });
    ops++;
  });

  // 5. Vehiculos — donde Propietario apunte a este usuario
  const vehiculosSnap = await db
    .collection("Vehiculos")
    .where("Propietario", "==", ref)
    .get();
  vehiculosSnap.forEach((doc) => {
    batch.update(doc.ref, { Propietario: null, Propietario_uid: uid });
    ops++;
  });

  // 6. Kardex_element — donde Client apunte a este usuario
  const kardexSnap = await db
    .collection("Kardex_element")
    .where("Client", "==", ref)
    .get();
  kardexSnap.forEach((doc) => {
    batch.update(doc.ref, { Client: null, Client_uid: uid });
    ops++;
  });

  // 7. Articles_Warehouse — donde seller apunte a este usuario
  const awSnap = await db
    .collection("Articles_Warehouse")
    .where("seller", "==", ref)
    .get();
  awSnap.forEach((doc) => {
    batch.update(doc.ref, { seller: null, seller_uid: uid });
    ops++;
  });

  // ── Facturas / FacturasVentasCompras ──
  // Usuario es String (displayName), no DocumentReference.
  // Se conserva como historial — no se toca.

  // ── pagos_CporCobrar ──
  // Es subcolección de cuentasPorCobrar. Si la cuenta padre se elimina,
  // la subcolección se elimina automáticamente (dependencia de Firestore).
  // No se necesita acción adicional.

  if (ops > 0) {
    await batch.commit();
    console.log(`onUserDeleted: ${ops} operaciones en batch para uid=${uid}`);
  } else {
    console.log(`onUserDeleted: sin datos que limpiar para uid=${uid}`);
  }
}

// ── Export ──────────────────────────────────────────────────────

exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  console.log("onUserDeleted disparado para uid:", uid);
  try {
    await cleanupUserReferences(uid);
    console.log("onUserDeleted completado exitosamente para uid:", uid);
  } catch (err) {
    console.error("onUserDeleted ERROR para uid:", uid, err);
  }
});
