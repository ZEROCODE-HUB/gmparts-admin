// Roles del sistema — única fuente de verdad.
//
// Antes había CUATRO listas desalineadas: el desplegable del alta en auth.js, ROLES_VALIDOS
// en las Cloud Functions, canViewAdministracion, y la redirección del móvil. La consecuencia
// no era teórica: ROLES_VALIDOS decía «Asesor» a secas mientras el desplegable da de alta
// «Asesor Servicio», así que la sincronización de roles a custom claims descartaba en
// silencio a todos los asesores y se quedaban sin permisos.
//
// Los nombres salen del Excel de flujo del cliente y de los valores que ya existen en
// Firestore. Cambiar una cadena de aquí obliga a migrar los documentos de `users`.
export const ROLES = {
  ADMINISTRADOR: "Administrador",
  GERENTE: "Gerente General",
  JEFE_TALLER: "Jefe de Taller",
  ASESOR_SERVICIO: "Asesor Servicio",
  ASESOR_REPUESTO: "Asesor Repuesto",
  TECNICO: "Tecnico Mecanico",
  CLIENTE: "Cliente",
};

// Roles de personal interno: los que aparecen en el desplegable de alta y en el filtro del
// listado. `Cliente` queda fuera a propósito — se da de alta desde su propia pantalla.
export const EMPLOYEE_ROLES = [
  ROLES.ASESOR_SERVICIO,
  ROLES.ASESOR_REPUESTO,
  ROLES.JEFE_TALLER,
  ROLES.ADMINISTRADOR,
  ROLES.GERENTE,
  ROLES.TECNICO,
];

// Todos los valores admitidos, incluido Cliente. Es lo que valida la sincronización de
// claims: un rol que no esté aquí no se copia al token y el usuario se queda sin permisos.
export const ROLES_VALIDOS = [...EMPLOYEE_ROLES, ROLES.CLIENTE];

// Quien manda: puede borrar, anular comprobantes y gestionar usuarios.
export const ROLES_ADMIN = [ROLES.ADMINISTRADOR, ROLES.GERENTE];

export function esAdmin(rol) {
  return ROLES_ADMIN.includes(rol);
}

// Quién puede entrar al PANEL. No es lo mismo que ser personal del taller.
//
// Un Cliente tiene su propio micrositio y no pinta nada aquí: hoy hay 11 cuentas de cliente
// que podían entrar y ver casi todo.
//
// El Técnico Mecánico queda fuera por decisión de producto: su herramienta es la app móvil,
// donde tiene «Mis órdenes» y puede reportar su avance. En el panel solo PODÍA MIRAR —cerrar
// una falla exige escribir `Tiempo_finalizado` y `Comentarios_finalizado`, y el panel no los
// escribe—, así que tener las dos puertas abiertas solo servía para que las dos versiones de
// «mis órdenes» se desincronizaran. Sigue siendo personal a todos los demás efectos: aparece
// en el desplegable de asignación, conserva su rol y las reglas de Firestore le siguen
// dejando trabajar, porque de eso vive la app móvil.
export const ROLES_PANEL = EMPLOYEE_ROLES.filter((r) => r !== ROLES.TECNICO);

export function puedeEntrarAlPanel(rol) {
  return ROLES_PANEL.includes(rol);
}

// ── Permisos por módulo ───────────────────────────────────────────────────────
//
// Las claves son las mismas que usa el menú lateral (`NAV` en Sidebar.jsx) y las rutas de
// App.jsx. El reparto sale del Excel de flujo: el asesor lleva la relación con el cliente y
// la venta; el jefe de taller, la ejecución; el técnico solo su trabajo; administración, todo.
//
// Regla de lectura: si un módulo no aparece aquí, solo lo ven los administradores.
const TODOS_MENOS_TECNICO = [
  ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.JEFE_TALLER,
  ROLES.ASESOR_SERVICIO, ROLES.ASESOR_REPUESTO,
];

export const PERMISOS_MODULO = {
  // Todo el personal necesita el panel de inicio.
  dashboard: EMPLOYEE_ROLES,

  // Alta de clientes y proveedores: la hace quien atiende. Personal, solo administración
  // (se controla aparte, ver PERMISOS_RUTA).
  administracion: [ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.JEFE_TALLER, ROLES.ASESOR_SERVICIO],

  // Venta de artículos de mostrador: los asesores, no el taller.
  //
  // El jefe de taller estaba dentro y le aparecían las cinco pantallas de emisión —factura,
  // boleta, guía, nota de crédito— que el servidor le niega: leer `FacturasVentasCompras`
  // le devuelve 403. Eran cinco puertas pintadas en la pared.
  ventasArticulos: [
    ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.ASESOR_SERVICIO, ROLES.ASESOR_REPUESTO,
  ],

  // Servicios del taller: es el flujo del Excel. El técnico entra para ver sus órdenes.
  ventasServicio: EMPLOYEE_ROLES,

  // Compras y almacén: repuestos y administración.
  compras: [ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.ASESOR_REPUESTO],
  // Almacén lo MANTIENE quien lleva repuestos. El jefe de taller lo consulta y pide, pero
  // no da de alta artículos ni registra movimientos: el servidor le niega escribir en
  // `Articles`, `Almacen_movement` y `Almacen`. Sus dos pantallas van en PERMISOS_RUTA.
  almacen: [ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.ASESOR_REPUESTO],

  // Cobranza: administración y los asesores.
  //
  // El panel la reservaba a administración mientras las reglas de Firestore ya se la
  // permitían al asesor, y el resultado era un flujo roto por la mitad: el asesor emite un
  // comprobante a crédito —lo que crea la cuenta por cobrar— y después no podía registrar el
  // cobro. Quien vende, cobra. Lo que sigue siendo solo de administración es reescribir un
  // pago ya registrado o borrar una cuenta, que es donde de verdad importa el control.
  cobranza: [...ROLES_ADMIN, ROLES.ASESOR_SERVICIO, ROLES.ASESOR_REPUESTO],

  // Los informes de ventas sí se quedan en administración.
  reportes: ROLES_ADMIN,
};

