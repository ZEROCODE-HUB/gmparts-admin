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
// Comprobación de administrador.
//
// Mirar solo users/{uid} da por hecho que el ID del documento es el uid de Auth, y en esta
// base no siempre lo es: alex.vilcahuaman@gearmotorparts.com es Administrador y su
// documento se llama `lmmhWeOIsEvvIVw7UVVt`. Con la comprobación anterior no podía crear
// ni borrar usuarios, aunque la interfaz le ofreciera el botón.
//
// Se mira primero el custom claim (que asigna `sincronizarRolesAuth` emparejando por
// correo) y, como respaldo, el documento y el correo del token.
async function rolDelLlamante(context) {
  const porClaim = context.auth.token.role || "";
  if (porClaim) return porClaim;

  const snap = await db.doc("users/" + context.auth.uid).get();
  if (snap.exists && snap.data().user_role) return snap.data().user_role;

  const correo = String(context.auth.token.email || "").toLowerCase();
  if (!correo) return "";
  const porCorreo = await db.collection("users").where("email", "==", correo).limit(1).get();
  return porCorreo.empty ? "" : (porCorreo.docs[0].data().user_role || "");
}

async function esAdministrador(context) {
  return ROLES_ADMIN.includes(await rolDelLlamante(context));
}

exports.createAuthUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  if (!(await esAdministrador(context))) {
    throw new functions.https.HttpsError("permission-denied", "No tienes permisos.");
  }

  // Esta función es además la puerta de entrada de `sincronizarRolesAuth`: crear un
  // callable nuevo exige escribir su política de invocador en IAM, permiso que la cuenta
  // de despliegue no tiene. Al ser las dos operaciones de gestión de usuarios, comparten
  // endpoint sin que resulte forzado.
  if (data?.accion === "sincronizarRoles") {
    return sincronizarRolesCore(data.simular === true);
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

  if (!(await esAdministrador(context))) {
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

const { PDFDocument, rgb, StandardFonts, degrees } = require("pdf-lib");

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
  // `Fecha` con mayúscula es como lo guarda la colección Facturas; en minúscula, el resto.
  // Leyendo solo una de las dos, el comprobante salía impreso con «Fecha: -».
  const fecha = doc.fecha || doc.Fecha || "";
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
  //
  // Los datos del emisor estaban inventados: decía «GM PARTS S.A.C.», RUC 20601234567 y
  // «Av. Principal 1234 - Lima», que son marcadores de posición. El RUC real de la empresa
  // es 20601720621. Un PDF con un RUC que no es el suyo, guardado además en una URL pública
  // y permanente, es un documento que no debería existir.
  draw("GEAR MOTOR PARTS S.A.C.", 50, y, { size: 18, bold: true }); y -= 16;
  draw("RUC: 20601720621", 50, y, { size: 9, color: rgb(0.4, 0.4, 0.4) }); y -= 12;
  draw("Av. Nicolás Ayllón 3270, Ate, Lima", 50, y, { size: 9, color: rgb(0.4, 0.4, 0.4) }); y -= 20;

  // Document type
  draw(tipo.toUpperCase(), 50, y, { size: 14, bold: true }); y -= 24;

  // Aviso fiscal. Misma regla que `sinValorFiscal` en src/lib/pdfGenerator.js: hay DOS
  // generadores de PDF en el proyecto —este, del servidor, y el del panel— y el aviso solo
  // estaba puesto en el del panel. Este de aquí produce el archivo que se guarda en
  // Storage con URL pública, o sea justo el que puede acabar en manos del cliente pasando
  // por comprobante válido sin serlo.
  const nacidoEnPruebas = String(doc.correlativoDe || "").startsWith("PRUEBA-")
    || String(serie || "").toUpperCase().startsWith("PRUEBA-");
  const avisoFiscal = nacidoEnPruebas
    ? "DOCUMENTO DE PRUEBA — SIN VALOR FISCAL"
    : doc.estadoSunat !== "Aceptado"
      ? "DOCUMENTO NO DECLARADO ANTE SUNAT — SIN VALOR FISCAL"
      : "";

  if (avisoFiscal) {
    draw(avisoFiscal, 50, y, { size: 11, bold: true, color: rgb(0.72, 0.11, 0.11) }); y -= 18;
    // Y en diagonal sobre toda la hoja, para que no se pase por alto en una impresión o en
    // una captura de pantalla. Igual que hace el generador del panel.
    page.drawText("SIN VALOR FISCAL", {
      x: 90,
      y: height / 2 - 120,
      size: 54,
      font: fontBold,
      color: rgb(0.72, 0.11, 0.11),
      opacity: 0.12,
      rotate: degrees(45),
    });
  }

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
  buildDocumentoRequest,
  leerRespuesta,
  apiBase,
  validarPayload,
} = require("./factiliza");

// ── Credenciales y entorno ────────────────────────────────────────────────────
// Factiliza vende DOS productos con DOS tokens distintos que NO son intercambiables:
// el de consultas (DNI/RUC) devuelve 401 contra la API de facturación y viceversa. Un
// 401 no significa que el token esté mal, sino que no vale PARA ESA API.
//
// Sondeo del 2026-08-16: el token que hay configurado (heredado de la app Flutter)
// autoriza facturación en QA con el RUC de pruebas de Factiliza, y devuelve 401 en
// producción. Mientras Factiliza no dé de alta el RUC 20601720621, FACTILIZA_MODO debe
// quedarse en "pruebas".
function tokenFacturacion() {
  return (
    process.env.FACTILIZA_INVOICE_TOKEN ||
    process.env.FACTILIZA_TOKEN ||
    functions.config().factiliza?.invoice_token ||
    functions.config().factiliza?.token ||
    ""
  );
}

// "pruebas" (apife-qa) | "produccion" (apife). Por defecto pruebas: emitir de verdad
// tiene que ser una decisión explícita, no lo que pasa si nadie configuró nada.
function esEntornoDePruebas() {
  const modo = (process.env.FACTILIZA_MODO || functions.config().factiliza?.modo || "pruebas").toLowerCase();
  return modo !== "produccion";
}

// docKey → colección real de Firestore.
function coleccionDeDocKey(docKey) {
  const FACTURAS = ["vs-factura", "vs-boleta", "vs-cotizacion", "vs-notas"];
  const FACTURAS_VC = ["va-factura", "va-boleta", "va-cotizacion", "va-guia", "va-notacredito",
    "c-factura", "c-boleta", "c-notas", "c-guia", "c-orden", "al-notaventa"];
  if (FACTURAS.includes(docKey)) return "Facturas";
  if (FACTURAS_VC.includes(docKey)) return "FacturasVentasCompras";
  return docKey;
}

// ── Reintentos ────────────────────────────────────────────────────────────────
// SUNAT da 3 días para declarar un comprobante. Pasado ese plazo ya no sirve de nada
// seguir intentándolo: hay que emitir uno nuevo.
const DIAS_DE_PLAZO = 3;
const MAX_INTENTOS = 20;

// Backoff 3^n minutos con tope de 1 hora. Un fallo de comunicación suele resolverse solo;
// machacar el API cada minuto no ayuda y consume cuota.
function proximoIntento(intentos) {
  const minutos = Math.min(Math.pow(3, Math.max(0, intentos)), 60);
  return new Date(Date.now() + minutos * 60 * 1000).toISOString();
}

function fechaDelDocumento(doc) {
  const v = doc.fecha ?? doc.Fecha;
  if (!v) return null;
  if (typeof v === "string") return new Date(v.length === 10 ? v + "T00:00:00" : v);
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
  return null;
}

function fueraDePlazo(doc) {
  const f = fechaDelDocumento(doc);
  if (!f || isNaN(f.getTime())) return false;
  const dias = (Date.now() - f.getTime()) / (24 * 60 * 60 * 1000);
  return dias > DIAS_DE_PLAZO;
}

// Núcleo del envío, compartido por el botón del admin y el barrido automático.
async function enviarComprobante(colName, docId, token) {
  const esPrueba = esEntornoDePruebas();
  const realCol = coleccionDeDocKey(colName);
  const docRef = db.doc(realCol + "/" + docId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Documento no encontrado en " + realCol);
  }
  const doc = snap.data();
  const intentos = Number(doc.sunatIntentos || 0);

  // Los correlativos de prueba salen de un contador aparte (LastCode/PRUEBA-F001) para no
  // quemar numeración real. El frontend decide de cuál tirar leyendo VITE_FACTILIZA_MODO,
  // que es una copia de FACTILIZA_MODO y por tanto puede desincronizarse. Este control es
  // el que impide que esa desincronización acabe presentando ante SUNAT un número que
  // nació en pruebas: la numeración real tiene que ser continua y sin intrusos.
  const nacidoEnPruebas = String(doc.correlativoDe || "").startsWith("PRUEBA-");
  if (nacidoEnPruebas !== esPrueba && doc.correlativoDe) {
    const err = esPrueba
      ? "Este documento se numeró para producción y el sistema está en modo pruebas. Revise FACTILIZA_MODO y VITE_FACTILIZA_MODO: no coinciden."
      : "Este documento se numeró con el contador de pruebas y no puede declararse como real. Vuelva a emitirlo para que tome un correlativo de producción.";
    await docRef.update({
      estadoSunat: "Error",
      sunatError: err,
      sunatReintentable: false,
      sunatEsPrueba: esPrueba,
      sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: false, sunatSuccess: false, cdrId: null, reintentable: false, message: err };
  }

  // Validar antes de llamar evita gastar el correlativo en un documento incompleto.
  const { payload, endpoint } = buildFactilizaPayload(doc, colName, { esPrueba });
  const errValidacion = validarPayload(payload);
  if (errValidacion) {
    await docRef.update({
      estadoSunat: "Error",
      sunatError: errValidacion,
      sunatReintentable: false,   // es un problema de datos: reintentar no lo arregla
      sunatEsPrueba: esPrueba,
      sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: false, sunatSuccess: false, cdrId: null, reintentable: false, message: errValidacion };
  }

  let { veredicto } = await llamarFactiliza(endpoint, payload, token);

  // Si Factiliza ya lo tenía registrado (viene `hash` o dice «ya existe»), /send responderá
  // lo mismo para siempre: hay que empujarlo por /resend, que lo reprocesa sin duplicarlo.
  if (veredicto.usarResend && veredicto.reintentable) {
    const motivoOriginal = veredicto.mensaje;
    const reintento = await llamarFactiliza(endpoint.replace("/send", "/resend"), payload, token);
    veredicto = reintento.veredicto.aceptado || !reintento.veredicto.usarResend
      ? reintento.veredicto
      : { ...reintento.veredicto, mensaje: reintento.veredicto.mensaje + " (reprocesado vía resend)" };

    // Si el reintento TAMPOCO sale, el mensaje que se guarda no puede ser solo el suyo: el
    // que explica lo que pasa es el del envío. Al emitir B066-000003 —un correlativo que ya
    // estaba usado en la cuenta de pruebas— el usuario leía «No se encontró un documento con
    // la misma serie, correlativo…», que es la queja del /resend y dice justo lo contrario
    // de la causa real, que era «Ya existe un documento con esa serie y correlativo».
    if (!veredicto.aceptado && motivoOriginal && !veredicto.mensaje.includes(motivoOriginal)) {
      veredicto = { ...veredicto, mensaje: motivoOriginal + " · Al reprocesarlo: " + veredicto.mensaje };
    }
  }

  const vencido = !veredicto.aceptado && fueraDePlazo(doc);
  const agotado = !veredicto.aceptado && intentos + 1 >= MAX_INTENTOS;
  const seguiraIntentando = veredicto.reintentable && !vencido && !agotado;

  await docRef.update({
    estadoSunat: veredicto.aceptado ? "Aceptado" : vencido ? "Vencido" : veredicto.estado,
    estadoFactura: veredicto.aceptado ? "Registrado" : "Rechazado",
    sunatCdrId: veredicto.cdrId,
    sunatHash: veredicto.hash || null,
    sunatCodigo: veredicto.codigo || null,
    sunatReintentable: seguiraIntentando,
    sunatIntentos: veredicto.aceptado ? intentos : intentos + 1,
    sunatProximoIntento: seguiraIntentando ? proximoIntento(intentos + 1) : null,
    sunatEsPrueba: esPrueba,
    // Se guarda el RUC emisor real: en pruebas es el de Factiliza, no el de GM Parts, y sin
    // el no hay forma de saber a nombre de quien quedo declarado el comprobante.
    empresa_Ruc: payload.empresa_Ruc,
    sunatError: veredicto.aceptado ? null
      : vencido ? `Venció el plazo de ${DIAS_DE_PLAZO} días para declarar: ${veredicto.mensaje}`
      : veredicto.mensaje,
    sunatEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    sunatSuccess: veredicto.aceptado,
    cdrId: veredicto.cdrId,
    estado: veredicto.aceptado ? "Aceptado" : vencido ? "Vencido" : veredicto.estado,
    reintentable: seguiraIntentando,
    esPrueba,
    message: veredicto.aceptado
      ? (esPrueba ? "Documento aceptado en el entorno de PRUEBAS (sin valor fiscal)" : "Documento validado correctamente en SUNAT")
      : veredicto.mensaje,
  };
}

// Una sola llamada al API: devuelve el veredicto ya interpretado.
async function llamarFactiliza(endpoint, payload, token) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(payload),
  });
  const rawBody = await res.text();
  let json = null;
  if (rawBody) {
    try {
      json = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("Factiliza: respuesta no-JSON", { status: res.status, endpoint, rawBody: rawBody.slice(0, 500) });
    }
  }
  const veredicto = leerRespuesta(res.status, json);
  return { veredicto, httpStatus: res.status, json, rawBody };
}

// El token debería vivir en Secret Manager (el secreto FACTILIZA_INVOICE_TOKEN ya está
// creado en el proyecto), pero conceder acceso a la cuenta de servicio exige el permiso
// `secretmanager.secrets.setIamPolicy`, que la cuenta de despliegue actual no tiene.
// Mientras tanto se lee de functions.config(), que sigue resolviéndose en runtime aunque
// su escritura esté bloqueada. Para activar el secreto, basta con:
//   1. dar el rol «Secret Manager Admin» (o Owner) a la cuenta que despliega
//   2. añadir .runWith({ secrets: ["FACTILIZA_INVOICE_TOKEN"] }) a estas dos funciones
// El orden de lectura del código (env var -> config) ya lo soporta sin más cambios.
exports.sendToSunat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión.");
  }

  const { collection: colName, docId } = data;
  if (!colName || !docId) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan collection y docId.");
  }

  // Facturar y anular no son para cualquiera.
  //
  // Antes bastaba con estar autenticado: cualquier usuario del taller —y, mientras el panel
  // no filtraba, también cualquier cliente— podía emitir una nota de crédito contra SUNAT.
  // Es una operación fiscal irreversible, así que se restringe a administración.
  const ROLES_FACTURACION = [...ROLES_ADMIN, "Asesor Servicio", "Asesor Repuesto"];
  const rol = await rolDelLlamante(context);

  // Además de enviar, esta función hace de puerta de entrada para previsualizar/anular/
  // descargar. Es la única con política de invocador; ver la nota junto a los callables
  // individuales, más abajo.
  const accion = data.accion || "enviar";
  if (accion !== "enviar") {
    if (accion === "anular" && !ROLES_ADMIN.includes(rol)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Anular un comprobante ante SUNAT requiere ser Administrador o Gerente General."
      );
    }
    if (accion !== "anular" && !ROLES_FACTURACION.includes(rol)) {
      throw new functions.https.HttpsError("permission-denied", "Tu rol no permite operar comprobantes.");
    }
    try {
      if (accion === "previsualizarAnulacion") return await previsualizarAnulacionCore(colName, docId);
      if (accion === "anular") return await anularComprobanteCore(colName, docId, data.motivo, context.auth);
      if (accion === "descargar") return await descargarComprobanteCore(colName, docId);
      if (accion === "enviarPorCorreo") return await enviarPorCorreoCore(colName, docId, data.email);
      throw new functions.https.HttpsError("invalid-argument", "Acción desconocida: " + accion);
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error("sendToSunat[" + accion + "] ERROR:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  }

  if (!ROLES_FACTURACION.includes(rol)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Tu rol no permite declarar comprobantes ante SUNAT."
    );
  }

  const token = tokenFacturacion();
  if (!token) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Falta el token de facturación de Factiliza. OJO: el token de consultas DNI/RUC NO sirve aquí, devuelve 401."
    );
  }

  try {
    return await enviarComprobante(colName, docId, token);
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("sendToSunat ERROR:", err);
    throw new functions.https.HttpsError("internal", "Error al enviar a SUNAT: " + err.message);
  }
});

