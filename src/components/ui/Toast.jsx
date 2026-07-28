import { useEffect, useState } from "react";
import { X } from "lucide-react";

let toastId = 0;
let listeners = [];

export function showToast(message, type = "success", persistent = false) {
  const id = ++toastId;
  listeners.forEach((fn) => fn({ id, message, type, persistent }));
  return id;
}

export function dismissToast(id) {
  listeners.forEach((fn) => fn({ id, dismiss: true }));
}

export function dismissAll() {
  listeners.forEach((fn) => fn({ dismissAll: true }));
}

let _toastEl = null;
export function toast(message, type = "success") {
  if (!_toastEl) _toastEl = document.createElement("div");
  _toastEl.textContent = message;
  showToast(message, type);
}

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (item) => {
      if (item.dismissAll) {
        setItems([]);
        return;
      }
      if (item.dismiss) {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        return;
      }
      setItems((prev) => [...prev, item]);
      if (!item.persistent) {
        setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== item.id));
        }, 2500);
      }
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter((l) => l !== handler); };
  }, []);

  const errors = items.filter((t) => t.type === "error");
  const others = items.filter((t) => t.type !== "error");

  const dismiss = (id) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 max-w-sm">
          {errors.map((item) => (
            <div key={item.id} className="pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-[var(--danger)] text-white gmp-toast-enter">
              <span className="flex-1">{item.message}</span>
              <button onClick={() => dismiss(item.id)} className="p-0.5 rounded hover:bg-white/20"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {others.map((item) => (
            <div key={item.id} className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium gmp-toast-enter ${item.type === "error" ? "bg-[var(--danger)] text-white" : "bg-green-600 text-white"}`}>
              {item.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
