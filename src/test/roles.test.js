// Reparto de permisos por rol en el panel.
//
// Antes no existía ninguna autorización: el único control era «¿hay sesión?», así que las
// ~60 rutas se renderizaban igual para cualquiera y las 11 cuentas de cliente entraban al
// panel completo. Estas pruebas fijan quién llega a dónde.
import { describe, it, expect } from "vitest";
import {
  ROLES, EMPLOYEE_ROLES, ROLES_VALIDOS, esAdmin,
  puedeEntrarAlPanel, puedeVerModulo, puedeVerRuta, moduloDeRuta, ROLES_PANEL,
} from "../lib/roles";

describe("quién entra al panel", () => {
  it("el personal de oficina y taller, salvo el técnico", () => {
    for (const rol of ROLES_PANEL) expect(puedeEntrarAlPanel(rol), rol).toBe(true);
  });

  it("el técnico no: su herramienta es la app móvil", () => {
    // En el panel solo podía MIRAR — cerrar una falla exige escribir `Tiempo_finalizado` y
    // `Comentarios_finalizado`, y el panel no los escribe. Dos puertas para lo mismo solo
    // servían para que las dos versiones de «mis órdenes» se desincronizaran.
    expect(puedeEntrarAlPanel(ROLES.TECNICO)).toBe(false);
  });

  it("pero el técnico sigue siendo personal a todos los demás efectos", () => {
    // Su rol tiene que seguir siendo válido: aparece en el desplegable de asignación, se le
    // sincroniza el claim, y las reglas de Firestore le dejan trabajar desde el móvil.
    expect(EMPLOYEE_ROLES).toContain(ROLES.TECNICO);
  });

  it("el cliente no: tiene su propio micrositio", () => {
    expect(puedeEntrarAlPanel(ROLES.CLIENTE)).toBe(false);
  });

  it("y quien no tiene rol asignado, tampoco", () => {
    for (const v of ["", null, undefined, "Vendedor", "Admin"]) {
      expect(puedeEntrarAlPanel(v)).toBe(false);
    }
  });
});

describe("la lista de roles es una sola", () => {
  // El fallo original: ROLES_VALIDOS en las Cloud Functions decía «Asesor» mientras el alta
  // del panel crea «Asesor Servicio», así que la sincronización de claims los descartaba en
  // silencio y se quedaban sin permisos.
  it("todo rol de empleado es un rol válido", () => {
    for (const rol of EMPLOYEE_ROLES) expect(ROLES_VALIDOS).toContain(rol);
  });

  it("incluye a los dos tipos de asesor, no un «Asesor» genérico", () => {
    expect(ROLES_VALIDOS).toContain("Asesor Servicio");
    expect(ROLES_VALIDOS).toContain("Asesor Repuesto");
    expect(ROLES_VALIDOS).not.toContain("Asesor");
  });

  it("Cliente es válido pero no es empleado", () => {
    expect(ROLES_VALIDOS).toContain(ROLES.CLIENTE);
    expect(EMPLOYEE_ROLES).not.toContain(ROLES.CLIENTE);
  });
});

describe("el dinero es de administración", () => {
  // Los informes de ventas se quedan en administración.
  it("solo admin y gerente ven los reportes", () => {
    expect(puedeVerModulo(ROLES.ADMINISTRADOR, "reportes")).toBe(true);
    expect(puedeVerModulo(ROLES.GERENTE, "reportes")).toBe(true);
    expect(puedeVerModulo(ROLES.ASESOR_SERVICIO, "reportes")).toBe(false);
    expect(puedeVerModulo(ROLES.JEFE_TALLER, "reportes")).toBe(false);
    expect(puedeVerModulo(ROLES.TECNICO, "reportes")).toBe(false);
  });

  // Cobranza sí la ve el asesor: es quien emite el comprobante a crédito y, por tanto,
  // quien crea la cuenta por cobrar. El panel se la ocultaba mientras las reglas ya se la
  // permitían, así que el asesor generaba la deuda y no podía cerrarla.
  it("el asesor también cobra, porque es quien vende a crédito", () => {
    expect(puedeVerModulo(ROLES.ASESOR_SERVICIO, "cobranza")).toBe(true);
    expect(puedeVerModulo(ROLES.ASESOR_REPUESTO, "cobranza")).toBe(true);
    expect(puedeVerModulo(ROLES.ADMINISTRADOR, "cobranza")).toBe(true);
    expect(puedeVerModulo(ROLES.GERENTE, "cobranza")).toBe(true);
  });

  it("pero el taller no toca el dinero", () => {
    expect(puedeVerModulo(ROLES.JEFE_TALLER, "cobranza")).toBe(false);
    expect(puedeVerModulo(ROLES.TECNICO, "cobranza")).toBe(false);
    expect(puedeVerRuta(ROLES.TECNICO, "/cb-cobrar")).toBe(false);
  });

  it("gestionar personal es asignar roles: solo administración", () => {
    expect(puedeVerRuta(ROLES.ADMINISTRADOR, "/personal")).toBe(true);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/personal")).toBe(false);
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/personal")).toBe(false);
  });

  it("pero clientes y proveedores sí los lleva quien atiende", () => {
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/clientes")).toBe(true);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/proveedores")).toBe(true);
    expect(puedeVerRuta(ROLES.TECNICO, "/clientes")).toBe(false);
  });
});

