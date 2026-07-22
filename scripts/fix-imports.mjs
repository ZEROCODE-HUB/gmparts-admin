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

  const isVentas = f.startsWith("ventas\\");
  const pagImp = isVentas
    ? 'import Pagination from "../../../components/ui/Pagination";\n'
    : 'import Pagination from "../../components/ui/Pagination";\n';
  const xlsImp = isVentas
    ? 'import { exportToExcel } from "../../../lib/exportExcel";\n'
    : 'import { exportToExcel } from "../../lib/exportExcel";\n';

  // Remove ALL existing Pagination and exportToExcel imports  
  content = content.replace(/^import Pagination from "[^"]+";\s*\n?/gm, "");
  content = content.replace(/^import \{ exportToExcel \} from "[^"]+";\s*\n?/gm, "");
  
  // Remove empty lines at the top
  content = content.replace(/^(?:\s*\n)+/, "");

  // Add imports at the very beginning
  content = pagImp + xlsImp + content;

  writeFileSync(path, content, "utf-8");
  console.log("OK:", f);
}
