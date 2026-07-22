import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const base = "D:\\Zerocode\\PROYECTOS\\gmparts-admin-web\\src\\pages";

const files = [
  "ventas\\articulos\\EmisionFacturaList.jsx",
  "ventas\\articulos\\EmisionBoletaList.jsx",
  "ventas\\articulos\\CotizacionesList.jsx",
  "ventas\\articulos\\NotaCreditoList.jsx",
  "ventas\\articulos\\GuiaRemisionList.jsx",
  "ventas\\servicios\\EmisionFacturaTallerList.jsx",
  "ventas\\servicios\\EmisionBoletaTallerList.jsx",
  "ventas\\servicios\\CotizacionServicioList.jsx",
  "ventas\\servicios\\RegistroNotaVentasList.jsx",
  "ventas\\servicios\\OrdenTrabajoList.jsx",
  "compras\\FacturaList.jsx",
  "compras\\BoletaList.jsx",
  "compras\\GuiaCompraList.jsx",
  "compras\\NotaPedidoList.jsx",
  "compras\\OrdenPagoList.jsx",
  "almacen\\NotaVenta.jsx",
  "almacen\\MovimientosList.jsx",
  "almacen\\KardexList.jsx",
  "almacen\\ArticulosWarehouseList.jsx",
  "almacen\\AlmacenesList.jsx",
  "almacen\\ServiciosList.jsx",
  "almacen\\VehiculosList.jsx",
  "administracion\\ClientesList.jsx",
  "administracion\\ProveedoresList.jsx",
  "administracion\\PersonalList.jsx",
  "cobranza\\CuentasCobrar.jsx",
];

for (const f of files) {
  const path = join(base, f);
  let content = readFileSync(path, "utf-8");

  // Check if pagination variables are already defined
  if (content.includes("const [page, setPage]")) {
    console.log("SKIP (already has pagination):", f);
    continue;
  }

  // Find the closing ");" of the rows filter and add pagination after it
  // The pattern is: const rows = items.filter(...)\n  );
  // We insert after the "  );\n"
  content = content.replace(
    /(  \);\r?\n)/,
    "$1  const [page, setPage] = useState(0);\n  const totalPages = Math.ceil(rows.length / 20);\n  const pageRows = rows.slice(page * 20, (page + 1) * 20);\n"
  );

  writeFileSync(path, content, "utf-8");
  console.log("FIXED:", f);
}
