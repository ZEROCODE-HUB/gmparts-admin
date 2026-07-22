import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import Toolbar from "../../components/ui/Toolbar";
import SearchBox from "../../components/ui/SearchBox";
import Table, { Td } from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import { searchArticles } from "../../store/firestoreStock";
import { db } from "../../lib/firebase";
import { doc, deleteDoc, getDocs, collection, query, limit, startAfter, orderBy } from "firebase/firestore";

const PAGE_SIZE = 20;

export default function ArticulosList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cursors, setCursors] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = async (pageIndex, prevCursor = null) => {
    setLoading(true);
    if (pageIndex === 0) {
      const snap = await getDocs(query(collection(db, "Articles"), orderBy("Codigo"), limit(PAGE_SIZE)));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
      setCursors([snap.docs[snap.docs.length - 1] || null]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } else {
      const snap = await getDocs(query(collection(db, "Articles"), orderBy("Codigo"), startAfter(prevCursor), limit(PAGE_SIZE)));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
      setCursors((prev) => { const c = [...prev]; c[pageIndex] = snap.docs[snap.docs.length - 1] || null; return c; });
      setHasMore(snap.docs.length === PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => {
    const term = q.trim();
    if (term.length >= 2) {
      setLoading(true);
      searchArticles(term, { limit: PAGE_SIZE }).then((r) => {
        setItems(r || []);
        setLoading(false);
      });
    } else {
      setPage(0);
      setCursors([]);
      loadPage(0);
    }
  }, [q]);

  const goToPage = (p) => {
    if (p < 0) return;
    if (p < cursors.length) {
      setLoading(true);
      const snap = cursors[p - 1];
      if (!snap) { loadPage(p); return; }
      getDocs(query(collection(db, "Articles"), orderBy("Codigo"), startAfter(snap), limit(PAGE_SIZE))).then((s) => {
        setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPage(p);
        setLoading(false);
      });
    } else {
      loadPage(p, cursors[p - 1]);
      setPage(p);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteDoc(doc(db, "Articles", deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const renderRow = (a) => (
    <>
      <Td><span className="gmp-mono text-[var(--muted)]">{a.Codigo || ""}</span></Td>
      <Td className="font-medium">{a.Nombre_name || ""}</Td>
      <Td className="text-[var(--muted)]">{a.Marca_brand || ""}</Td>
      <Td className="text-[var(--muted)]">{a.Group_Grupo || ""}</Td>
      <Td className="text-[var(--muted)]">{a.Subgroup_Subgrupo || ""}</Td>
      <Td className="gmp-mono">S/ {(a.Precio_compra_Purchase_price ?? 0).toFixed(2)}</Td>
      <Td className="gmp-mono">S/ {(a.Precio_Venta_Sale_price ?? 0).toFixed(2)}</Td>
      <Td><span className={`gmp-mono ${(a.Stock ?? 0) <= (a.Stock_minimo_Minimum_Stock ?? 0) ? "text-[var(--danger)]" : ""}`}>{a.Stock ?? 0}</span></Td>
      <Td className="text-[var(--muted)]">{a.Unidad_de_medida_Measurement_unit || ""}</Td>
      <Td>
        <div className="flex gap-1">
          <button onClick={() => navigate(`/al-articulos/${a.id}`)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"><Pencil size={15} /></button>
          <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-md text-[var(--danger)] hover:bg-[var(--danger-dim)]"><Trash2 size={15} /></button>
        </div>
      </Td>
    </>
  );

  const totalPages = hasMore ? page + 2 : page + 1;

  return (
    <div>
      <Toolbar title="Registro de artículos" count={-1} onNew={() => navigate("/al-articulos/nuevo")} onExport={() => {}} />
      <SearchBox value={q} onChange={setQ} placeholder="Buscar nombre, código, marca..." />
      {loading && <p className="text-sm text-[var(--muted)] py-4">Cargando...</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-[var(--muted)] py-8 text-center">Sin artículos</p>
      )}
      <Table columns={["Código", "Producto", "Marca", "Grupo", "Subgrupo", "P. Compra", "P. Venta", "Stock", "Und", "Acción"]}
        rows={items} renderRow={renderRow} />
      {q.trim().length < 2 && !loading && items.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page === 0} onClick={() => goToPage(page - 1)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"><ChevronLeft size={16} /></button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
            <button key={i} onClick={() => goToPage(i)}
              className={`px-3 py-1 rounded-md text-sm font-semibold ${i === page ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"}`}>
              {i + 1}
            </button>
          ))}
          <button disabled={!hasMore} onClick={() => goToPage(page + 1)} className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}
      {deleteTarget && (
        <Modal title="Eliminar artículo" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[var(--muted)] mb-6">¿Estás seguro que deseas eliminar este artículo?</p>
          <p className="font-medium mb-6">{deleteTarget.Nombre_name}</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