// ═════════════════════════════════════════════════════════════════
// barrerEnviosSunat — función programada (cada 10 minutos)
//
// Sin esto, los reintentos son decorativos: un fallo de comunicación con SUNAT un domingo
// se queda esperando a que alguien abra el panel y pulse el botón. El barrido recoge los
// comprobantes que quedaron pendientes y los vuelve a empujar respetando el backoff.
//
// Despliegue: requiere la API de Cloud Scheduler habilitada en el proyecto.
//   firebase deploy --only functions:default:barrerEnviosSunat
// ═════════════════════════════════════════════════════════════════
const DOCKEY_POR_COLECCION = {
  Facturas: { Factura: "vs-factura", Boleta: "vs-boleta" },
  FacturasVentasCompras: { Factura: "va-factura", Boleta: "va-boleta", NotaCredito: "va-notacredito" },
};

function docKeyDeDocumento(colName, doc) {
  const porTipo = DOCKEY_POR_COLECCION[colName] || {};
  return porTipo[doc.tipofactura] || null;
}

exports.barrerEnviosSunat = functions.pubsub
  .schedule("every 10 minutes")
  .timeZone("America/Lima")
  .onRun(async () => {
    const token = tokenFacturacion();
    if (!token) {
      console.warn("barrerEnviosSunat: sin token de facturación configurado, no hay nada que hacer");
      return null;
    }

    const ahora = new Date().toISOString();
    let recogidos = 0, aceptados = 0, fallidos = 0;

    for (const colName of ["Facturas", "FacturasVentasCompras"]) {
      const snap = await db.collection(colName).where("sunatReintentable", "==", true).get();

      for (const documento of snap.docs) {
        const doc = documento.data();
        if (doc.anulado === true) continue;
        // El backoff manda: si aún no toca, se deja para la siguiente pasada.
        if (doc.sunatProximoIntento && doc.sunatProximoIntento > ahora) continue;

        const docKey = docKeyDeDocumento(colName, doc);
        if (!docKey) {
          console.warn("barrerEnviosSunat: sin docKey para", { colName, id: documento.id, tipofactura: doc.tipofactura });
          continue;
        }

        recogidos++;
        try {
          const r = await enviarComprobante(docKey, documento.id, token);
          if (r.sunatSuccess) aceptados++; else fallidos++;
        } catch (e) {
          fallidos++;
          console.error("barrerEnviosSunat: fallo con", documento.id, e.message);
        }
      }
    }

    console.log(`barrerEnviosSunat: ${recogidos} recogidos · ${aceptados} aceptados · ${fallidos} siguen pendientes`);
    return null;
  });