export function puedeVerModulo(rol, modulo) {
  const permitidos = PERMISOS_MODULO[modulo];
  if (!permitidos) return esAdmin(rol);
  return permitidos.includes(rol);
}

// Rutas que necesitan una restricción más fina que su módulo.
//
// El prefijo `vs-` agrupa dos cosas distintas: el flujo del taller (la orden de trabajo) y
// la facturación de ese servicio. El técnico tiene que entrar a sus órdenes pero no a emitir
// comprobantes, así que las rutas comerciales se listan aquí una por una.
const COMERCIAL = [ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.ASESOR_SERVICIO, ROLES.ASESOR_REPUESTO];

export const PERMISOS_RUTA = {
  "/personal": ROLES_ADMIN,   // gestionar personal es asignar roles: solo administración

  // Facturación de servicios: del asesor, no del taller.
  "/vs-factura": COMERCIAL,
  "/vs-boleta": COMERCIAL,
  "/vs-notas": COMERCIAL,
  // La cotización la prepara el asesor, pero el jefe de taller la revisa.
  "/vs-cotizacion": [...COMERCIAL, ROLES.JEFE_TALLER],

  // El maestro de vehículos NO es almacén, aunque su ruta empiece por `/al-`.
  //
  // Estaba cayendo en el módulo de almacén por el prefijo, y eso dejaba al asesor de
  // servicio —que es quien recibe el coche— sin poder dar de alta un vehículo. El flujo se
  // rompía entero: daba de alta al cliente, y al abrir la orden de trabajo el desplegable
  // de placas salía vacío porque ese cliente no tenía ningún vehículo registrado. Las
  // reglas de Firestore ya se lo permitían a todo el personal; era solo esta matriz.
  "/al-vehiculos": TODOS_MENOS_TECNICO,

  // Los clientes, de quien atiende y factura.
  //
  // Mismo caso que `/proveedores`: `/clientes` caia en el modulo de administracion, del que
  // el asesor de REPUESTOS esta fuera, aunque es uno de los que emite boletas y facturas a
  // clientes. Con un cliente de mostrador sin registrar se quedaba parado, sin poder darlo
  // de alta ni verlo. Y el servidor ya se lo permite: los clientes viven en `users` con
  // `user_role == "Cliente"`, y ahi las reglas dicen `allow read, create: if esPersonal()`.
  "/clientes": TODOS_MENOS_TECNICO,

  // Los proveedores son de quien compra.
  //
  // `/proveedores` caía en el módulo de administración, del que el asesor de REPUESTOS está
  // fuera — y es el único rol que registra compras. Podía elegir de la lista existente pero
  // no dar de alta un proveedor nuevo, así que el día que apareciera uno se quedaba parado.
  // El servidor ya se lo permitía: crear en `Proveedores` le devuelve 200.
  "/proveedores": TODOS_MENOS_TECNICO,

  // Lo que el jefe de taller sí necesita de almacén, y puede de verdad:
  //   · el kárdex, que es solo consulta —no tiene ningún botón de escritura—, y
  //   · el vale de insumos, que es SU documento: la regla de `ValeInsumos` lo permite a
  //     todo el personal, porque es como el taller pide repuestos.
  "/al-kardex": [...ROLES_ADMIN, ROLES.ASESOR_REPUESTO, ROLES.JEFE_TALLER],
  "/al-vale-insumos": [...ROLES_ADMIN, ROLES.ASESOR_REPUESTO, ROLES.JEFE_TALLER],
};

// A qué módulo pertenece una ruta.
//
// Las rutas del panel ya llevan el módulo en el prefijo (`/al-articulos`, `/vs-factura`…),
// así que se deduce en lugar de anotar las ~60 rutas de App.jsx una por una — que además es
// donde se olvidaría al añadir la siguiente.
const PREFIJO_MODULO = [
  ["/al-", "almacen"],
  ["/c-", "compras"],
  ["/va-", "ventasArticulos"],
  ["/vs-", "ventasServicio"],
  ["/cb-", "cobranza"],
  ["/rp-", "reportes"],
];

const RUTA_MODULO = {
  "/dashboard": "dashboard",
  "/clientes": "administracion",
  "/proveedores": "administracion",
  "/personal": "administracion",
  // Cualquiera puede cambiar su propia contraseña.
  "/cambiar-contrasena": "dashboard",
};

export function moduloDeRuta(ruta) {
  const limpia = String(ruta || "").toLowerCase();
  if (RUTA_MODULO[limpia]) return RUTA_MODULO[limpia];
  const encontrado = PREFIJO_MODULO.find(([p]) => limpia.startsWith(p));
  return encontrado ? encontrado[1] : null;
}

export function puedeVerRuta(rol, ruta) {
  const base = "/" + String(ruta || "").split("/").filter(Boolean)[0];
  const especifico = PERMISOS_RUTA[base];
  if (especifico) return especifico.includes(rol);

  const modulo = moduloDeRuta(base);
  // Una ruta que no encaja en ningún módulo se trata como restringida, no como abierta:
  // así, al añadir una pantalla nueva, el fallo es «no la veo» y no «la ve todo el mundo».
  if (!modulo) return esAdmin(rol);
  return puedeVerModulo(rol, modulo);
}