describe("el técnico solo ve su trabajo", () => {
  it("entra a las órdenes de servicio", () => {
    expect(puedeVerRuta(ROLES.TECNICO, "/vs-orden")).toBe(true);
  });

  // El prefijo `vs-` mezcla el flujo del taller con su facturación: la orden es del técnico,
  // el comprobante no.
  it("pero no a la facturación de ese mismo servicio", () => {
    for (const ruta of ["/vs-factura", "/vs-boleta", "/vs-notas", "/vs-cotizacion"]) {
      expect(puedeVerRuta(ROLES.TECNICO, ruta)).toBe(false);
    }
  });

  it("no entra a facturación, compras ni almacén", () => {
    for (const ruta of ["/vs-factura", "/va-factura", "/c-factura", "/al-articulos", "/cb-cobrar"]) {
      expect(puedeVerRuta(ROLES.TECNICO, ruta)).toBe(false);
    }
  });
});

describe("de la ruta se deduce el módulo", () => {
  it("por el prefijo, sin tener que anotar las 60 rutas", () => {
    expect(moduloDeRuta("/al-kardex")).toBe("almacen");
    expect(moduloDeRuta("/vs-boleta")).toBe("ventasServicio");
    expect(moduloDeRuta("/va-guia")).toBe("ventasArticulos");
    expect(moduloDeRuta("/c-orden")).toBe("compras");
    expect(moduloDeRuta("/cb-pagar")).toBe("cobranza");
    expect(moduloDeRuta("/rp-ventas")).toBe("reportes");
  });

  it("las rutas con id o /nuevo heredan el permiso de su base", () => {
    expect(puedeVerRuta(ROLES.TECNICO, "/vs-orden/nuevo")).toBe(true);
    expect(puedeVerRuta(ROLES.TECNICO, "/vs-orden/abc123")).toBe(true);
    expect(puedeVerRuta(ROLES.TECNICO, "/cb-cobrar/abc123")).toBe(false);
  });

  it("una ruta desconocida se cierra, no se abre", () => {
    // Al añadir una pantalla nueva, el fallo debe ser «no la veo», nunca «la ve todo el mundo».
    expect(puedeVerRuta(ROLES.TECNICO, "/pantalla-que-no-existe")).toBe(false);
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/pantalla-que-no-existe")).toBe(false);
    expect(puedeVerRuta(ROLES.ADMINISTRADOR, "/pantalla-que-no-existe")).toBe(true);
  });

  it("cualquiera puede cambiar su propia contraseña", () => {
    for (const rol of EMPLOYEE_ROLES) {
      expect(puedeVerRuta(rol, "/cambiar-contrasena")).toBe(true);
    }
  });
});

describe("administración llega a todo", () => {
  it("ningún módulo se le cierra", () => {
    const modulos = ["dashboard", "administracion", "ventasArticulos", "ventasServicio",
      "compras", "almacen", "cobranza", "reportes"];
    for (const m of modulos) {
      expect(puedeVerModulo(ROLES.ADMINISTRADOR, m)).toBe(true);
      expect(puedeVerModulo(ROLES.GERENTE, m)).toBe(true);
    }
  });

  it("y es el único que cuenta como admin", () => {
    expect(esAdmin(ROLES.ADMINISTRADOR)).toBe(true);
    expect(esAdmin(ROLES.GERENTE)).toBe(true);
    expect(esAdmin(ROLES.JEFE_TALLER)).toBe(false);
    expect(esAdmin(ROLES.ASESOR_SERVICIO)).toBe(false);
  });
});

