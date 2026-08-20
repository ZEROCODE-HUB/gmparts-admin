// Reglas de seguridad de Firestore, probadas contra el emulador.
//
// Hoy en producción rige `allow read, write: if true`: cualquiera que tenga el projectId
// —y viaja dentro del bundle del panel— puede leer y borrar toda la base. Sustituirlas es
// necesario, pero un error aquí deja sin servicio a la app móvil y al panel a la vez, así
// que las reglas se comprueban antes de desplegarlas.
//
// Estas pruebas NO corren en `npm run check`: necesitan el emulador de Firestore. Se
// lanzan con:
//   npm run test:reglas
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, setDoc, deleteDoc, collectionGroup, getDocs, query, collection, where,
} from "firebase/firestore";

let entorno;

// Los roles se resuelven leyendo users/{uid}.user_role, así que cada usuario de prueba
// necesita su documento.
const ADMIN = "uid-admin";
const ASESOR = "uid-asesor";
const TECNICO = "uid-tecnico";
const CLIENTE = "uid-cliente";

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: "reglas-gmparts",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(join(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => { if (entorno) await entorno.cleanup(); });

beforeEach(async () => {
  await entorno.clearFirestore();
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ADMIN), { user_role: "Administrador" });
    // «Asesor Servicio», no «Asesor»: era justo la desalineación que dejaba a los asesores
    // sin custom claim y, por tanto, sin permisos.
    await setDoc(doc(db, "users", ASESOR), { user_role: "Asesor Servicio" });
    await setDoc(doc(db, "users", TECNICO), { user_role: "Tecnico Mecanico" });
    await setDoc(doc(db, "users", CLIENTE), { user_role: "Cliente" });
    await setDoc(doc(db, "Facturas", "f1"), { total: 100, serie: "F001" });
    await setDoc(doc(db, "Articles", "a1"), { nombre: "Filtro de aceite", Stock: 40, Precio_Venta_Sale_price: 10 });
    await setDoc(doc(db, "Almacen_movement", "m1"), { Quantity: -1 });
    await setDoc(doc(db, "LastCode", "F001"), { numero: 7 });
    await setDoc(doc(db, "Repuestos", "r1"), { nombre: "Filtro" });
    await setDoc(doc(db, "recepciones", "rec1"), {
      placa: "ABC-123", nombre_cliente: "Jorge Zapata", DNI: "46530103",
      marca: "Toyota", modelo: "Corolla", codeCT: "CT001-0000001",
      numeroorden: 1, status: "Recepción",
    });
    await setDoc(doc(db, "recepciones", "rec1", "diagnosticos", "d1"), { falla: "Frenos" });
    await setDoc(doc(db, "cuentasPorCobrar", "c1"), { saldo: 50 });
    await setDoc(doc(db, "cuentasPorCobrar", "c1", "pagos_CporCobrar", "p1"), { monto: 20 });
  });
});

const sinLogin = () => entorno.unauthenticatedContext().firestore();
const como = (uid) => entorno.authenticatedContext(uid).firestore();
const anonimo = () =>
  entorno.authenticatedContext("uid-anon", { firebase: { sign_in_provider: "anonymous" } }).firestore();

describe("el agujero que se viene a cerrar", () => {
  it("sin sesión no se lee nada", async () => {
    await assertFails(getDoc(doc(sinLogin(), "Facturas", "f1")));
    await assertFails(getDoc(doc(sinLogin(), "users", ADMIN)));
    await assertFails(getDoc(doc(sinLogin(), "recepciones", "rec1")));
  });

  it("sin sesión no se borra nada", async () => {
    await assertFails(deleteDoc(doc(sinLogin(), "Facturas", "f1")));
    await assertFails(deleteDoc(doc(sinLogin(), "recepciones", "rec1")));
  });

  it("una sesión anónima tampoco vale", async () => {
    await assertFails(getDoc(doc(anonimo(), "Facturas", "f1")));
    await assertFails(setDoc(doc(anonimo(), "recepciones", "nueva"), { placa: "X" }));
  });
});

