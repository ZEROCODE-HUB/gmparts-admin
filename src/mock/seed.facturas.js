const facturas = [];

export const cotizacionesVASeed = [
  { id: "cot1", serie: "C001", numero: "000001", fecha: "2024-07-01", cliente: "Jose Quiñonez", clienteDoc: "12345678", tipoDoc: "DNI", subtotal: 150.00, igv: 27.00, total: 177.00, estado: "Pendiente", items: [{art: "Filtro de Aceite 150A", cant: 3, pu: 32.50, total: 97.50}, {art: "Bujía NGK Iridium", cant: 2, pu: 26.25, total: 52.50}] },
  { id: "cot2", serie: "C001", numero: "000002", fecha: "2024-07-05", cliente: "Luis Ramirez", clienteDoc: "98765432", tipoDoc: "DNI", subtotal: 285.00, igv: 51.30, total: 336.30, estado: "Aprobado", items: [{art: "Amortiguador Trasero", cant: 1, pu: 168.00, total: 168.00}, {art: "Pastillas de Freno", cant: 1, pu: 114.75, total: 114.75}] },
];

export const facturasVASeed = [
  { id: "fac1", serie: "F001", numero: "000001", fecha: "2024-07-10", cliente: "Gear Motor Parts SAC", clienteDoc: "20601720621", tipoDoc: "RUC", subtotal: 400.00, igv: 72.00, total: 472.00, estado: "Emitida", items: [{art: "Filtro de Aceite 150A", cant: 10, pu: 32.50, total: 325.00}, {art: "Aceite Motor 20W50 1L", cant: 5, pu: 20.53, total: 102.65}] },
];

export const boletasVASeed = [
  { id: "bol1", serie: "B001", numero: "000001", fecha: "2024-07-12", cliente: "Pedro Lopez", clienteDoc: "34344343", tipoDoc: "DNI", subtotal: 85.00, igv: 15.30, total: 100.30, estado: "Emitida", items: [{art: "Bujía NGK Iridium", cant: 2, pu: 26.25, total: 52.50}, {art: "Aceite Motor 20W50 1L", cant: 2, pu: 20.53, total: 41.06}] },
];

export const guiasVASeed = [
  { id: "gui1", serie: "G001", numero: "000001", fecha: "2024-07-10", cliente: "Gear Motor Parts SAC", clienteDoc: "20601720621", tipoDoc: "RUC", direccion: "Av. Industrial 500, Ate", total: 472.00, estado: "Emitida", items: [{art: "Filtro de Aceite 150A", cant: 10}, {art: "Aceite Motor 20W50 1L", cant: 5}] },
];

export const notasCreditoSeed = [
  { id: "nc1", serie: "NC01", numero: "000001", fecha: "2024-07-15", cliente: "Pedro Lopez", clienteDoc: "34344343", tipoDoc: "DNI", motivo: "Devolución", subtotal: -30.00, igv: -5.40, total: -35.40, estado: "Emitida", refBoleta: "B001-000001", items: [{art: "Aceite Motor 20W50 1L", cant: -1, pu: 20.53, total: -20.53}] },
];

export default facturas;
