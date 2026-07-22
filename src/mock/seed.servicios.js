const servicios = [
  { id: "s1", Codigo: "SVC-001", Descripcion: "Cambio de Aceite y Filtro", Precio: 85.00, Currency: "PEN", Note: "Incluye 1L de aceite", Alert_in_days: "30", marcabrand: "", model: "", year: "", Sistema: "Motor", Tipo_de_servicio: "Mantenimiento", Categoria_MTC: "A", Tipo_de_vehiculo: "Automóvil" },
  { id: "s2", Codigo: "SVC-002", Descripcion: "Alineamiento y Balanceo", Precio: 120.00, Currency: "PEN", Note: "4 ruedas", Alert_in_days: "90", marcabrand: "", model: "", year: "", Sistema: "Dirección", Tipo_de_servicio: "Mantenimiento", Categoria_MTC: "B", Tipo_de_vehiculo: "Automóvil" },
  { id: "s3", Codigo: "SVC-003", Descripcion: "Revisión de Frenos", Precio: 60.00, Currency: "PEN", Note: "", Alert_in_days: "60", marcabrand: "", model: "", year: "", Sistema: "Frenos", Tipo_de_servicio: "Diagnóstico", Categoria_MTC: "A", Tipo_de_vehiculo: "Automóvil" },
  { id: "s4", Codigo: "SVC-004", Descripcion: "Cambio de Pastillas de Freno", Precio: 180.00, Currency: "PEN", Note: "Mano de obra + pastillas", Alert_in_days: "180", marcabrand: "", model: "", year: "", Sistema: "Frenos", Tipo_de_servicio: "Reparación", Categoria_MTC: "B", Tipo_de_vehiculo: "Automóvil" },
  { id: "s5", Codigo: "SVC-005", Descripcion: "Escaneo Electrónico", Precio: 50.00, Currency: "PEN", Note: "", Alert_in_days: "", marcabrand: "", model: "", year: "", Sistema: "Eléctrico", Tipo_de_servicio: "Diagnóstico", Categoria_MTC: "A", Tipo_de_vehiculo: "Automóvil" },
  { id: "s6", Codigo: "SVC-006", Descripcion: "Cambio de Batería", Precio: 250.00, Currency: "PEN", Note: "Incluye batería + instalación", Alert_in_days: "365", marcabrand: "", model: "", year: "", Sistema: "Eléctrico", Tipo_de_servicio: "Reparación", Categoria_MTC: "B", Tipo_de_vehiculo: "Automóvil" },
];

export const sistemasSeed = ["Motor", "Frenos", "Suspensión", "Dirección", "Eléctrico", "Transmisión", "Refrigeración", "Escape"];
export const tipoServicioSeed = ["Mantenimiento", "Reparación", "Diagnóstico", "Instalación"];
export const categoriaMTCSeed = ["A", "B", "C", "D"];
export const tipoVehiculoSeed = ["Automóvil", "Camioneta", "SUV", "Camión", "Moto", "Otro"];

export default servicios;
