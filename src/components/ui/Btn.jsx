const variants = {
  primary: "bg-[var(--accent)] text-[#F5EFEF] hover:bg-[#D94038] border border-[var(--accent)]",
  ghost: "border border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-2)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]",
  danger: "border border-[var(--danger-border)] text-[var(--danger)] hover:bg-[var(--danger-dim)]",
  subtle: "text-[var(--muted)] hover:text-[var(--text)]",
};

export default function Btn({ children, variant = "primary", icon: Icon, onClick, type = "button", className = "", loading }) {
  return (
    <button type={type} onClick={onClick} disabled={loading} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all gmp-focus ${variants[variant]} ${className} ${loading ? "opacity-70 cursor-wait" : ""}`}>
      {loading && <span className="gmp-spinner" aria-hidden="true" />}
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}
