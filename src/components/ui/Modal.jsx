import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ title, subtitle, onClose, children, wide }) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 120);
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto gmp-scroll bg-black/60 p-6 gmp-modal-overlay ${closing ? "closing" : ""}`}>
      <div className={`gmp-modal-panel ${closing ? "closing" : ""} bg-[var(--surface-3)] rounded-lg w-full ${wide ? "max-w-4xl" : "max-w-lg"} mt-8 border border-[var(--line-soft)]`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--line-soft)]">
          <div>
            <h3 className="gmp-display text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