describe("el trabajo diario sigue funcionando", () => {
  it("un asesor lee y crea recepciones", async () => {
    const db = como(ASESOR);
    await assertSucceeds(getDoc(doc(db, "recepciones", "rec1")));
    await assertSucceeds(setDoc(doc(db, "recepciones", "rec2"), { placa: "XYZ-789" }));
  });

  it("un asesor da de alta clientes y proveedores", async () => {
    const db = como(ASESOR);
    await assertSucceeds(setDoc(doc(db, "users", "cliente-nuevo"), { nombre: "Juan" }));
    await assertSucceeds(setDoc(doc(db, "Proveedores", "prov1"), { nombre: "Repuestos SA" }));
  });

  it("un asesor emite comprobantes y toma correlativos", async () => {
    const db = como(ASESOR);
    await assertSucceeds(setDoc(doc(db, "Facturas", "f2"), { total: 200 }));
    await assertSucceeds(setDoc(doc(db, "LastCode", "F001"), { numero: 8 }, { merge: true }));
  });

  it("un asesor registra pagos, pero no los reescribe", async () => {
    const db = como(ASESOR);
    await assertSucceeds(setDoc(doc(db, "cuentasPorCobrar", "c1", "pagos_CporCobrar", "p2"), { monto: 30 }));
    await assertFails(deleteDoc(doc(db, "cuentasPorCobrar", "c1", "pagos_CporCobrar", "p1")));
  });
});

describe("borrar es cosa de administración", () => {
  it("un asesor no borra comprobantes ni recepciones", async () => {
    const db = como(ASESOR);
    await assertFails(deleteDoc(doc(db, "Facturas", "f1")));
    await assertFails(deleteDoc(doc(db, "recepciones", "rec1")));
  });

  it("un administrador sí", async () => {
    const db = como(ADMIN);
    await assertSucceeds(deleteDoc(doc(db, "Facturas", "f1")));
    await assertSucceeds(deleteDoc(doc(db, "recepciones", "rec1")));
  });

  it("los correlativos no los borra nadie, ni el administrador", async () => {
    await assertFails(deleteDoc(doc(como(ADMIN), "LastCode", "F001")));
  });
});

describe("consultas de grupo del móvil", () => {
  // Una collectionGroup no se autoriza con la regla anidada: necesita `/{path=**}/`.
  // Sin esa regla la pantalla de diagnósticos del móvil se queda en blanco.
  it("diagnosticos se puede consultar como grupo", async () => {
    await assertSucceeds(getDocs(query(collectionGroup(como(ASESOR), "diagnosticos"))));
  });

  it("pagos_CporCobrar también", async () => {
    await assertSucceeds(getDocs(query(collectionGroup(como(ASESOR), "pagos_CporCobrar"))));
  });

  it("pero no sin sesión", async () => {
    await assertFails(getDocs(query(collectionGroup(sinLogin(), "diagnosticos"))));
  });
});

describe("salir del bucle: identificarse por correo", () => {
  // Para saber si alguien es personal hay que leer su rol de `users`, y para leer `users`
  // hay que ser personal. Quien tiene el documento mal nombrado se quedaba encerrado.
  const porCorreo = (uid, email) =>
    entorno.authenticatedContext(uid, { email, firebase: { sign_in_provider: "password" } }).firestore();

  beforeEach(async () => {
    await entorno.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "doc-con-id-raro"), {
        user_role: "Administrador", email: "alex@ejemplo.com",
      });
    });
  });

  it("encuentra su propia ficha aunque el documento no se llame como su uid", async () => {
    const db = porCorreo("uid-que-no-coincide", "alex@ejemplo.com");
    await assertSucceeds(
      getDocs(query(collection(db, "users"), where("email", "==", "alex@ejemplo.com")))
    );
  });

  it("pero no la de otro", async () => {
    const db = porCorreo("uid-que-no-coincide", "alex@ejemplo.com");
    await assertFails(
      getDocs(query(collection(db, "users"), where("email", "==", "otro@ejemplo.com")))
    );
  });

  it("ni la colección entera", async () => {
    const db = porCorreo("uid-que-no-coincide", "alex@ejemplo.com");
    await assertFails(getDocs(query(collection(db, "users"))));
  });
});