// ═════════════════════════════════════════════════════════════════
// previsualizarAnulacion / anularComprobante — HTTP callable
//
// Un comprobante aceptado por SUNAT NO se borra: se anula emitiendo una nota de crédito
// (tipo 07, motivo 01 «ANULACION DE LA OPERACION»). Antes el botón de la papelera hacía
// `deleteDoc` sobre el documento — para un comprobante declarado eso deja a SUNAT con un
// documento vivo que en el sistema ya no existe.
// ═════════════════════════════════════════════════════════════════

// Serie de la nota a partir de la del documento afectado: F001 -> FC01, B001 -> BC01.
function serieDeNota(serieOriginal) {
  const s = String(serieOriginal || "").trim().toUpperCase();
  if (!s) return "FC01";
  return s[0] + "C" + s.slice(-2);
}

// Correlativo atómico por serie. Usar la serie como clave (y no el tipo de documento) es
// lo que exige SUNAT: la numeración es continua DENTRO de cada serie.
//
// El modo pruebas cuenta aparte, igual que en el frontend (`claveCorrelativo` en
// src/lib/series.js): una nota de crédito de prueba no puede gastar numeración real.
function claveCorrelativo(serie) {
  return (esEntornoDePruebas() ? "PRUEBA-" : "") + String(serie || "").trim().toUpperCase();
}

