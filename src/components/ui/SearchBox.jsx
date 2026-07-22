import { Search } from "lucide-react";
import { inputCls } from "./Field";

export default function SearchBox({ value, onChange, placeholder = "Buscar nombre, DNI, etc.." }) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}
