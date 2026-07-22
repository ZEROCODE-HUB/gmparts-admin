export default function Table({ columns, rows, renderRow, empty = "Sin datos" }) {
  return (
    <div className="bg-[var(--panel)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto gmp-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left text-[11px] uppercase tracking-wide text-[var(--text)] font-semibold">
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--muted)] text-sm">{empty}</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className="gmp-row border-t border-[var(--line-soft)]">
                {renderRow(r, i)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-top text-[var(--text)] ${className}`}>{children}</td>;
}
