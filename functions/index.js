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

// ── createAuthUser — HTTP callable ────────────────────────────────
// Crea un usuario en Firebase Auth (Admin SDK).
// Solo permitido para Administrador o Gerente General.
// No modifica la sesión del caller (no sign-in/sign-out).
// ═════════════════════════════════════════════════════════════════
exports.createAuthUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const callerSnap = await db.doc("users/" + context.auth.uid).get();
  const callerRole = callerSnap.exists ? callerSnap.data().user_role : "";
  if (callerRole !== "Administrador" && callerRole !== "Gerente General") {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos.");
  }

  const { email, password } = data;
  if (!email || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan email y password.");
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    return { ok: true, uid: userRecord.uid };
  } catch (e) {
    console.error("createAuthUser ERROR:", e);
    if (e.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "El correo ya está registrado.");
    }
    throw new functions.https.HttpsError("internal", "Error al crear usuario.");
  }
});

// ── deleteAuthUser — HTTP callable ────────────────────────────────
// Borra un usuario de Firebase Auth (Admin SDK).
// Solo permitido para Administrador o Gerente General.
// Llamada desde el frontend al eliminar personal/clientes.
// ═════════════════════════════════════════════════════════════════
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.doc("users/" + callerUid).get();
  const callerRole = callerSnap.exists ? callerSnap.data().user_role : "";
  if (callerRole !== "Administrador" && callerRole !== "Gerente General") {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos.");
  }

  const { uid, email } = data;
  if (!uid && !email) {
    throw new functions.https.HttpsError("invalid-argument", "Falta uid o email.");
  }

  try {
    // 1) Intentar borrar por uid directo (para usuarios con auth_uid correcto)
    if (uid) {
      try {
        await admin.auth().deleteUser(uid);
        await cleanupUserReferences(uid);
        return { ok: true };
      } catch (e1) {
        console.error("deleteAuthUser by uid failed:", e1);
        // Si falló, sigue al fallback por email
      }
    }
    // 2) Fallback: buscar por email y borrar
    if (email) {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(userRecord.uid);
      await cleanupUserReferences(userRecord.uid);
      return { ok: true };
    }
    throw new Error("No se pudo eliminar: uid inválido y sin email");
  } catch (e) {
    console.error("deleteAuthUser ERROR:", e);
    throw new functions.https.HttpsError("internal", "Error al eliminar usuario.");
  }
});

// ═════════════════════════════════════════════════════════════════
// generateDocumentPdf — HTTP callable
// Recibe { collection, docId }, genera PDF, sube a Storage,
// guarda pdfUrl en el documento y devuelve la URL.
//
// Llamada desde el frontend:
//   const fn = getFunctions();
//   const result = await callable(fn, "generateDocumentPdf", { collection, docId });
//   window.open(result.data.url);
// ═════════════════════════════════════════════════════════════════

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