describe("el administrador cuyo documento no se llama como su uid", () => {
  // Caso real: alex.vilcahuaman@gearmotorparts.com es Administrador y su documento en
  // `users` se llama `lmmhWeOIsEvvIVw7UVVt` (20 caracteres), no su uid de Auth. Buscar el
  // rol por uid lo deja sin permisos; el custom claim lo resuelve.
  const conClaim = (uid, role) =>
    entorno.authenticatedContext(uid, { role, firebase: { sign_in_provider: "password" } }).firestore();

  it("sin claim y sin documento con su uid, no puede borrar", async () => {
    await assertFails(deleteDoc(doc(como("uid-real-de-alex"), "Facturas", "f1")));
  });

  it("con el claim puesto, sí puede", async () => {
    await assertSucceeds(deleteDoc(doc(conClaim("uid-real-de-alex", "Administrador"), "Facturas", "f1")));
  });

  it("el claim no convierte en administrador a cualquiera", async () => {
    await assertFails(deleteDoc(doc(conClaim("uid-real-de-alex", "Cliente"), "Facturas", "f1")));
    await assertFails(deleteDoc(doc(conClaim("uid-real-de-alex", "Tecnico Mecanico"), "Facturas", "f1")));
  });

  it("quien sí tiene su documento bien nombrado sigue funcionando sin claim", async () => {
    await assertSucceeds(deleteDoc(doc(como(ADMIN), "Facturas", "f1")));
  });
});

describe("el cliente no tiene sitio en la base del taller", () => {
  it("no lee comprobantes, ni recepciones, ni fichas de otros", async () => {
    const db = como(CLIENTE);
    await assertFails(getDoc(doc(db, "Facturas", "f1")));
    await assertFails(getDoc(doc(db, "recepciones", "rec1")));
    await assertFails(getDoc(doc(db, "users", ADMIN)));
  });

  it("no escribe facturas ni gasta correlativos", async () => {
    const db = como(CLIENTE);
    await assertFails(setDoc(doc(db, "Facturas", "f9"), { total: 1 }));
    await assertFails(setDoc(doc(db, "LastCode", "F001"), { numero: 999 }, { merge: true }));
  });

  it("pero sí puede leer y editar su propia ficha", async () => {
    const db = como(CLIENTE);
    await assertSucceeds(getDoc(doc(db, "users", CLIENTE)));
    await assertSucceeds(setDoc(doc(db, "users", CLIENTE), { phone_number: "999" }, { merge: true }));
  });
});

describe("nadie se asciende a sí mismo", () => {
  it("un cliente no puede ponerse rol de administrador", async () => {
    await assertFails(
      setDoc(doc(como(CLIENTE), "users", CLIENTE), { user_role: "Administrador" }, { merge: true })
    );
  });

  it("un técnico tampoco puede cambiar el rol de otro", async () => {
    await assertFails(
      setDoc(doc(como(TECNICO), "users", ASESOR), { user_role: "Administrador" }, { merge: true })
    );
  });

  it("administración sí asigna roles", async () => {
    await assertSucceeds(
      setDoc(doc(como(ADMIN), "users", TECNICO), { user_role: "Jefe de Taller" }, { merge: true })
    );
  });
});