async function siguienteCorrelativo(serie) {
  const ref = db.doc("LastCode/" + claveCorrelativo(serie));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists ? Number(snap.data().numero || 0) : 0;
    const siguiente = actual + 1;
    tx.set(ref, { numero: siguiente, serie, updatedAt: new Date().toISOString() }, { merge: true });
    return siguiente;
  });
}

async function leerComprobante(colName, docId) {
  const realCol = coleccionDeDocKey(colName);
  const docRef = db.doc(realCol + "/" + docId);
  const snap = await docRef.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Documento no encontrado.");
  return { docRef, doc: snap.data(), realCol };
}

// Devuelve los números exactos para enseñarlos ANTES de confirmar: anular no puede ser
// un «¿seguro?» a ciegas.
async function previsualizarAnulacionCore(colName, docId) {
  const { doc } = await leerComprobante(colName, docId);
  const declarado = doc.estadoSunat === "Aceptado";
  const serie = doc.serie || doc.nserie || "";
  const items = doc.items || doc.Items || [];

  return {
    declarado,
    yaAnulado: doc.anulado === true,
    numero: `${serie}-${doc.numero || ""}`,
    cliente: doc.cliente || doc.razonSNombre || doc.proveedor || "",
    total: Number(doc.total || doc.Total || 0),
    itemsCount: items.length,
    // Cuántas unidades vuelven al stock al anular.
    unidadesADevolver: items
      .filter((it) => !it.tipo || it.tipo === "repuesto")
      .reduce((s, it) => s + (Number(it.cant ?? it.cantidad) || 0), 0),
    serieNota: declarado ? serieDeNota(serie) : null,
    accion: doc.anulado === true
      ? "Este comprobante ya está anulado."
      : declarado
        ? "Se emitirá una nota de crédito ante SUNAT y el comprobante quedará anulado."
        : "El comprobante no llegó a declararse ante SUNAT, así que solo se marcará como anulado.",
  };
}

/**
 * Devuelve al stock las unidades de un comprobante anulado y deja el rastro en el kárdex.
 *
 * `previsualizarAnulacion` ya calculaba y anunciaba «unidadesADevolver», pero esa cifra solo
 * se enseñaba: la anulación nunca tocaba el stock. Comprobado de punta a punta —se emitió una
 * factura, se anuló con su nota de crédito, y el artículo se quedó con una unidad de menos
 * para siempre—. Cada anulación evaporaba inventario en silencio.
 *
 * No se aborta la anulación si esto falla: el comprobante YA está anulado ante SUNAT y eso
 * es lo que manda. El fallo se registra para poder corregir el stock a mano.
 */
async function devolverStockDeComprobante(doc, referencia) {
  const items = doc.items || doc.Items || [];
  const devueltos = [];

  for (const it of items) {
    if (it.tipo && it.tipo !== "repuesto") continue;
    const cant = Number(it.cant ?? it.cantidad) || 0;
    if (cant <= 0) continue;

    try {
      let ref = null;
      if (it.articleId) {
        ref = db.collection("Articles").doc(it.articleId);
        const snap = await ref.get();
        if (!snap.exists) ref = null;
      }
      if (!ref && it.codigo) {
        const q = await db.collection("Articles").where("Codigo", "==", it.codigo).limit(1).get();
        if (!q.empty) ref = q.docs[0].ref;
      }
      if (!ref) continue;

      await ref.update({ Stock: admin.firestore.FieldValue.increment(cant) });

      await db.collection("Kardex_element").add({
        Article: ref,
        Document_Type: "Ingreso",
        Date: new Date().toISOString().split("T")[0],
        Client: doc.cliente || doc.razonSNombre || "",
        Provider: "",
        Quantity: cant,
        Description: `Anulación ${referencia}`,
        Code_Id: it.codigo || "",
        Unit: it.unidad || "Unidad",
        PricePerUnit: Number(it.pu) || 0,
        Total_Price: (Number(it.pu) || 0) * cant,
        Warehouse: doc.almacen || "",
        type: "Anulacion",
      });

      devueltos.push({ codigo: it.codigo || it.articleId, cantidad: cant });
    } catch (e) {
      console.error("devolverStockDeComprobante: no se pudo devolver", it.codigo, e);
    }
  }

  if (devueltos.length) {
    console.log("Stock devuelto por anulación", referencia, JSON.stringify(devueltos));
  }
  return devueltos;
}

