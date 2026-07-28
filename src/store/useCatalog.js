// Hook de catálogos respaldado en Firestore (Fase D1), con fallback a semillas locales.
// Suscripción en tiempo real vía onSnapshot; mezcla los valores semilla (no persistidos)
// con los documentos vivos de Firestore para no romper selects existentes.
// Soporta semillas como string (name) o como objeto { name, grupo?, marca? }.
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { mapDocKeyToCollection, CATALOG_NAME_FIELD, CATALOG_SEED } from "./firestoreDb";

export function useCatalog(docKey) {
  const [live, setLive] = useState([]);
  const field = CATALOG_NAME_FIELD[docKey] || "name";

  useEffect(() => {
    if (!docKey) return;
    const col = collection(db, mapDocKeyToCollection(docKey));
    const unsub = onSnapshot(query(col, orderBy(field)), (snap) => {
      setLive(snap.docs.map((d) => ({ id: d.id, name: d.data()[field] ?? "", raw: d.data() })));
    });
    return unsub;
  }, [docKey, field]);

  if (!docKey) return [];

  const seed = (CATALOG_SEED[docKey] || []).filter(Boolean);
  const liveNames = new Set(live.map((o) => o.name));
  const seedOptions = seed
    .filter((item) => {
      const name = typeof item === "string" ? item : item.name;
      return !liveNames.has(name);
    })
    .map((item) => {
      if (typeof item === "string") return { id: `seed:${item}`, name: item, seed: true };
      return { id: `seed:${item.name}`, name: item.name, seed: true, ...item };
    });
  return [...live, ...seedOptions];
}