exports.generateDocumentPdf = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesi\u00f3n.");
  }
  const { collection: colName, docId } = data;
  if (!colName || !docId) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan collection y docId.");
  }

  // 1. Leer el documento de Firestore
  const docRef = db.doc(colName + "/" + docId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Documento no encontrado.");
  }
  const doc = snap.data();

  // 2. Determinar tipo
  const tipo = doc.tipofactura || doc._docType || "Documento";
  const cliente = doc.cliente || doc.razonSNombre || doc.proveedor || "";
  const clienteDoc = doc.clienteDoc || "";
  const serie = doc.serie || doc.nserie || "";
  const numero = doc.numero || "";
  const fecha = doc.fecha || "";
  const items = doc.items || [];
  const subtotal = doc.subtotal || 0;
  const igv = doc.igv || 0;
  const total = doc.total || 0;
  const almacen = doc.almacen || "";

  // 3. Generar PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const draw = (text, x, y, opts = {}) => {
    page.drawText(text, { x, y, size: opts.size || 10, font: opts.bold ? fontBold : font, color: opts.color || rgb(0, 0, 0), ...opts });
  };

  let y = height - 50;

  // Header
  draw("GM PARTS S.A.C.", 50, y, { size: 18, bold: true }); y -= 16;
  draw("RUC: 20601234567", 50, y, { size: 9, color: rgb(0.4, 0.4, 0.4) }); y -= 12;
  draw("Av. Principal 1234 - Lima", 50, y, { size: 9, color: rgb(0.4, 0.4, 0.4) }); y -= 20;

  // Document type
  draw(tipo.toUpperCase(), 50, y, { size: 14, bold: true }); y -= 24;

  // Fields
  const fieldX = 50;
  const valX = 180;
  draw("Serie:", fieldX, y, { bold: true }); draw(serie || "-", valX, y); y -= 14;
  draw("N\u00famero:", fieldX, y, { bold: true }); draw(numero || "-", valX, y); y -= 14;
  draw("Fecha:", fieldX, y, { bold: true }); draw(fecha || "-", valX, y); y -= 14;
  draw("Cliente:", fieldX, y, { bold: true }); draw(cliente || "-", valX, y); y -= 14;
  draw("RUC/DNI:", fieldX, y, { bold: true }); draw(clienteDoc || "-", valX, y); y -= 14;
  if (almacen) { draw("Almac\u00e9n:", fieldX, y, { bold: true }); draw(almacen, valX, y); y -= 14; }
  y -= 10;

  // Items table header
  const cols = [
    { x: 50, label: "C\u00f3digo", w: 80 },
    { x: 130, label: "Descripci\u00f3n", w: 200 },
    { x: 330, label: "Cant.", w: 50 },
    { x: 380, label: "P.Unit.", w: 80 },
    { x: 460, label: "Total", w: 80 },
  ];
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) }); y -= 14;
  cols.forEach((c) => draw(c.label, c.x, y, { size: 9, bold: true }));
  y -= 14;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) }); y -= 6;

  // Items
  for (const it of items) {
    if (y < 80) { y = height - 80; page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5 }); }
    const cod = it.codigo || "";
    const desc = it.descripcion || "";
    const cant = it.cant ?? it.cantidad ?? 1;
    const pu = it.pu ?? it.precioVenta ?? 0;
    const tot = (Number(pu) || 0) * (Number(cant) || 1);
    draw(cod, 50, y, { size: 8 }); draw(desc, 130, y, { size: 8 });
    draw(String(cant), 330, y, { size: 8 });
    draw("S/ " + Number(pu).toFixed(2), 380, y, { size: 8 });
    draw("S/ " + tot.toFixed(2), 460, y, { size: 8 });
    y -= 14;
  }

  // Totals
  y -= 6;
  page.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 1, color: rgb(0, 0, 0) }); y -= 16;
  draw("Subtotal:", 380, y, { bold: true }); draw("S/ " + Number(subtotal).toFixed(2), 460, y); y -= 14;
  draw("IGV (18%):", 380, y, { bold: true }); draw("S/ " + Number(igv).toFixed(2), 460, y); y -= 14;
  draw("TOTAL:", 380, y, { bold: true, size: 11 }); draw("S/ " + Number(total).toFixed(2), 460, y, { bold: true, size: 11 });

  const pdfBytes = await pdfDoc.save();

  // 4. Subir a Firebase Storage
  const bucket = admin.storage().bucket();
  const fileName = colName + "/" + docId + ".pdf";
  const file = bucket.file(fileName);
  await file.save(Buffer.from(pdfBytes), { contentType: "application/pdf" });
  await file.makePublic();
  const pdfUrl = "https://storage.googleapis.com/" + bucket.name + "/" + fileName;

  // 5. Guardar URL en el documento
  await docRef.update({ pdfUrl });

  console.log("PDF generado para", colName, docId, pdfUrl);
  return { url: pdfUrl };
});

