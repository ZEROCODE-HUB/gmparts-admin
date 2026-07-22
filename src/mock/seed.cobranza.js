const cobranza = [];

export const cuentasCobrarSeed = [
  { id: "cc1", tipoDocumento: "Factura", numeroCotizacion: "F001-000001", clientenombre: "Gear Motor Parts SAC", montoTotal: 472.00, pagoTotalActual: 0, saldoPendiente: 472.00, estado: "Pendiente", fecha: "2024-07-10", fecha_creacion: "2024-07-10T10:00:00Z", tipoCuenta: "Cobrar", pagos: [] },
  { id: "cc2", tipoDocumento: "Boleta", numeroCotizacion: "B001-000001", clientenombre: "Pedro Lopez", montoTotal: 100.30, pagoTotalActual: 50.00, saldoPendiente: 50.30, estado: "Pendiente", fecha: "2024-07-12", fecha_creacion: "2024-07-12T10:00:00Z", tipoCuenta: "Cobrar", pagos: [{ fecha: "2024-07-20", montopagado: 50.00, montopendiente: 50.30, metodopago: "Efectivo", estado: "aprobado" }] },
  { id: "cc3", tipoDocumento: "Factura", numeroCotizacion: "FC01-000001", clientenombre: "Repuestos Japoneses", montoTotal: 1250.00, pagoTotalActual: 0, saldoPendiente: 1250.00, estado: "Pendiente", fecha: "2024-07-10", fecha_creacion: "2024-07-10T10:00:00Z", tipoCuenta: "Pagar", pagos: [] },
  { id: "cc4", tipoDocumento: "Factura", numeroCotizacion: "FC01-000002", clientenombre: "Carlos Rojas", montoTotal: 1085.60, pagoTotalActual: 1085.60, saldoPendiente: 0, estado: "Pagado", fecha: "2024-07-15", fecha_creacion: "2024-07-15T10:00:00Z", tipoCuenta: "Pagar", pagos: [{ fecha: "2024-07-18", montopagado: 1085.60, montopendiente: 0, metodopago: "Deposito/Transfer.", estado: "aprobado" }] },
];

export default cobranza;
