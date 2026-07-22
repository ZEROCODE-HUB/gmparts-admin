// Recepciones / Órdenes de Trabajo (espejo de la colección `recepciones` de Flutter).
// Campos clave de recepciones_record.dart: numeroorden, placa, marca, modelo, km_ingreso,
// tecnico_servicio, tipoServicio, motivo_ingreso, estado (Recepción/Diagnóstico/Reparación/
// Finalizado), facturado, diagnosticos[].
const recepciones = [
  {
    id: "ot1", numeroorden: 1, cliente: "Jose Quiñonez", clienteDoc: "12345678",
    placa: "ABC-123", marca: "Toyota", modelo: "Corolla", km_ingreso: 45000,
    tecnico: "Mecanico", tipoServicio: "Mantenimiento", motivo_ingreso: "Cambio de aceite y revisión general",
    observaciones: "", estado: "Reparación", fecha_creacion: "2024-07-15",
    facturado: false, stockConsumed: false,
    diagnosticos: [
      {
        id: "d1", nombreFalla: "Aceite viejo", solucion: "Cambio de aceite y filtro",
        horasTrabajo: 1, manoDeObra: 60, repuestos: [
          { descripcion: "Filtro de aceite", codigo: "FO-001", cantidad: 1 },
          { descripcion: "Aceite 4L 20W50", codigo: "AC-4L", cantidad: 1 },
        ],
      },
    ],
  },
];

export default recepciones;