async function anularComprobanteCore(colName, docId, motivo, auth) {
  const { docRef, doc } = await leerComprobante(colName, docId);
  if (doc.anulado === true) {
    throw new functions.https.HttpsError("failed-exists", "Este comprobante ya estaba anulado.");
  }

  const anuladoPor = auth.token?.email || auth.uid;
  const marcaBase = {
    anulado: true,
    anuladoAt: admin.firestore.FieldValue.serverTimestamp(),
    anuladoPor,
    motivoAnulacion: motivo || "ANULACION DE LA OPERACION",
    // Las dos grafías: la colección Facturas guarda «Estado» con mayúscula y es la que leen
    // las listas del panel. Escribiendo solo «estado», un comprobante anulado seguía
    // apareciendo como «Emitida» en pantalla.
    estado: "Anulado",
    Estado: "Anulado",
  };

  // Sin declarar ante SUNAT no hay nada que anular fiscalmente.
  if (doc.estadoSunat !== "Aceptado") {
    await docRef.update(marcaBase);
    const devueltos = await devolverStockDeComprobante(doc, `${doc.serie || doc.nserie || ""}-${doc.numero || ""}`);
    return {
      ok: true,
      conNotaDeCredito: false,
      unidadesDevueltas: devueltos,
      message: "Comprobante anulado (no estaba declarado ante SUNAT).",
    };
  }

  const token = tokenFacturacion();
  if (!token) throw new functions.https.HttpsError("failed-precondition", "Falta el token de facturación de Factiliza.");
  const esPrueba = esEntornoDePruebas();

  const serieOriginal = doc.serie || doc.nserie || "";
  const serieNota = serieDeNota(serieOriginal);
  const correlativoNota = await siguienteCorrelativo(serieNota);

  const nota = {
    ...doc,
    serie: serieNota,
    numero: String(correlativoNota).padStart(6, "0"),
    docRelacion: `${serieOriginal}-${doc.numero || ""}`,
    tipoDocAfectado: String(serieOriginal).toUpperCase().startsWith("B") ? "03" : "01",
    motivoCod: "01",
    motivoDes: motivo || "ANULACION DE LA OPERACION",
    items: doc.items || doc.Items || [],
  };

  const { payload, endpoint } = buildFactilizaPayload(nota, "va-notacredito", { esPrueba });
  const errValidacion = validarPayload(payload);
  if (errValidacion) {
    throw new functions.https.HttpsError("invalid-argument", "No se puede emitir la nota de crédito: " + errValidacion);
  }

  let { veredicto } = await llamarFactiliza(endpoint, payload, token);
  if (veredicto.usarResend && veredicto.reintentable) {
    const reintento = await llamarFactiliza(endpoint.replace("/send", "/resend"), payload, token);
    veredicto = reintento.veredicto;
  }

  if (!veredicto.aceptado) {
    // La nota no se aceptó: NO se marca el comprobante como anulado, porque ante SUNAT
    // sigue vigente. Anunciar una anulación que no existe sería peor que no anular.
    await docRef.update({
      anulacionError: veredicto.mensaje,
      anulacionIntentoAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    throw new functions.https.HttpsError("aborted", "SUNAT no aceptó la nota de crédito: " + veredicto.mensaje);
  }

  await docRef.update({
    ...marcaBase,
    anulacionError: null,
    notaCredito: {
      serie: serieNota,
      numero: nota.numero,
      cdrId: veredicto.cdrId || null,
      hash: veredicto.hash || null,
      esPrueba,
      correlativoDe: claveCorrelativo(serieNota),
      emitidaAt: new Date().toISOString(),
    },
  });

  const devueltos = await devolverStockDeComprobante(doc, `${serieOriginal}-${doc.numero || ""}`);

  return {
    ok: true,
    conNotaDeCredito: true,
    notaCredito: `${serieNota}-${nota.numero}`,
    unidadesDevueltas: devueltos,
    esPrueba,
    message: `Comprobante anulado con la nota de crédito ${serieNota}-${nota.numero}.`,
  };
}

// ═════════════════════════════════════════════════════════════════
// descargarComprobante — HTTP callable
// Trae el PDF y el XML OFICIALES de Factiliza y los guarda en Storage.
//
// El PDF que genera generateDocumentPdf sirve como comprobante interno, pero no vale
// como representación impresa: no lleva el QR ni el hash que SUNAT exige. Y legalmente
// el comprobante ES el XML firmado.
// ═════════════════════════════════════════════════════════════════
// `conContenido` devuelve además los bytes, para que enviar el comprobante por correo no
// tenga que volver a pedírselos a Factiliza.
async function descargarComprobanteCore(colName, docId, { conContenido = false } = {}) {
  const token = tokenFacturacion();
  if (!token) throw new functions.https.HttpsError("failed-precondition", "Falta el token de facturación de Factiliza.");

  const esPrueba = esEntornoDePruebas();
  const realCol = coleccionDeDocKey(colName);
  const docRef = db.doc(realCol + "/" + docId);
  const snap = await docRef.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Documento no encontrado.");
  const doc = snap.data();

  if (doc.estadoSunat !== "Aceptado") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Solo se pueden descargar el PDF y el XML oficiales de un documento aceptado por SUNAT. Estado actual: " + (doc.estadoSunat || "sin enviar")
    );
  }

  const esNota = colName === "va-notacredito";
  const tipoDoc = esNota ? "07" : (colName.includes("boleta") ? "03" : "01");
  const prefijo = esNota ? "/note" : "/invoice";
  const cuerpo = buildDocumentoRequest(doc, tipoDoc, { esPrueba });

  const bucket = admin.storage().bucket();
  const resultado = {};
  const bytes = {};

  for (const formato of ["pdf", "xml"]) {
    const res = await fetch(apiBase(esPrueba) + prefijo + "/" + formato, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) {
      console.warn("descargarComprobante: fallo al traer " + formato, { status: res.status, docId });
      continue;
    }
    const contenido = Buffer.from(await res.arrayBuffer());
    bytes[formato] = contenido;
    const nombre = `sunat/${realCol}/${docId}.${formato}`;
    const file = bucket.file(nombre);
    await file.save(contenido, { contentType: formato === "pdf" ? "application/pdf" : "application/xml" });
    await file.makePublic();
    resultado[formato + "Url"] = "https://storage.googleapis.com/" + bucket.name + "/" + nombre;
  }

  if (Object.keys(resultado).length === 0) {
    throw new functions.https.HttpsError("unavailable", "Factiliza no devolvió el PDF ni el XML del comprobante.");
  }

  await docRef.update({ ...resultado, sunatDescargadoAt: admin.firestore.FieldValue.serverTimestamp() });
  return conContenido ? { ...resultado, bytes, doc, serie: doc.serie || doc.nserie || "" } : resultado;
}

