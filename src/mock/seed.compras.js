const compras = [];

export const facturasCompraSeed = [
  { id: "cf1", serie: "FC01", numero: "000001", fecha: "2024-07-10", proveedor: "Repuestos Japoneses", proveedorDoc: "123456", tipoDoc: "RUC", moneda: "PEN", formaPago: "Contado", tipoIgv: "INCLUIDO IGV", almacen: "Almacén Principal", usuario: "GM Parts Admin", actualizarStock: true, subtotal: 1250.00, igv: 0, total: 1250.00, estado: "Creado", items: [{ codigo: "ART-001", descripcion: "Filtro de Aceite 150A", cant: 10, pu: 25.00, total: 250.00 }, { codigo: "ART-002", descripcion: "Pastillas de Freno Delanteras", cant: 5, pu: 85.00, total: 425.00 }, { codigo: "ART-005", descripcion: "Aceite Motor 20W50 1L", cant: 50, pu: 12.00, total: 600.00 }] },
  { id: "cf2", serie: "FC01", numero: "000002", fecha: "2024-07-15", proveedor: "Carlos Rojas", proveedorDoc: "978789789", tipoDoc: "RUC", moneda: "PEN", formaPago: "Crédito", tipoIgv: "MAS IGV", almacen: "Almacén Secundario", usuario: "GM Parts Admin", actualizarStock: true, subtotal: 920.00, igv: 165.60, total: 1085.60, estado: "Creado", items: [{ codigo: "ART-003", descripcion: "Amortiguador Trasero", cant: 4, pu: 120.00, total: 480.00 }, { codigo: "ART-004", descripcion: "Bujía NGK Iridium", cant: 20, pu: 15.00, total: 300.00 }] },
];

export const boletasCompraSeed = [
  { id: "cb1", serie: "BC01", numero: "000001", fecha: "2024-07-12", proveedor: "Repuestos Japoneses", proveedorDoc: "123456", tipoDoc: "RUC", moneda: "PEN", formaPago: "Contado", tipoIgv: "INCLUIDO IGV", almacen: "Depósito Taller", usuario: "GM Parts Admin", actualizarStock: true, subtotal: 340.00, igv: 0, total: 340.00, estado: "Creado", items: [{ codigo: "ART-004", descripcion: "Bujía NGK Iridium", cant: 20, pu: 15.00, total: 300.00 }] },
];

export const notasPedidoSeed = [
  { id: "np1", serie: "NP01", numero: "000001", fecha: "2024-07-08", proveedor: "Empresa Electrónica y Lupe", proveedorDoc: "111111111", tipoDoc: "RUC", moneda: "PEN", formaPago: "Contado", tipoIgv: "INCLUIDO IGV", almacen: "Almacén Principal", usuario: "GM Parts Admin", actualizarStock: false, subtotal: 1500.00, igv: 0, total: 1500.00, estado: "Pendiente", items: [{ codigo: "ART-003", descripcion: "Amortiguador Trasero", cant: 8, pu: 120.00, total: 960.00 }, { codigo: "ART-002", descripcion: "Pastillas de Freno Delanteras", cant: 6, pu: 85.00, total: 510.00 }] },
  { id: "np2", serie: "NP01", numero: "000002", fecha: "2024-07-20", proveedor: "Carlos Rojas", proveedorDoc: "978789789", tipoDoc: "RUC", moneda: "PEN", formaPago: "Crédito", tipoIgv: "MAS IGV", almacen: "Almacén Secundario", usuario: "GM Parts Admin", actualizarStock: true, subtotal: 600.00, igv: 108.00, total: 708.00, estado: "Aprobado", items: [{ codigo: "ART-005", descripcion: "Aceite Motor 20W50 1L", cant: 50, pu: 12.00, total: 600.00 }] },
];

export const guiasCompraSeed = [
  { id: "gc1", serie: "GC01", numero: "000001", fecha: "2024-07-11", proveedor: "Repuestos Japoneses", proveedorDoc: "123456", tipoDoc: "RUC", moneda: "PEN", almacen: "Almacén Principal", docRelacion: "FC01-000001", total: 1250.00, estado: "Emitida", items: [{ codigo: "ART-001", descripcion: "Filtro de Aceite 150A", cant: 10 }, { codigo: "ART-002", descripcion: "Pastillas de Freno Delanteras", cant: 5 }] },
];

export const ordenesPagoSeed = [
  { id: "op1", serie: "OP01", numero: "000001", fecha: "2024-07-15", proveedor: "Repuestos Japoneses", proveedorDoc: "123456", moneda: "PEN", total: 1250.00, estado: "Pendiente", docRelacion: "FC01-000001" },
  { id: "op2", serie: "OP01", numero: "000002", fecha: "2024-07-18", proveedor: "Carlos Rojas", proveedorDoc: "978789789", moneda: "PEN", total: 1085.60, estado: "Pagado", docRelacion: "FC01-000002" },
];

export default compras;
