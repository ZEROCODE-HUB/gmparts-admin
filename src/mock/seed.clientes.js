const clientes = [
  { id: "c1", codigo: "C-0001", nombre: "Jose Quiñonez", tipoPersona: "Natural", tipoDocumento: "DNI", documento: "12345678", email: "josequi@gmail.com", telefono: "123456789", wsp: "123456789", direccion: "Av. Nicolás Ayllón 12345", distrito: "Ate", provincia: "Lima", departamento: "Lima", encargado: "", userRole: "Cliente", fechaCreacion: "2024-01-15" },
  { id: "c2", codigo: "C-0002", nombre: "Luis Ramirez", tipoPersona: "Natural", tipoDocumento: "DNI", documento: "98765432", email: "luisramirez@gmail.com", telefono: "987654321", wsp: "", direccion: "Sin dirección", distrito: "—", provincia: "Lima", departamento: "Lima", encargado: "", userRole: "Cliente", fechaCreacion: "2024-02-20" },
  { id: "c3", codigo: "C-0003", nombre: "Pedro Lopez", tipoPersona: "Natural", tipoDocumento: "DNI", documento: "34344343", email: "pedro@gmail.com", telefono: "778787878", wsp: "778787878", direccion: "Calle 2", distrito: "Independencia", provincia: "Lima", departamento: "Lima", encargado: "", userRole: "Cliente", fechaCreacion: "2024-03-10" },
  { id: "c4", codigo: "C-0004", nombre: "Gear Motor Parts SAC", tipoPersona: "Jurídica", tipoDocumento: "RUC", documento: "20601720621", email: "gear@gmail.com", telefono: "999888777", wsp: "", direccion: "Av. Industrial 500", distrito: "Ate", provincia: "Lima", departamento: "Lima", encargado: "Jose Quiñonez", userRole: "Cliente", fechaCreacion: "2024-01-10" },
  { id: "c5", codigo: "C-0005", nombre: "Autovip SAC", tipoPersona: "Jurídica", tipoDocumento: "RUC", documento: "20601526398", email: "autovip@gmail.com", telefono: "999111222", wsp: "", direccion: "Av. Javier Prado 2500", distrito: "San Isidro", provincia: "Lima", departamento: "Lima", encargado: "", userRole: "Cliente", fechaCreacion: "2024-04-05" },
  { id: "c6", codigo: "C-0006", nombre: "Cliente Natural", tipoPersona: "Natural", tipoDocumento: "DNI", documento: "123646897", email: "cliente029021919@gmail.com", telefono: "999333444", wsp: "", direccion: "Sin dirección", distrito: "—", provincia: "Lima", departamento: "Lima", encargado: "", userRole: "Cliente", fechaCreacion: "2024-05-12" },
];

export const encargadosSeed = [
  { id: "e1", nombre: "Carlos Torres" },
  { id: "e2", nombre: "Maria Luna" },
];

export const departamentosSeed = ["Amazonas", "Ancash", "Apurimac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco", "Huancavelica", "Huanuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"];

export const provinciasLima = ["Barranca", "Cajatambo", "Cañete", "Canta", "Huaral", "Huarochiri", "Huaura", "Lima", "Oyon", "Yauyos"];

export const distritosLima = ["Ancon", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas", "El agustino", "Independencia", "Jesus maria", "La molina", "La victoria", "Lima", "Lince", "Los olivos", "Lurigancho", "Lurin", "Magdalena del mar", "Miraflores", "Pachacamac", "Pucusana", "Puente piedra", "Punta hermosa", "Punta negra", "Rimac", "San bartolo", "San borja", "San isidro", "San juan de lurigancho", "San juan de miraflores", "San luis", "San martin de porres", "San miguel", "Santa anita", "Santa maria del mar", "Santa rosa", "Santiago de surco", "Surquillo", "Villa el salvador", "Villa maria del triunfo"];

export const documentosSeed = ["DNI", "RUC", "CE"];

export default clientes;
