const tones = {
  neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--line)]",
  accent: "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]",
  info: "bg-[var(--info-dim)] text-[var(--info)] border-[var(--info-border)]",
  amber: "bg-[var(--amber-dim)] text-[var(--amber)] border-[var(--amber-border)]",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger-border)]",
  success: "bg-[var(--success-dim)] text-[var(--success)] border-[var(--success-border)]",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}
