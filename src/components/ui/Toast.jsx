import { useEffect, useState } from "react";

let toastId = 0;
let listeners = [];

export function showToast(message, type = "success") {
  const id = ++toastId;
  listeners.forEach((fn) => fn({ id, message, type }));
  return id;
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
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 2500);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter((l) => l !== handler); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium gmp-toast-enter ${
            item.type === "error" ? "bg-[var(--danger)] text-white" : "bg-green-600 text-white"
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
