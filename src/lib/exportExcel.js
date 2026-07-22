// Exporta un array de objetos a Excel (.xlsx)
import * as XLSX from "xlsx";

export function exportToExcel(data, filename = "export") {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
