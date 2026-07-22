// Autenticación real con Firebase Auth (Fase D2, §3.3 de BACKEND_SPEC).
// Reemplaza el mock de Fase B. El rol se lee desde users.user_role (users_record.dart).
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const LS_KEY = "gmp_session_v1";

function translateAuthError(e) {
  const c = e && e.code;
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found")
    return "Credenciales inválidas";
  if (c === "auth/invalid-email") return "Correo inválido";
  if (c === "auth/too-many-requests") return "Demasiados intentos. Intenta más tarde.";
  if (c === "auth/user-disabled") return "Usuario deshabilitado";
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
  } catch {
    /* si no existe el doc users aún, rol por defecto */
  }
  return { email: user.email, displayName, userRole, uid: user.uid };
}

// Suscribe a cambios de estado de Auth. Devuelve unsubscribe.
export function observeAuth(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null);
      return;
    }
    cb(await loadRole(user));
  });
}

export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const session = await loadRole(cred.user);
    localStorage.setItem(LS_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch (e) {
    return { ok: false, error: translateAuthError(e) };
  }
}

export async function logout() {
  localStorage.removeItem(LS_KEY);
  try {
    await fbSignOut(auth);
  } catch {
    /* ignore */
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Roles que pueden ver el módulo de Administración (splash_widget.dart:37-40).
// Flutter: if userRole == 'Administrador' || 'Gerente General' || 'Jefe de Taller' || 'Asesor Servicio'.
export function canViewAdministracion(role) {
  return ["Administrador", "Gerente General", "Jefe de Taller", "Asesor Servicio"].includes(role);
}

// Roles de empleado usados en el listado de Personal (b_pc_registro_de_personal_widget.dart:85-87).
export const EMPLOYEE_ROLES = [
  "Asesor Servicio",
  "Asesor Repuesto",
  "Jefe de Taller",
  "Administrador",
  "Gerente General",
  "Tecnico Mecanico",
];