// ═════════════════════════════════════════════════════════════════
// Envío del comprobante al cliente
//
// Cerrar el ciclo: emitido y aceptado, el cliente tiene que recibirlo. Se adjuntan los DOS
// archivos oficiales, no solo el PDF: legalmente el comprobante ES el XML firmado; el PDF
// es su representación impresa. Enviar solo el PDF deja al cliente sin el documento que
// necesita para su propia contabilidad.
//
// Requiere la clave de Resend (el mismo proveedor que ya usa la app móvil):
//   firebase functions:config:set resend.api_key="re_..." --project g-m-parts-lac7fg
//   firebase deploy --only functions:default:sendToSunat --project g-m-parts-lac7fg
// ═════════════════════════════════════════════════════════════════
function claveResend() {
  return process.env.RESEND_API_KEY || (functions.config().resend || {}).api_key || "";
}

const REMITENTE = process.env.FROM_EMAIL || "notificaciones@gmparts.pe";

function cuerpoCorreo({ tipo, numero, cliente, total, moneda }) {
  const importe = `${moneda === "USD" ? "US$" : "S/"} ${Number(total || 0).toFixed(2)}`;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 4px;font-size:19px">${tipo} ${numero}</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">GM Parts · Taller mecánico</p>
    <p style="font-size:15px;line-height:1.6">Estimado/a ${cliente}:</p>
    <p style="font-size:15px;line-height:1.6">
      Adjuntamos su comprobante electrónico por <strong>${importe}</strong>, aceptado por SUNAT.
      Van dos archivos: el PDF, que es la representación impresa, y el XML firmado, que es el
      comprobante en sí y el que necesita su contador.
    </p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-top:24px">
      Puede verificarlo en www.sunat.gob.pe con su Clave SOL. Si detecta algún error,
      responda a este correo y lo corregimos.
    </p>
    <p style="font-size:13px;color:#6b7280;margin-top:20px">Gracias por su confianza.</p>
  </div>
</body></html>`;
}

async function enviarPorCorreoCore(colName, docId, destinoManual) {
  const clave = claveResend();
  if (!clave) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Falta la clave de Resend. Configúrela con: firebase functions:config:set resend.api_key=\"re_...\""
    );
  }

  const { doc } = await leerComprobante(colName, docId);
  if (doc.estadoSunat !== "Aceptado") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Solo se envía al cliente un comprobante aceptado por SUNAT. Estado actual: " + (doc.estadoSunat || "sin enviar")
    );
  }

  const destino = String(destinoManual || doc.email || doc.Email || doc.correo || "").trim();
  if (!destino || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destino)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El cliente no tiene un correo válido registrado. Indique uno al enviar."
    );
  }

  const { bytes } = await descargarComprobanteCore(colName, docId, { conContenido: true });
  const adjuntos = [];
  const serie = doc.serie || doc.nserie || "";
  const nombreBase = `${serie}-${doc.numero || docId}`;
  if (bytes.pdf) adjuntos.push({ filename: `${nombreBase}.pdf`, content: bytes.pdf });
  if (bytes.xml) adjuntos.push({ filename: `${nombreBase}.xml`, content: bytes.xml });
  if (!adjuntos.length) {
    throw new functions.https.HttpsError("unavailable", "No se pudo obtener el comprobante oficial para adjuntarlo.");
  }

  const tipo = doc.tipofactura || "Comprobante";
  const { Resend } = require("resend");
  const resend = new Resend(clave);
  const asunto = `${tipo} ${nombreBase} — GM Parts`;

  const envio = await resend.emails.send({
    from: REMITENTE,
    to: destino,
    subject: asunto,
    html: cuerpoCorreo({
      tipo,
      numero: nombreBase,
      cliente: doc.cliente || doc.razonSNombre || "cliente",
      total: doc.total || doc.Total,
      moneda: doc.moneda,
    }),
    attachments: adjuntos,
  });

  if (envio?.error) {
    throw new functions.https.HttpsError("internal", "Resend rechazó el envío: " + (envio.error.message || ""));
  }

  await db.doc(coleccionDeDocKey(colName) + "/" + docId).update({
    correoEnviadoA: destino,
    correoEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, destino, adjuntos: adjuntos.map((a) => a.filename), message: `Comprobante enviado a ${destino}.` };
}

// ═════════════════════════════════════════════════════════════════
// Exposición de las tres acciones anteriores
//
// Cada una tiene su propia función callable, que es lo natural. Pero desplegarlas exige
// escribir la política de invocador (`roles/cloudfunctions.admin`), permiso que la cuenta
// de despliegue todavía no tiene: las funciones se crean y devuelven 403 antes de llegar
// al código. Para no dejar la anulación inservible por un tema de permisos, las tres
// acciones se enrutan también por `sendToSunat`, que sí tiene política de invocador
// porque la creó el dueño del proyecto.
//
// El frontend llama por `accion` (ver `llamarComprobantes` en src/lib/comprobantes.js).
// Cuando se conceda el rol, basta con redesplegar: los callables individuales quedan
// listos y el frontend puede volver a apuntar a ellos sin tocar la lógica.
// ═════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════
// sincronizarRolesAuth — copia el rol de Firestore al token de Auth
//
// Las reglas de seguridad necesitan saber el rol de quien llama. Buscarlo en
// users/{uid} obliga a que el ID del documento sea el uid, y en esta base no siempre lo
// es: 2 de 15 usuarios tienen ID autogenerado, y uno de ellos es Administrador — con las
// reglas nuevas se quedaría sin poder borrar nada.
//
// Un custom claim no depende de cómo se llame el documento y, además, no gasta una lectura
// de Firestore en cada comprobación de regla.
//
// Se ejecuta una vez antes de desplegar las reglas, y luego cada vez que cambie un rol.
// Los usuarios afectados verán el claim nuevo al renovar su token (hasta 1 hora, o al
// instante si cierran y abren sesión).
// ═════════════════════════════════════════════════════════════════
// Tiene que coincidir EXACTAMENTE con EMPLOYEE_ROLES + Cliente de src/lib/roles.js.
//
// La versión anterior decía «Asesor» a secas, y el alta del panel crea «Asesor Servicio» y
// «Asesor Repuesto». El efecto era silencioso y grave: todo asesor caía en `rolDesconocido`,
// se quedaba sin custom claim y, con las reglas nuevas, sin permisos. Tampoco existía
// «Asesor Repuesto». Al no haber todavía ningún asesor dado de alta en producción, el fallo
// no se había manifestado.
const ROLES_VALIDOS = [
  "Administrador", "Gerente General", "Jefe de Taller",
  "Asesor Servicio", "Asesor Repuesto", "Tecnico Mecanico", "Cliente",
];

// Roles que pueden ejecutar acciones irreversibles: borrar, anular comprobantes, gestionar
// usuarios. Es el equivalente de ROLES_ADMIN en src/lib/roles.js.
const ROLES_ADMIN = ["Administrador", "Gerente General"];

async function sincronizarRolesCore(soloSimular) {
  const usuarios = await db.collection("users").get();

  // Índice de Auth por correo: es lo que permite emparejar a los usuarios cuyo documento
  // no se llama como su uid.
  const porCorreo = new Map();
  let pageToken;
  do {
    const pagina = await admin.auth().listUsers(1000, pageToken);
    for (const u of pagina.users) {
      if (u.email) porCorreo.set(u.email.toLowerCase(), u.uid);
    }
    pageToken = pagina.pageToken;
  } while (pageToken);

  const resultado = { actualizados: [], sinCuentaAuth: [], rolDesconocido: [], yaCorrectos: 0 };

  for (const d of usuarios.docs) {
    const x = d.data();
    const rol = x.user_role || "";
    const correo = String(x.email || x.correo || "").toLowerCase();

    if (!ROLES_VALIDOS.includes(rol)) {
      resultado.rolDesconocido.push({ id: d.id, rol, correo });
      continue;
    }

    // El uid sale del propio ID si ya lo es; si no, del correo.
    const uid = porCorreo.get(correo) || (d.id.length === 28 ? d.id : null);
    if (!uid) {
      resultado.sinCuentaAuth.push({ id: d.id, rol, correo });
      continue;
    }

    const actual = (await admin.auth().getUser(uid)).customClaims || {};
    if (actual.role === rol) {
      resultado.yaCorrectos++;
      continue;
    }

    if (!soloSimular) {
      await admin.auth().setCustomUserClaims(uid, { ...actual, role: rol });
    }
    resultado.actualizados.push({ uid, rol, correo, docId: d.id, coincideId: uid === d.id });
  }

  return {
    ...resultado,
    simulado: soloSimular,
    total: usuarios.size,
    message: soloSimular
      ? `Simulación: se actualizarían ${resultado.actualizados.length} de ${usuarios.size} usuarios.`
      : `${resultado.actualizados.length} roles sincronizados de ${usuarios.size} usuarios.`,
  };
}

// Estas tres acciones NO se exportan como funciones propias, a propósito.
//
// Publicar un callable nuevo exige escribir su política de invocador, que necesita el
// permiso `cloudfunctions.functions.setIamPolicy` (rol «Cloud Functions Admin»). La cuenta
// de despliegue no lo tiene: comprobado el 2026-08-17 con la cuenta correcta, tiene
// `iam.serviceAccounts.actAs` pero no el de la política. El resultado es una función que
// se crea y devuelve 403 antes de ejecutar una línea.
//
// Se llegaron a desplegar así y eran endpoints muertos que además hacían fallar cualquier
// despliegue completo del codebase. Por eso se retiran: las tres acciones se sirven desde
// `sendToSunat` mediante el parámetro `accion`, que sí tiene política porque la función la
// creó el dueño del proyecto. Ver `src/lib/comprobantes.js`.
//
// Para volver a exponerlas cuando se conceda el rol: reañadir aquí los tres `exports`
// llamando a `previsualizarAnulacionCore` / `anularComprobanteCore` /
// `descargarComprobanteCore` (con la guarda de sesión y de argumentos), y poner
// USAR_CALLABLES_DIRECTOS = true en el frontend. La lógica no cambia.

// ═════════════════════════════════════════════════════════════════
// Sincronización automática de roles al token de Auth
//
// Las reglas de seguridad resuelven el rol con `users/{uid}`, lo que da por hecho que el ID
// del documento es el uid de Auth. Para los 2 usuarios cuyo documento tiene ID autogenerado
// —uno de ellos Administrador— esa búsqueda falla, y el único camino que les queda es el
// custom claim del token, que no depende de cómo se llame el documento.
//
// Dejarlo en un botón manual convertía la sincronización en un paso que hay que recordar:
// si alguien cambia un rol en la consola de Firebase, o si nadie pulsa el botón antes de
// desplegar las reglas, ese administrador se queda sin permisos. Por eso va automático:
//
//   · onUserRoleWrite  — reacciona al instante a cualquier alta o cambio de rol.
//   · barrerRolesAuth  — red de seguridad cada 30 minutos, y es quien deja el sistema
//                        consistente la primera vez sin que nadie tenga que hacer nada.
//
// Ambas son idempotentes: si el claim ya coincide, no escriben.
// ═════════════════════════════════════════════════════════════════
async function aplicarClaimDeRol(uid, rol) {
  const actual = (await admin.auth().getUser(uid)).customClaims || {};
  if (actual.role === rol) return false;
  await admin.auth().setCustomUserClaims(uid, { ...actual, role: rol });
  return true;
}

exports.onUserRoleWrite = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;   // borrado: de eso se ocupa onUserDeleted

    const despues = change.after.data();

    // Se comprueba en CUALQUIER escritura, no solo cuando cambia el rol. Limitarlo al
    // cambio parecía más eficiente, pero dejaba sin arreglar el caso más importante: un
    // usuario cuyo claim nunca se llegó a poner. Así el permiso se autocorrige solo con
    // que alguien toque su ficha. `aplicarClaimDeRol` no escribe si el claim ya coincide,
    // de modo que el coste real es una lectura de Auth.
    const rol = despues.user_role || "";
    if (!ROLES_VALIDOS.includes(rol)) {
      console.warn("onUserRoleWrite: rol no reconocido, no se aplica claim", {
        docId: context.params.userId, rol,
      });
      return null;
    }

    // El uid sale del propio ID del documento si ya lo es; si no, del correo.
    let uid = context.params.userId.length === 28 ? context.params.userId : null;
    if (!uid) {
      const correo = String(despues.email || despues.correo || "").trim().toLowerCase();
      if (!correo) return null;
      try {
        uid = (await admin.auth().getUserByEmail(correo)).uid;
      } catch {
        console.warn("onUserRoleWrite: sin cuenta de Auth para", correo);
        return null;
      }
    }

    try {
      const cambiado = await aplicarClaimDeRol(uid, rol);
      if (cambiado) console.log("onUserRoleWrite: claim aplicado", { uid, rol });

      // Deja constancia en el propio documento de qué cuenta de Auth le corresponde.
      //
      // Sirve para dos cosas: hace visible desde el panel qué usuarios tienen el documento
      // mal nombrado (los que traen `auth_uid` distinto de su ID), y permite comprobar sin
      // depender de los registros que la resolución por correo funcionó.
      //
      // La condición evita el bucle: la segunda pasada ya encuentra el valor puesto y no
      // vuelve a escribir.
      if (despues.auth_uid !== uid) {
        await change.after.ref.update({ auth_uid: uid });
      }
    } catch (e) {
      console.error("onUserRoleWrite ERROR:", e);
    }
    return null;
  });

// Borra de `users` los restos de contraseña.
//
// El alta de personal guardaba `password_plain` con la contraseña EN CLARO (5 usuarios la
// tenían) y `password_hash` del antiguo login por Firestore (6 usuarios). El código ya no
// los escribe, pero los valores seguían en la base y cualquiera con acceso de lectura a
// `users` podía leerlos. La contraseña vive en Firebase Auth y en ningún otro sitio.
//
// Va en el barrido en vez de en un script suelto porque, con las reglas ya cerradas, solo
// el Admin SDK puede escribir aquí. Y al repetirse, sirve de red: si algo volviera a
// escribir esos campos, se borran solos.
async function purgarRestosDeContrasena() {
  const usuarios = await db.collection("users").get();
  const limpiados = [];

  for (const d of usuarios.docs) {
    const x = d.data();
    const tiene = ["password_plain", "password_hash"].filter((c) => x[c] !== undefined);
    if (!tiene.length) continue;

    const borrado = {};
    for (const campo of tiene) borrado[campo] = admin.firestore.FieldValue.delete();
    await d.ref.update(borrado);
    limpiados.push({ id: d.id, campos: tiene });
  }

  return limpiados;
}

// ── Alta puntual de un administrador ──────────────────────────────
// Existe por el problema del huevo y la gallina: `createAuthUser` exige que quien llama
// YA sea administrador, así que si nadie puede entrar al panel no hay forma de dar de alta
// al primero. Esta constante se rellena con un correo, se despliega una vez, y se vuelve a
// dejar vacía. Con "" el bloque no hace absolutamente nada.
//
// La contraseña inicial se fija aquí y se comunica al interesado. Es una decisión
// deliberada del propietario del proyecto para el alta de arranque; conviene cambiarla
// tras el primer acceso, porque una contraseña que ha viajado por un canal de texto deja
// rastro en él. Ambas constantes se vacían y se vuelve a desplegar en cuanto la cuenta
// está creada, para que no queden credenciales en el código.
// Altas puntuales. Se rellena la lista, se despliega una vez, y se vuelve a vaciar.
// Con la lista vacía el bloque no hace absolutamente nada.
const ALTAS_PENDIENTES = [];
// El rol con el que se da de alta. Antes esta función solo servía para el primer
// administrador; ahora también para crear una cuenta con un rol concreto y poder comprobar
// contra el servidor de PRODUCCIÓN que las reglas deniegan lo que tienen que denegar. Con
// un administrador eso no se puede probar: todo le está permitido.

async function altaAdministrador({ correo, clave, rol }) {
  const db = admin.firestore();
  let usuario;
  let creada = false;

  try {
    usuario = await admin.auth().getUserByEmail(correo);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    usuario = await admin.auth().createUser({
      email: correo,
      password: clave,
      emailVerified: false,
    });
    creada = true;
  }

  // Si la cuenta ya existía, se le fija igualmente la contraseña acordada: de lo contrario
  // el alta "funcionaría" y el acceso seguiría sin ser posible.
  if (!creada) {
    await admin.auth().updateUser(usuario.uid, { password: clave });
  }

  // El documento se llama como el uid siempre que se pueda: es lo que evita el problema
  // que ya arrastran los 2 usuarios con ID autogenerado.
  const porCorreo = await db.collection("users").where("email", "==", correo).limit(1).get();
  const ref = porCorreo.empty
    ? db.collection("users").doc(usuario.uid)
    : porCorreo.docs[0].ref;

  await ref.set({
    email: correo,
    display_name: usuario.displayName || correo.split("@")[0],
    user_role: rol,
    cargo_empleado: rol,
    auth_uid: usuario.uid,
  }, { merge: true });

  await aplicarClaimDeRol(usuario.uid, rol);

  // No se registra la contraseña en ningún log: quien la necesita ya la tiene.
  return { correo, rol, uid: usuario.uid, cuentaCreada: creada, documento: ref.id };
}

exports.barrerRolesAuth = functions.pubsub
  .schedule("every 30 minutes")
  .timeZone("America/Lima")
  .onRun(async () => {
    try {
      const limpiados = await purgarRestosDeContrasena();
      if (limpiados.length) {
        console.log("barrerRolesAuth: restos de contraseña borrados", JSON.stringify(limpiados));
      }
    } catch (e) {
      console.error("barrerRolesAuth: fallo al purgar contraseñas", e);
    }

    for (const cuenta of ALTAS_PENDIENTES) {
      try {
        const alta = await altaAdministrador(cuenta);
        console.log("ALTA:", JSON.stringify(alta));
      } catch (e) {
        console.error("ALTA: fallo con " + cuenta.correo, e);
      }
    }

    const res = await sincronizarRolesCore(false);
    // Solo se registra cuando hay algo que contar: si no, son 48 líneas de ruido al día.
    if (res.actualizados.length || res.sinCuentaAuth.length || res.rolDesconocido.length) {
      console.log("barrerRolesAuth:", JSON.stringify({
        actualizados: res.actualizados.length,
        yaCorrectos: res.yaCorrectos,
        sinCuentaAuth: res.sinCuentaAuth,
        rolDesconocido: res.rolDesconocido,
      }));
    }
    return null;
  });
