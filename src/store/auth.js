import { db } from "../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, limit as qLimit } from "firebase/firestore";
import { verifyPassword } from "../lib/authLib";

const LS_KEY = "gmp_session_v1";
const USERS_COL = "users";

function translateError(msg) {
  if (!msg) return "Credenciales inválidas";
  const l = msg.toLowerCase();
  if (l.includes("not-found")) return "Usuario no encontrado";
  if (l.includes("permission")) return "Error de permisos";
  return "Error al iniciar sesión";
}

function makeSession(userDoc) {
  const d = userDoc.data();
  return {
    email: d.email || "",
    displayName: d.display_name || d.email || "",
    userRole: d.user_role || "Cliente",
    uid: userDoc.id,
  };
}

export async function login(email, password) {
  try {
    const q = query(collection(db, USERS_COL), where("email", "==", email.trim()), qLimit(1));
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
  } catch (e) {
    return { ok: false, error: translateError(e.message) };
  }
}

export async function logout() {
  localStorage.removeItem(LS_KEY);
}

export function getSession() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function observeAuth(cb) {
  const session = getSession();
  cb(session);
  return () => {};
}

export async function updatePassword(uid, currentPassword, newPassword) {
  try {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    if (!snap.exists()) return { ok: false, error: "Usuario no encontrado" };

    const data = snap.data();
    const hash = data.password_hash || data.passwordHash || "";
    const valid = await verifyPassword(currentPassword, hash);
    if (!valid) return { ok: false, error: "Contraseña actual incorrecta" };

    const { hashPassword } = await import("../lib/authLib");
    const newHash = await hashPassword(newPassword);
    await updateDoc(doc(db, USERS_COL, uid), { password_hash: newHash });
    return { ok: true };
  } catch (e) {
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
