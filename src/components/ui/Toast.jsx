import { useEffect, useState } from "react";
import { X } from "lucide-react";

let toastId = 0;
let listeners = [];

export function dismissAll() {
  listeners.forEach((fn) => fn({ dismissAll: true }));
}

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
      if (item.dismissAll) { setItems([]); return; }
      setItems((prev) => [...prev, item]);
      const ms = item.type === "error" ? 5000 : 2500;
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, ms);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter((l) => l !== handler); };
  }, []);

  return (
    <>
      {items.filter((t) => t.type === "error").length > 0 && (
        <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 max-w-sm">
          {items.filter((t) => t.type === "error").map((item) => (
            <div key={item.id} className="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-[var(--danger)] text-white gmp-toast-enter">{item.message}</div>
          ))}
        </div>
      )}
      {items.filter((t) => t.type !== "error").length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {items.filter((t) => t.type !== "error").map((item) => (
            <div key={item.id} className="pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium gmp-toast-enter bg-green-600 text-white">{item.message}</div>
          ))}
        </div>
      )}
    </>
  );
}
