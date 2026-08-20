// Exporta un array de objetos a Excel (.xlsx)
//
// La librería (283 kB) se carga al pulsar «Exportar», no al abrir la aplicación: es una
// acción puntual y viajaba en el bundle inicial de todas las pantallas con listado.
export async function exportToExcel(data, filename = "export") {
  if (!data || data.length === 0) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}
