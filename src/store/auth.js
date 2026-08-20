import { auth, db, functions } from "../lib/firebase";
import {
  signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
  updatePassword as fbUpdatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { puedeEntrarAlPanel, puedeVerModulo } from "../lib/roles";

const LS_KEY = "gmp_session_v1";

// El acceso se valida SIEMPRE contra Firebase Auth.
//
// Antes existía un segundo camino que leía `users.password_hash` desde el navegador y
// comparaba el bcrypt en el cliente. Con las reglas de Firestore abiertas, eso permitía a
// cualquiera descargarse todos los hashes de contraseña del taller. Se eliminó tras
// comprobar (2026-08-16) que no dejaba fuera a nadie: los 6 usuarios que tenían hash
// tienen también cuenta en Auth, y los 2 que no tenían ninguno de los dos tampoco podían
// entrar por ese camino.
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const session = await loadRole(cred.user);

    // El panel es para el personal del taller. Antes bastaba con tener cuenta en Firebase
    // Auth: las 11 cuentas de cliente entraban y solo se les ocultaba un grupo del menú, con
    // las rutas accesibles escribiéndolas a mano. El cliente tiene su propio micrositio.
    if (!puedeEntrarAlPanel(session.userRole)) {
      await fbSignOut(auth);
      localStorage.removeItem(LS_KEY);
      return {
        ok: false,
        error: session.userRole === "Cliente"
          ? "Esta cuenta es de cliente. Use el enlace que le enviamos para ver su vehículo."
          : "Su usuario no tiene un rol asignado en el taller. Contacte con administración.",
      };
    }

    localStorage.setItem(LS_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch (e) {
    return { ok: false, error: translateAuthError(e) };
  }
}

function translateAuthError(e) {
  const c = e?.code;
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found")
    return "Credenciales inválidas";
  if (c === "auth/invalid-email") return "Correo inválido";
  if (c === "auth/too-many-requests") return "Demasiados intentos. Intenta más tarde.";
  if (c === "auth/user-disabled") return "Usuario deshabilitado";
  if (c === "auth/email-already-in-use") return "El correo ya está registrado";
  return "Error al iniciar sesión";
}

// Resuelve el rol del usuario que acaba de entrar.
//
// Buscar solo por `users/{uid}` da por hecho que el ID del documento ES el uid de Auth, y en
// esta base no siempre lo es: alex.vilcahuaman@gearmotorparts.com es Administrador y su
// documento se llama `lmmhWeOIsEvvIVw7UVVt`. Con la búsqueda anterior no se encontraba, caía
// al valor por defecto «Cliente» y ese administrador entraba al panel degradado, sin ver
// siquiera el menú de Administración.
//
// Orden: el custom claim del token (lo pone `sincronizarRolesAuth`), luego el documento por
// uid, y por último una búsqueda por correo. El correo es lo que rescata a los documentos mal
// nombrados.
async function loadRole(user) {
  let userRole = "";
  let displayName = user.email;

  try {
    const token = await user.getIdTokenResult();
    if (token?.claims?.role) userRole = token.claims.role;
  } catch { /* sin claim todavía; se resuelve abajo */ }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      userRole = userRole || d.user_role || "";
      displayName = d.display_name || user.email;
    } else if (user.email) {
      const porCorreo = await getDocs(
        query(collection(db, "users"), where("email", "==", user.email), limit(1))
      );
      if (!porCorreo.empty) {
        const d = porCorreo.docs[0].data();
        userRole = userRole || d.user_role || "";
        displayName = d.display_name || user.email;
      }
    }
  } catch { /* si no se puede leer, se queda sin rol y el panel lo rechaza */ }

  // Sin rol reconocido no se inventa uno: antes el valor por defecto era «Cliente», que
  // además de ser incorrecto para el personal, daba acceso al panel.
  return { email: user.email, displayName, userRole: userRole || "", uid: user.uid };
}

export function observeAuth(cb) {
  return onAuthStateChanged(auth, async (user) => {
    // Sin usuario en Firebase Auth no hay sesión. Antes se conservaba la de localStorage
    // para sostener el login por Firestore, y eso hacía que una sesión sobreviviera a la
    // expiración del token de Auth.
    if (!user) {
      cb(null);
      return;
    }
    const sesion = await loadRole(user);
    // Misma puerta que en login: si la sesión se restaura desde una pestaña abierta o desde
    // el token guardado, un cliente tampoco debe acabar dentro del panel.
    if (!puedeEntrarAlPanel(sesion.userRole)) {
      cb(null);
      return;
    }
    cb(sesion);
  });
}

export async function fbCreateUser(email, password) {
  try {
    const fn = httpsCallable(functions, "createAuthUser");
    const res = await fn({ email, password });
    return { ok: true, uid: res.data.uid };
  } catch (e) {
    const msg = e?.message || e?.code || "";
    if (msg.includes("already-exists") || msg.includes("already registered")) {
      return { ok: false, error: "El correo ya está registrado." };
    }
    return { ok: false, error: "Error al crear usuario en Auth." };
  }
}

export async function logout() {
  localStorage.removeItem(LS_KEY);
  try { await fbSignOut(auth); } catch { /* ignore */ }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Cambia la contraseña en Firebase Auth, reautenticando primero con la actual.
// Antes esto reescribía un hash bcrypt en el documento de Firestore, con lo que la
// contraseña real de Auth no cambiaba y quedaba una credencial paralela en la base.
export async function updatePassword(_uid, currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Vuelve a iniciar sesión para cambiar tu contraseña" };
  try {
    const credencial = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credencial);
    await fbUpdatePassword(user, newPassword);
    return { ok: true };
  } catch (e) {
    const c = e?.code;
    if (c === "auth/wrong-password" || c === "auth/invalid-credential") {
      return { ok: false, error: "Contraseña actual incorrecta" };
    }
    if (c === "auth/weak-password") {
      return { ok: false, error: "La contraseña nueva es demasiado corta (mínimo 6 caracteres)" };
    }
    if (c === "auth/requires-recent-login") {
      return { ok: false, error: "Por seguridad, vuelve a iniciar sesión antes de cambiar la contraseña" };
    }
    return { ok: false, error: "Error al cambiar contraseña" };
  }
}

// La lista de roles y el reparto de permisos viven en src/lib/roles.js, que es la única
// fuente de verdad. Se reexportan aquí para no romper los imports existentes.
export { EMPLOYEE_ROLES, ROLES, esAdmin, puedeVerModulo, puedeVerRuta } from "../lib/roles";

export function canViewAdministracion(role) {
  return puedeVerModulo(role, "administracion");
}
