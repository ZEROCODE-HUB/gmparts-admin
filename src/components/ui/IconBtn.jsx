const tones = {
  muted: "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
  danger: "text-[var(--danger)] hover:bg-[var(--danger-dim)]",
  accent: "text-[var(--accent)] hover:bg-[var(--accent-dim)]",
};

export default function IconBtn({ icon: Icon, tone = "muted", onClick, title }) {
  return (
    <button title={title} onClick={onClick} className={`p-1.5 rounded-md transition-colors ${tones[tone]}`}>
      <Icon size={15} />
    </button>
  );
}