// ═════════════════════════════════════════════════════════════════
// sendToSunat — HTTP callable
// Lee el documento de Firestore, construye payload, envía a Factiliza
// y guarda el resultado (estadoSunat) en el documento.
//
// Llamada desde EnviarSunatButton en el frontend.
// ═════════════════════════════════════════════════════════════════

const {
  buildFactilizaPayload,
  extractFactilizaError,
  validarPayload,
} = require("./factiliza");

exports.sendToSunat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const { collection: colName, docId } = data;
  if (!colName || !docId) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan collection y docId.");
  }

  const FACTILIZA_TOKEN = functions.config().factiliza?.token;
  if (!FACTILIZA_TOKEN) {
    throw new functions.https.HttpsError("failed-precondition", "Factiliza token no configurado. Ejecuta: firebase functions:config:set factiliza.token=\"...\" usando el token del proyecto Flutter (hardcodeado en api_calls.dart).");
  }

  try {
    // 1. Leer documento de Firestore
    const realCol = colName === "c-guia" || colName === "c-notas" || colName === "c-orden" || colName === "c-boleta" || colName === "c-factura" || colName === "va-factura" || colName === "va-boleta" || colName === "va-notacredito" || colName === "va-guia" || colName === "al-notaventa"
      ? "FacturasVentasCompras"
      : colName === "vs-factura" || colName === "vs-boleta" || colName === "vs-orden" || colName === "vs-notas"
        ? "Facturas"
        : colName;

    const docRef = db.doc(realCol + "/" + docId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Documento no encontrado en " + realCol);
    }
    const doc = snap.data();

    // 2. Construir y validar payload
    const { payload, endpoint } = buildFactilizaPayload(doc, colName);

    const errValidacion = validarPayload(payload);
    if (errValidacion) {
      console.warn("sendToSunat: payload inválido", { docId, colName, errValidacion });
      await docRef.update({
        estadoSunat: "Error",
        sunatError: errValidacion,
        sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: false, sunatSuccess: false, cdrId: null, message: errValidacion };
    }

    // 3. Enviar a Factiliza
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + FACTILIZA_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    // El API puede responder con body vacío o HTML ante 4xx/5xx; nunca asumir JSON.
    const rawBody = await response.text();
    let result = null;
    if (rawBody) {
      try {
        result = JSON.parse(rawBody);
      } catch (parseErr) {
        console.error("sendToSunat: respuesta no-JSON", { status: response.status, endpoint, parseErr: parseErr.message, rawBody: rawBody.slice(0, 500) });
      }
    }

    if (!response.ok || result === null) {
      const detalle = extractFactilizaError(result) || rawBody.slice(0, 300) || "sin detalle";
      const errorMsg = "Factiliza respondió HTTP " + response.status + ": " + detalle;
      console.error("sendToSunat: error HTTP", { status: response.status, endpoint, errorMsg });
      await docRef.update({
        estadoSunat: "Error",
        estadoFactura: "Rechazado",
        sunatError: errorMsg,
        sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: false, sunatSuccess: false, cdrId: null, message: errorMsg };
    }

    const sunatOk = result?.data?.sunatResponse?.success === true;
    const success = result?.success === true;
    const cdrId = result?.data?.sunatResponse?.cdrResponse?.id ?? null;
    const errorMsg = extractFactilizaError(result);

    // 4. Actualizar documento en Firestore
    const estadoFactura = sunatOk ? "Registrado" : "Rechazado";
    await docRef.update({
      estadoSunat: sunatOk ? "Aceptado" : success ? "Rechazado" : "Error",
      estadoFactura,
      sunatCdrId: cdrId,
      sunatError: sunatOk ? null : errorMsg || "Error en la validación SUNAT",
      sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      sunatSuccess: sunatOk,
      cdrId,
      message: sunatOk
        ? "Documento validado correctamente en SUNAT"
        : errorMsg || "Error en la validación SUNAT",
    };
  } catch (err) {
    console.error("sendToSunat ERROR:", err);
    throw new functions.https.HttpsError("internal", "Error al enviar a SUNAT: " + err.message);
  }
});
