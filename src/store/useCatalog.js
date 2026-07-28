// Hook de catálogos respaldado en Firestore (Fase D1).
// Suscripción en tiempo real vía onSnapshot. Sin fallback a semillas locales.
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { mapDocKeyToCollection, CATALOG_NAME_FIELD } from "./firestoreDb";

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
  return live;
}
