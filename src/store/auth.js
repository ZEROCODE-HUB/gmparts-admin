import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, limit as qLimit,
} from "firebase/firestore";
import { hashPassword, verifyPassword } from "../lib/authLib";

const LS_KEY = "gmp_session_v1";

// Intenta login con Firebase Auth. Si el usuario no existe en Auth,
// intenta con Firestore (para usuarios creados desde admin).
export async function login(email, password) {
  // 1st attempt: Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const session = await loadRole(cred.user);
    localStorage.setItem(LS_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch (e) {
    const c = e?.code;
    // Si el usuario no existe en Auth, intentar con Firestore
    if (c === "auth/user-not-found" || c === "auth/invalid-credential") {
      return loginWithFirestore(email, password);
    }
    return { ok: false, error: translateAuthError(e) };
  }
}

async function loginWithFirestore(email, password) {
  try {
    const q = query(collection(db, "users"), where("email", "==", email.trim()), qLimit(1));
    const snap = await getDocs(q);
    if (snap.empty) return { ok: false, error: "Credenciales inválidas" };

    const userDoc = snap.docs[0];
    const data = userDoc.data();
    const hash = data.password_hash || data.passwordHash || "";
    const valid = await verifyPassword(password, hash);
    if (!valid) return { ok: false, error: "Credenciales inválidas" };

    const session = makeSession(userDoc);
    localStorage.setItem(LS_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch {
    return { ok: false, error: "Error al iniciar sesión" };
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

async function loadRole(user) {
  let userRole = "Cliente";
  let displayName = user.email;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      userRole = d.user_role || userRole;
      displayName = d.display_name || user.email;
    }
  } catch { /* si no existe el doc users aún, rol por defecto */ }
  return { email: user.email, displayName, userRole, uid: user.uid };
}

function makeSession(docSnap) {
  const d = docSnap.data();
  return {
    email: d.email || "",
    displayName: d.display_name || d.email || "",
    userRole: d.user_role || "Cliente",
    uid: docSnap.id,
  };
}

export function observeAuth(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Si no hay usuario en Firebase Auth pero hay sesión en localStorage
      // (login vía Firestore), mantener la sesión
      cb(getSession());
      return;
    }
    cb(await loadRole(user));
  });
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

export async function updatePassword(uid, currentPassword, newPassword) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { ok: false, error: "Usuario no encontrado" };

    const data = snap.data();
    const hash = data.password_hash || data.passwordHash || "";
    const valid = await verifyPassword(currentPassword, hash);
    if (!valid) return { ok: false, error: "Contraseña actual incorrecta" };

    const newHash = await hashPassword(newPassword);
    await updateDoc(doc(db, "users", uid), { password_hash: newHash });
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al cambiar contraseña" };
  }
}

export function canViewAdministracion(role) {
  return ["Administrador", "Gerente General", "Jefe de Taller", "Asesor Servicio"].includes(role);
}

export const EMPLOYEE_ROLES = [
  "Asesor Servicio",
  "Asesor Repuesto",
  "Jefe de Taller",
  "Administrador",
  "Gerente General",
  "Tecnico Mecanico",
];
