import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const base = "D:\\Zerocode\\PROYECTOS\\gmparts-admin-web\\src\\pages";

const files = [
  ["ventas\\articulos\\EmisionFacturaList.jsx", "Facturas"],
  ["ventas\\articulos\\EmisionBoletaList.jsx", "Boletas"],
  ["ventas\\articulos\\CotizacionesList.jsx", "Cotizaciones"],
  ["ventas\\articulos\\NotaCreditoList.jsx", "NotasCredito"],
  ["ventas\\articulos\\GuiaRemisionList.jsx", "Guias"],
  ["ventas\\servicios\\EmisionFacturaTallerList.jsx", "FacturasTaller"],
  ["ventas\\servicios\\EmisionBoletaTallerList.jsx", "BoletasTaller"],
  ["ventas\\servicios\\CotizacionServicioList.jsx", "CotizacionesServicio"],
  ["ventas\\servicios\\RegistroNotaVentasList.jsx", "NotasVenta"],
  ["ventas\\servicios\\OrdenTrabajoList.jsx", "OrdenesTrabajo"],
  ["compras\\FacturaList.jsx", "FacturasCompra"],
  ["compras\\BoletaList.jsx", "BoletasCompra"],
  ["compras\\GuiaCompraList.jsx", "GuiasCompra"],
  ["compras\\NotaPedidoList.jsx", "NotasPedido"],
  ["compras\\OrdenPagoList.jsx", "OrdenesPago"],
  ["almacen\\NotaVenta.jsx", "NotasVentaAlmacen"],
  ["almacen\\MovimientosList.jsx", "Movimientos"],
  ["almacen\\KardexList.jsx", "Kardex"],
  ["almacen\\ArticulosWarehouseList.jsx", "ArticulosWarehouse"],
  ["almacen\\AlmacenesList.jsx", "Almacenes"],
  ["almacen\\ServiciosList.jsx", "Servicios"],
  ["almacen\\VehiculosList.jsx", "Vehiculos"],
  ["administracion\\ClientesList.jsx", "Clientes"],
  ["administracion\\ProveedoresList.jsx", "Proveedores"],
  ["administracion\\PersonalList.jsx", "Personal"],
  ["cobranza\\CuentasCobrar.jsx", "CuentasCobrar"],
];

for (const [f, name] of files) {
  const path = join(base, f);
  let content = readFileSync(path, "utf-8");
  const isVentas = f.startsWith("ventas\\");
  const pre = isVentas ? "../../../" : "../../";

  // 1. Add imports at the very top (before first import or at file start)
  const pagLine = `import Pagination from "${pre}components/ui/Pagination";`;
  const xlsLine = `import { exportToExcel } from "${pre}lib/exportExcel";`;

  if (!content.includes(pagLine)) {
    // Remove any existing stale Pagination/exportToExcel lines
    content = content.replace(/^import Pagination from .+;\n?/gm, "");
    content = content.replace(/^import \{ exportToExcel \} from .+;\n?/gm, "");
    // Insert at top after the very first line (import { useState ...) or at file start
    const firstNewline = content.indexOf("\n");
    if (firstNewline > 0) {
      content = content.slice(0, firstNewline + 1) + pagLine + "\n" + xlsLine + content.slice(firstNewline + 1);
    } else {
      content = pagLine + "\n" + xlsLine + "\n" + content;
    }
  }

  // 2. Add useState if missing
  if (!content.includes("useState") && !content.includes("useState(")) {
    content = content.replace(/^(import .+ from "react";)/, "$1\nimport { useState } from \"react\";");
  }

  // 3. Replace onExport
  content = content.replace(/onExport=\{\(\) => \{\}\}/g, `onExport={() => exportToExcel(rows, "${name}")}`);

  // 4. Add pagination after const rows = ...
  if (!content.includes("const [page, setPage]")) {
    content = content.replace(
      /(const rows = .+?;\n)/,
      "$1  const [page, setPage] = useState(0);\n  const totalPages = Math.ceil(rows.length / 20);\n  const pageRows = rows.slice(page * 20, (page + 1) * 20);\n"
    );
  }

  // 5. Replace rows={rows} with rows={pageRows}
  content = content.replace(/rows=\{rows\}/g, "rows={pageRows}");

  // 6. Add Pagination before </div>\n  );
  if (!content.includes("<Pagination")) {
    content = content.replace(/(\s*<\/div>\s*\n\s*\);)/, "\n      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />$1");
  }

  writeFileSync(path, content, "utf-8");
  console.log("OK:", f);
}
