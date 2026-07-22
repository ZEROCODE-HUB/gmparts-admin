## Objective
- Migrar gmparts-admin-web (React) a paridad con GMPARTS-ADMIN-LEGACY (Flutter). Fases A/B/C/E (front, localStorage) completas. **Fase D (backend real Firebase)**: D1 + D2 implementados y compilando; pendientes D3-D5.

## Important Details
- Persistencia mixta: localStorage vía `db.js` para `va-*`/`vs-*`/`c-*` (hasta fases posteriores); `firestoreDb.js` ya enruta `cat-*`, `users`, `Proveedores`, `personal`, `Almacen`, `service`, `Vehiculos`.
- `src/lib/firebase.js`: config `g-m-parts-lac7fg`, exporta `app`, `db`, `auth`.
- Algolia (App ID `0CXWHIXYJC`, índice `Articles`) SOLO para buscador de Artículos.
- Reglas Firestore (`GMPARTS-ADMIN-LEGACY/firebase/firestore.rules`) sincronizadas con prod: `if true` + 2 reglas globales. Riesgo crítico documentado en BACKEND_SPEC.md §2.1.
- Mapeo docKey→colección (§3.1): `vs-*`→`Facturas`, `va-*`+`c-*`+`al-notaventa`→`FacturasVentasCompras`. Repuestos/Insumos NUNCA escritos (solo lectura vía Articles). `Facturas` esquema simple (`RazonSNombre`, `items`).
- Stack test: `vitest`+`jsdom`+`@testing-library/*`; `npm run check` = lint+build+test; CI `.github/workflows/ci.yml`.
- Componentes UI: `ui/Toolbar`, `ui/Table`+`Td`, `ui/Modal`, `ui/Btn`, `ui/Field`+`inputCls`, `ui/SearchBox`, lucide-react.

## Work State
### Completed
- **Fases A/B/C/E (localStorage)** + tests userFlows/stockBlock (5/5) + CI.
- **BACKEND_SPEC.md**: §0 Algolia, §1 mapeo 24 colecciones, §2 reglas+TODO, §3 CRUD swappable, §4 reglas negocio, §5 onUserDeleted/Algolia, §6 orden D1-D5.
- **Fase D1 (confirmada)**: firestoreDb.js, useCatalog.js, Catalogos.jsx, ArticuloForm/VehiculoForm conectados a catálogos Firestore. Build+dev OK, escritura real verificada.
- **Fase D2 (completada, sin confirmación de usuario aún)**:
  - Auth real: `src/store/auth.js` → Firebase Auth (signInWithEmailAndPassword, onAuthStateChanged, signOut). Rol desde `users.user_role`. App.jsx sincroniza sesión.
  - `firestoreDb.js` extendido con `useFirestoreCollection`, `saveMaestro`, `deleteMaestro`.
  - `users` (Clientes filtrados por user_role), `Proveedores`, `personal`, `Almacen`, `service`, `Vehiculos` conectados a Firestore con mapeo de campos a esquema Flutter.
  - 6 páginas reconstruidas con la librería de componentes real (`ui/` — Toolbar, Table, Modal, Btn, Field, SearchBox, lucide).
  - `npm run build` compila limpio.

### Active
- Pendiente confirmación del usuario: login real con usuario Firebase + CRUD en Console.
- D3-D5 sin iniciar.

### Blocked
- D3 (PDF real) bloqueado hasta confirmación D2.
- D4 (SUNAT), D5 (reglas server-side) bloqueados hasta D3.

## Next Move
1. Usuario debe probar login real con un usuario existente en Firebase Auth (rol desde `users.user_role`).
2. Crear/editar/eliminar al menos un registro en cualquier maestro (ej. Almacenes) y verificar en Firebase Console.
3. Tras confirmación, proceder a D3 (PDF vía Cloud Function).

## Relevant Files
- `src/store/auth.js` — Auth real (D2)
- `src/store/firestoreDb.js` — helpers `useFirestoreCollection`, `saveMaestro`, `deleteMaestro`
- `src/pages/administracion/{ClientesList,ProveedoresList,PersonalList}.jsx` — D2 (users/Proveedores/personal)
- `src/pages/almacen/{AlmacenesList,ServiciosList,VehiculosList,VehiculoForm}.jsx` — D2 (Almacen/service/Vehiculos)
- `src/App.jsx` — observeAuth hook + routes
- `CHECKLIST.md` — tracking D1/D2
- `BACKEND_SPEC.md` — fuente de verdad
- `src/lib/firebase.js` — Firebase config