describe("el vehículo es del que atiende, no del almacén", () => {
  // La ruta empieza por «/al-» y por eso caía en el módulo de almacén. Consecuencia: el
  // asesor de servicio, que es quien recibe el coche, no podía registrarlo, y al abrir la
  // orden de trabajo el desplegable de placas salía vacío.
  it("el asesor de servicio da de alta vehículos", () => {
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/al-vehiculos")).toBe(true);
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/al-vehiculos/nuevo")).toBe(true);
  });

  it("y también el jefe de taller y el asesor de repuestos", () => {
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-vehiculos")).toBe(true);
    expect(puedeVerRuta(ROLES.ASESOR_REPUESTO, "/al-vehiculos")).toBe(true);
  });

  it("pero el resto de almacén sigue sin ser suyo", () => {
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/al-articulos")).toBe(false);
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/al-kardex")).toBe(false);
  });

  it("el técnico consulta su orden, no el maestro de vehículos", () => {
    expect(puedeVerRuta(ROLES.TECNICO, "/al-vehiculos")).toBe(false);
  });
});

describe("el jefe de taller consulta el almacén, no lo administra", () => {
  // Medido contra producción con su propia cuenta: puede LEER Articles, Almacen_movement y
  // Kardex_element, pero escribir en cualquiera de los tres le devuelve 403. El panel le
  // ofrecía el módulo entero, con sus botones de crear y editar, que iban a fallar.
  it("no mantiene el maestro de artículos ni los movimientos", () => {
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-articulos")).toBe(false);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-movimientos")).toBe(false);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-almacenes")).toBe(false);
  });

  it("pero sí consulta el kárdex y pide insumos", () => {
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-kardex")).toBe(true);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/al-vale-insumos")).toBe(true);
  });

  it("el asesor de repuestos sigue llevando el almacén entero", () => {
    for (const ruta of ["/al-articulos", "/al-movimientos", "/al-almacenes", "/al-kardex"]) {
      expect(puedeVerRuta(ROLES.ASESOR_REPUESTO, ruta)).toBe(true);
    }
  });

  it("y el técnico no entra al almacén por ninguna puerta", () => {
    for (const ruta of ["/al-articulos", "/al-kardex", "/al-vale-insumos"]) {
      expect(puedeVerRuta(ROLES.TECNICO, ruta)).toBe(false);
    }
  });
});

describe("vender artículos de mostrador no es del taller", () => {
  // Leer `FacturasVentasCompras` le devuelve 403 al jefe de taller, así que las cinco
  // pantallas de emisión que le salían en el menú eran puertas pintadas.
  it("el jefe de taller no emite comprobantes de artículos", () => {
    expect(puedeVerModulo(ROLES.JEFE_TALLER, "ventasArticulos")).toBe(false);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/va-factura")).toBe(false);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/va-notacredito")).toBe(false);
  });

  it("los asesores sí", () => {
    expect(puedeVerRuta(ROLES.ASESOR_REPUESTO, "/va-factura")).toBe(true);
    expect(puedeVerRuta(ROLES.ASESOR_SERVICIO, "/va-factura")).toBe(true);
  });

  it("el jefe de taller conserva lo suyo: órdenes y cotización de servicio", () => {
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/vs-orden")).toBe(true);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/vs-cotizacion")).toBe(true);
    expect(puedeVerRuta(ROLES.JEFE_TALLER, "/vs-factura")).toBe(false);
  });
});

describe("los proveedores son de quien compra", () => {
  // El asesor de repuestos es el único rol que registra compras y no podía dar de alta un
  // proveedor: la ruta caía en el módulo de administración. El servidor ya se lo permitía.
  it("el asesor de repuestos gestiona proveedores", () => {
    expect(puedeVerRuta(ROLES.ASESOR_REPUESTO, "/proveedores")).toBe(true);
  });

  it("y quien ya los tenía no los pierde", () => {
    for (const rol of [ROLES.ADMINISTRADOR, ROLES.GERENTE, ROLES.JEFE_TALLER, ROLES.ASESOR_SERVICIO]) {
      expect(puedeVerRuta(rol, "/proveedores")).toBe(true);
    }
  });

  it("el técnico no", () => {
    expect(puedeVerRuta(ROLES.TECNICO, "/proveedores")).toBe(false);
  });

  it("pero gestionar personal sigue siendo solo de administración", () => {
    expect(puedeVerRuta(ROLES.ASESOR_REPUESTO, "/personal")).toBe(false);
  });
});
