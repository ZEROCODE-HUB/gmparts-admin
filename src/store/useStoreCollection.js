import { useState } from "react";
import * as db from "./db";

// Hook para listas de documentos respaldadas en el store (localStorage).
export function useStoreCollection(docKey) {
  const [items, setItems] = useState(() => db.getDocuments(docKey));
  const remove = (id) => {
    db.deleteDocument(docKey, id);
    setItems(db.getDocuments(docKey));
  };
  const refresh = () => setItems(db.getDocuments(docKey));
  return [items, { remove, refresh }];
}