describe("el técnico trabaja en el taller, no en la caja", () => {
  it("lee y actualiza recepciones y diagnósticos", async () => {
    const db = como(TECNICO);
    await assertSucceeds(getDoc(doc(db, "recepciones", "rec1")));
    await assertSucceeds(setDoc(doc(db, "recepciones", "rec1", "diagnosticos", "d2"), { falla: "Aceite" }));
  });

  it("consulta el catálogo de artículos para diagnosticar", async () => {
    await assertSucceeds(getDoc(doc(como(TECNICO), "Articles", "a1")));
  });

  it("pide vales de insumos", async () => {
    await assertSucceeds(setDoc(doc(como(TECNICO), "ValeInsumos", "v1"), { cantidad: 2 }));
  });

  it("pero no toca facturas, cobranza ni correlativos", async () => {
    const db = como(TECNICO);
    await assertFails(getDoc(doc(db, "Facturas", "f1")));
    await assertFails(setDoc(doc(db, "Facturas", "f9"), { total: 1 }));
    await assertFails(getDoc(doc(db, "cuentasPorCobrar", "c1")));
    await assertFails(setDoc(doc(db, "LastCode", "F001"), { numero: 99 }, { merge: true }));
  });

  it("y tampoco modifica el catálogo de artículos", async () => {
    await assertFails(setDoc(doc(como(TECNICO), "Articles", "a2"), { nombre: "X" }));
  });

  // Un vale de insumos descuenta existencias: si el taller no puede hacerlo, el vale se
  // guarda y los repuestos siguen contados en el almacén. Pasó de verdad y dejó un vale
  // huérfano en la base.
  it("el taller mueve existencias pero no toca el maestro", async () => {
    const db = como(TECNICO);
    await assertSucceeds(setDoc(doc(db, "Articles", "a1"), { Stock: 41 }, { merge: true }));
    await assertFails(setDoc(doc(db, "Articles", "a1"), { Precio_Venta_Sale_price: 1 }, { merge: true }));
    await assertFails(setDoc(doc(db, "Articles", "a1"), { Stock: 40, nombre: "Otro" }, { merge: true }));
  });

  it("y deja constancia del movimiento, sin poder reescribirlo", async () => {
    const db = como(TECNICO);
    await assertSucceeds(setDoc(doc(db, "Almacen_movement", "m-taller"), { Quantity: -1 }));
    await assertFails(setDoc(doc(db, "Almacen_movement", "m1"), { Quantity: -9 }, { merge: true }));
  });

  it("trabaja la orden: avanza el estado y deja sus comentarios", async () => {
    const db = como(TECNICO);
    await assertSucceeds(setDoc(doc(db, "recepciones", "rec1"), {
      status: "Diagnóstico", Observaciones_adicionales: "Pastillas al límite",
    }, { merge: true }));
  });

  it("pero no reescribe de quién es el coche", async () => {
    const db = como(TECNICO);
    await assertFails(setDoc(doc(db, "recepciones", "rec1"), { nombre_cliente: "Otro" }, { merge: true }));
    await assertFails(setDoc(doc(db, "recepciones", "rec1"), { placa: "XXX999" }, { merge: true }));
    await assertFails(setDoc(doc(db, "recepciones", "rec1"), { DNI: "00000000" }, { merge: true }));
    await assertFails(setDoc(doc(db, "recepciones", "rec1"), { codeCT: "CT001-9999999" }, { merge: true }));
  });

  it("el asesor sí puede corregir esos datos", async () => {
    const db = como(ASESOR);
    await assertSucceeds(setDoc(doc(db, "recepciones", "rec1"), { placa: "B1D124" }, { merge: true }));
  });

  // Los contadores internos del taller SÍ los gasta: son el nº de orden y el código de
  // documento de la recepción, no una serie fiscal. Con la regla anterior —que trataba
  // todos los LastCode por igual— un técnico no podía guardar ninguna orden de trabajo: al
  // asignar el correlativo la escritura se denegaba. Verificado en producción con una
  // sesión real antes de afinar la regla.
  it("consume los contadores internos del taller, que no son series fiscales", async () => {
    const db = como(TECNICO);
    await assertSucceeds(setDoc(doc(db, "LastCode", "vs-orden"), { numero: 5 }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, "LastCode", "codeCT"), { numero: 230 }, { merge: true }));
  });

  it("pero sigue sin poder tocar las series de comprobantes", async () => {
    const db = como(TECNICO);
    await assertFails(setDoc(doc(db, "LastCode", "B001"), { numero: 1 }, { merge: true }));
    await assertFails(setDoc(doc(db, "LastCode", "PRUEBA-F001"), { numero: 1 }, { merge: true }));
    await assertFails(deleteDoc(doc(db, "LastCode", "vs-orden")));
  });
});

describe("el asesor vende y cobra", () => {
  it("emite comprobantes y consume correlativos", async () => {
    const db = como(ASESOR);
    await assertSucceeds(setDoc(doc(db, "Facturas", "f3"), { total: 300 }));
    await assertSucceeds(setDoc(doc(db, "LastCode", "F001"), { numero: 9 }, { merge: true }));
  });

  it("gestiona cobranza y registra pagos", async () => {
    const db = como(ASESOR);
    await assertSucceeds(getDoc(doc(db, "cuentasPorCobrar", "c1")));
    await assertSucceeds(setDoc(doc(db, "cuentasPorCobrar", "c1", "pagos_CporCobrar", "p3"), { monto: 10 }));
  });

  it("pero sigue sin poder borrar", async () => {
    await assertFails(deleteDoc(doc(como(ASESOR), "Facturas", "f1")));
  });
});

describe("catálogos congelados y colecciones nuevas", () => {
  it("Repuestos e Insumos se leen pero no se escriben", async () => {
    const db = como(ADMIN);
    await assertSucceeds(getDoc(doc(db, "Repuestos", "r1")));
    await assertFails(setDoc(doc(db, "Repuestos", "r2"), { nombre: "Bujía" }));
  });

  it("una colección no declarada queda denegada, no abierta", async () => {
    const db = como(ADMIN);
    await assertFails(setDoc(doc(db, "ColeccionQueNadieDeclaro", "x"), { a: 1 }));
    await assertFails(getDoc(doc(db, "ColeccionQueNadieDeclaro", "x")));
  });
});
