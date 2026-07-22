import { useState } from "react";
import Modal from "../../components/ui/Modal";
import Btn from "../../components/ui/Btn";
import Field, { inputCls } from "../../components/ui/Field";

export default function InlineCreateDialogs({ type, onClose, onCreated }) {
  const [value, setValue] = useState("");

  const labels = { marca: "Nueva marca", grupo: "Nuevo grupo", subgrupo: "Nuevo subgrupo", unidad: "Nueva unidad de medida" };
  const placeholders = { marca: "Nombre de la marca", grupo: "Nombre del grupo", subgrupo: "Nombre del subgrupo", unidad: "Nombre de la unidad" };

  const handleCreate = async () => {
    const v = value.trim();
    if (!v) return;
    await onCreated(v);
    onClose();
  };

  return (
    <Modal title={labels[type] || "Crear"} onClose={onClose}>
      <Field label={labels[type] || "Nombre"}>
        <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholders[type] || "Escribe aquí"} autoFocus />
      </Field>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--line-soft)]">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={handleCreate}>Crear</Btn>
      </div>
    </Modal>
  );
}
