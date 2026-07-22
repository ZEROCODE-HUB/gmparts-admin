import { ChevronLeft, ChevronRight } from "lucide-react";

// Componente de paginación reutilizable para todas las listas.
// Muestra hasta 10 páginas visibles con navegación.
//
// Uso:
//   const [page, setPage] = useState(0);
//   const totalPages = Math.ceil(rows.length / 20);
//   const pageRows = rows.slice(page * 20, (page + 1) * 20);
//   <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const visiblePages = [];
  const startPage = Math.max(0, Math.min(page - 4, totalPages - 10));
  const endPage = Math.min(startPage + 10, totalPages);
  for (let i = startPage; i < endPage; i++) {
    visiblePages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      {visiblePages.map((i) => (
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 rounded-md text-sm font-semibold ${
            i === page
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
          }`}
        >
          {i + 1}
        </button>
      ))}
      <button
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
