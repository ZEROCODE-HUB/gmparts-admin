export default function Field({ label, children, span }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span ? "col-span-2" : ""}`}>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = "bg-[var(--panel-2)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] gmp-focus w-full";
