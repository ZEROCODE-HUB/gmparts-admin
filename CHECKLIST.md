# CHECKLIST - Tanda 3 (Auditoría Completa Ventas + Compras + Cobranza + Reportes)

## PARTE 1 — Acciones en tablas de listado (10 módulos)
Cada fila ahora tiene 4 acciones: Ver detalle (Eye), Editar (Pencil), Imprimir (Printer), Anular (Trash2).
Además, Nota de Venta tiene "Canjear" (Repeat).

### Ventas Artículos (5 listas)
- [x] `src/pages/ventas/articulos/CotizacionesList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/articulos/EmisionFacturaList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/articulos/EmisionBoletaList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/articulos/GuiaRemisionList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/articulos/NotaCreditoList.jsx` — Eye, Pencil, Printer, Trash2

### Ventas Servicio (5 listas)
- [x] `src/pages/ventas/servicios/CotizacionServicioList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/servicios/OrdenTrabajoList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/servicios/EmisionFacturaTallerList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/servicios/EmisionBoletaTallerList.jsx` — Eye, Pencil, Printer, Trash2
- [x] `src/pages/ventas/servicios/RegistroNotaVentasList.jsx` — Eye, Pencil, Printer, Trash2, **Repeat (Canjear)**

## PARTE 2 — Líneas de detalle múltiples (Crear / Editar / Ver)

### Ventas Artículos — DocumentEditor (`src/components/documents/DocumentEditor.jsx`)
- [x] **CREAR**: Selector/buscador de artículos desde seed.articulos, agregar items, editar cantidad inline, eliminar línea, cálculo auto Subtotal/IGV/Total
- [x] **EDITAR**: Ruta `/:id` — precarga datos existentes + items, permite modificar cantidades, agregar/eliminar líneas, recalcula en tiempo real
- [x] **VER DETALLE**: Modo `mode="view"` — muestra todas las líneas del documento (solo lectura), cabecera + detalle completo
- [x] `src/components/documents/DocumentPreviewModal.jsx` — ahora muestra items/detalle además de campos de cabecera

### Ventas Servicio — ServicioEditor (`src/components/documents/ServicioEditor.jsx`)
- [x] **CREAR**: Secciones independientes para **Servicios**, **Mano de obra** (por horas), **Artículos/Repuestos** (desde seed.articulos). Cada línea tiene tipo (Serv/M.O./Rep.), edición de cantidad, eliminación, cálculo auto Subtotal/IGV/Total con toggle INCLUIDO IGV / MAS IGV
- [x] **EDITAR**: Ruta `/:id` — precarga datos existentes + items, modificar cantidades, agregar/eliminar líneas
- [x] **VER DETALLE**: Modo `mode="view"` — muestra cabecera + todas las líneas con tipo y montos

## PARTE 3 — Bloque H: Compras (5 módulos)

### CompraEditor (`src/components/documents/CompraEditor.jsx`)
- [x] **CREAR**: Formulario con proveedor, serie, fecha, moneda, forma de pago, tipo IGV, almacén, checkbox actualizar stock. Selector/buscador de artículos con precio de compra, editar cantidad, eliminar línea, cálculo auto Subtotal/IGV/Total
- [x] **EDITAR**: Ruta `/:id` — precarga datos + items, modificar cantidades, agregar/eliminar líneas
- [x] **VER DETALLE**: Modo vista previa con cabecera + todas las líneas

### Factura Compra — `src/pages/compras/FacturaList.jsx`
- [x] Lista con Eye, Pencil, Printer, Trash2, preview modal con items
- [x] Crear `/c-factura/nuevo`
- [x] Editar `/c-factura/:id`

### Boleta Compra — `src/pages/compras/BoletaList.jsx`
- [x] Lista con Eye, Pencil, Printer, Trash2, preview modal
- [x] Crear `/c-boleta/nuevo`
- [x] Editar `/c-boleta/:id`

### Nota de Pedido — `src/pages/compras/NotaPedidoList.jsx`
- [x] Lista con Eye, Pencil, Printer, Trash2, preview modal
- [x] Crear `/c-notas/nuevo`
- [x] Editar `/c-notas/:id`

### Guía de Compra — `src/pages/compras/GuiaCompraList.jsx`
- [x] Lista con Eye, Pencil, Printer, Trash2, preview modal
- [x] Crear `/c-guia/nuevo`
- [x] Editar `/c-guia/:id`

### Orden de Pago — `src/pages/compras/OrdenPagoList.jsx`
- [x] Lista con Eye, Pencil, Printer, Trash2, preview modal
- [x] Crear `/c-orden/nuevo`
- [x] Editar `/c-orden/:id`

## PARTE 4 — Bloque I: Cobranza + Reportes

### Cobranza
- [x] `CuentasCobrar.jsx` — Lista con Documento, Número, Razón Social, Total, Pago, Estado, Fecha, Detalle (Eye), botón Pagar
- [x] `CuentasPagar.jsx` — Reutiliza CuentasCobrar con kind="Pagar"
- [x] **Modal de pago**: Método de pago (Efectivo/Cheque/Depósito/Tarjeta), Monto, Fecha, Resumen con Importe/Saldo pendiente, botón Crear pago
- [x] **Modal de detalle**: Muestra cabecera + historial de pagos registrados

### Reportes
- [x] `ReporteVentas.jsx` — Filtros: RUC/DNI, Cliente, Fecha desde/hasta. Tablas: Condiciones de pago, Documentos electrónicos
- [x] `ReporteDocElect.jsx` — Filtros: Documento, Año, Mes. Tabla con Descripción, Excel (Download), Vista (Eye)

## Rutas agregadas en App.jsx
### Ventas Artículos (edit routes)
- [x] `/va-cotizacion/:id` — DocumentEditor mode="edit"
- [x] `/va-factura/:id` — DocumentEditor mode="edit"
- [x] `/va-boleta/:id` — DocumentEditor mode="edit"
- [x] `/va-guia/:id` — DocumentEditor mode="edit"
- [x] `/va-notacredito/:id` — DocumentEditor mode="edit"

### Ventas Servicio (create + edit routes)
- [x] `/vs-cotizacion/nuevo` — ServicioEditor
- [x] `/vs-cotizacion/:id` — ServicioEditor mode="edit"
- [x] `/vs-orden/nuevo` — ServicioEditor
- [x] `/vs-orden/:id` — ServicioEditor mode="edit"
- [x] `/vs-factura/nuevo` — ServicioEditor
- [x] `/vs-factura/:id` — ServicioEditor mode="edit"
- [x] `/vs-boleta/nuevo` — ServicioEditor
- [x] `/vs-boleta/:id` — ServicioEditor mode="edit"
- [x] `/vs-notas/nuevo` — ServicioEditor
- [x] `/vs-notas/:id` — ServicioEditor mode="edit"

### Compras (create + edit + list routes)
- [x] `/c-factura` — FacturaCompraList
- [x] `/c-factura/nuevo` — CompraEditor
- [x] `/c-factura/:id` — CompraEditor mode="edit"
- [x] `/c-boleta` — BoletaCompraList
- [x] `/c-boleta/nuevo` — CompraEditor
- [x] `/c-boleta/:id` — CompraEditor mode="edit"
- [x] `/c-notas` — NotaPedidoList
- [x] `/c-notas/nuevo` — CompraEditor
- [x] `/c-notas/:id` — CompraEditor mode="edit"
- [x] `/c-guia` — GuiaCompraList
- [x] `/c-guia/nuevo` — CompraEditor
- [x] `/c-guia/:id` — CompraEditor mode="edit"
- [x] `/c-orden` — OrdenPagoList
- [x] `/c-orden/nuevo` — CompraEditor
- [x] `/c-orden/:id` — CompraEditor mode="edit"

### Cobranza + Reportes routes
- [x] `/cb-cobrar` — CuentasCobrar kind="Cobrar"
- [x] `/cb-pagar` — CuentasPagar
- [x] `/rp-ventas` — ReporteVentas
- [x] `/rp-doc` — ReporteDocElect

## Seed data actualizada
- [x] `src/mock/seed.compras.js` — facturasCompraSeed, boletasCompraSeed, notasPedidoSeed, guiasCompraSeed, ordenesPagoSeed
- [x] `src/mock/seed.cobranza.js` — cuentasCobrarSeed con pagos embedidos
- [x] `src/pages/ventas/servicios/*.jsx` — datos iniciales ahora incluyen `items`, `subtotal`, `igv` para vista previa correcta

## Build
- [x] `npm run build` compila limpio

## TANDA 4 — Lógica de negocio en editores de documentos

- [x] 1. Columnas PrecioCompra, Utilidad% y aviso de stock bajo en la tabla de líneas de ítems de los 3 editores (DocumentEditor Ventas Artículos, editor Ventas Servicio, editor Compras), replicando el layout de row_articles_widget.dart
- [x] 2. Lógica de selección de artículo: validación de stock en Venta, cálculo automático de precioVenta = precioCompra + (precioCompra * utilidad * 0.01) en Compra
- [x] 3. Validación de formulario obligatoria: moneda, fecha, condPago, tipoIgv, almacén, y al menos un ítem en la lista
- [x] 4. Debounce en inputs de cantidad, precioCompra y utilidad antes de recalcular totales (verificar tiempo exacto en código Dart)
- [x] 5. Validación de tipo de cliente/proveedor según tipo de documento (Factura=Jurídica, Boleta=Natural)

## TANDA 5 — Asociar documento previo en VENTAS (Cotización / Nota de Venta → Factura/Boleta)

> Contexto Flutter verificado:
> - Venta SÍ carga ítems desde documento previo. `crearfactura_widget.dart:1716` botón "Agregar Cotizacion" → `CotizacionesWidget` (`:1681`) que vuelca repuestos y horas con `addToCrearFacturas(...)` (`cotizaciones_widget.dart:1163,1234,1456`) y devuelve `condpago` vía `widget.action` (`:1296`).
> - Nota de Venta → Factura/Boleta: `canjearnotaventa_widget.dart` copia `_model.notaventa?.items` (`:122`) y conserva `numCotizacion` (`:113`).
> - Compra es AUTÓNOMA (no aplica): solo elige artículos manualmente (`elegir_articulos_widget.dart`). NO se implementa nada en CompraEditor.
> - Servicios entran a la factura vía la cotización (horas de diagnóstico). La OT se crea aparte y no se selecciona dentro de la factura.

### A. Seeds y datos
- [x] A1. `src/mock/seed.facturas.js`: `cotizacionesVASeed` ya existe (cot1, cot2) con `items:[{art,cant,pu,total}]`. Verificar que sus ítems se pueden mapear a la forma de item del editor (ver B3).
- [ ] A2. Crear `notasVentaVASeed` (Nota de Venta) en `src/mock/seed.facturas.js` SOLO SI se implementa el canje: estructura `{id, serie, numero, fecha, cliente, clienteDoc, tipoDoc, condPago, items:[{art,cant,pu,total}], numCotizacion}`. (Flutter: `canjearnotaventa_widget.dart:21` recibe `FacturasRecord notaventa`.) → NO implementado (fuera de alcance acordado).
- [x] A3. No modificar seeds de Compra.

### B. DocumentEditor — Cargar desde Cotización (Ventas Artículos)
- [x] B1. Agregar botón "Agregar Cotización" en el formulario de creación (junto al buscador de artículos), visible SOLO en `mode !== "view"`. Refleja `crearfactura_widget.dart:1716`.
- [x] B2. Al pulsar, abrir un panel/modal que liste `cotizacionesVASeed` filtrable por cliente. (Flutter: `CotizacionesWidget` filtra por `cliente` = `_model.readUser.displayName`, `:1682`.)
- [x] B3. Al elegir una cotización, volcar TODOS sus ítems a `items` del editor con mapeo normalizado:
  `codigo: "" , descripcion: item.art, cant: item.cant, pu: item.pu, total: item.total, tipo:"repuesto", stock:null, precioCompra:0, utilidad:0`.
  (Flutter: `cotizaciones_widget.dart:1163` `addToCrearFacturas(FacturasArticulosStruct(descripcion, cantidad, precioVenta, ...))`.)
- [x] B4. Al cargar la cotización, también setear `form.condPago` (y `form.cliente`/`clienteDoc`/`tipoDoc` si estaban vacíos) desde la cotización elegida. (Flutter: `widget.action(condpago)` → `_model.condPagoValue`, `:1684-1690` y `:1296-1300`.)
- [x] B5. La carga NO debe duplicar ítems ya existentes si se vuelve a pulsar la misma cotización (limpiar `items` previos de esa fuente o reemplazar). Criterio: tras elegir cotización, `items` = ítems de la cotización (no suma a los manuales preexistentes sin control).
- [x] B6. El botón/modal NO debe aparecer en `mode="view"` ni debe alterar el documento precargado en `mode="edit"` salvo acción explícita del usuario.

### C. ServicioEditor — Cargar desde Cotización (Ventas Servicio)
- [x] C1. Agregar botón "Agregar Cotización" en el formulario de creación (sección Servicios/Repuestos), visible SOLO en `!isView`.
- [x] C2. Al elegir cotización, volcar ítems mapeados: para cada `item` de la cotización, si representa servicio/hora → `tipo:"servicio"`, si es repuesto → `tipo:"repuesto"` con `precioCompra/utilidad/stock` (stock desde seed.articulos si coincide por nombre). (Flutter: cotización incluye horas de diagnóstico + repuestos, `cotizaciones_widget.dart:1163,1234,1456`.)
- [x] C3. Setear `form.cliente`/`clienteDoc`/`tipoIgv`/`formaPago`/`moneda` desde la cotización si están vacíos.
- [x] C4. No duplicar; reemplazar ítems de esa fuente al recargar.

### D. Canje de Nota de Venta (opcional, condicionado a A2)
- [ ] D1. En `RegistroNotasVentasList.jsx` la acción "Canjear" (Repeat) ya existe (Tanda 3) y debe navegar al editor de Factura/Boleta precargado desde la nota. (Flutter: `canjearnotaventa_widget.dart`.) → NO implementado (fuera de alcance).
- [ ] D2. Al canjear, el editor recibe la nota y precarga `items = nota.items` mapeados, `cliente/clienteDoc/tipoDoc/condPago` y `numCotizacion = nota.numero` (conservar referencia). (Flutter: `:113` `numCotizacion: _model.notaventa?.numCotizacion`.)
- [ ] D3. El documento resultante (Factura o Boleta) mantiene el `numCotizacion` de la nota origen en `form.numCotizacion` y lo muestra en VER detalle.

### E. Comportamiento que NO debe cambiar
- [x] E1. CompraEditor: SIN botón "Agregar Cotización", SIN carga desde documento previo (autónomo, igual que Flutter `crearfactura_compra_widget.dart`).
- [x] E2. El usuario SIEMPRE puede seguir agregando artículos manualmente además de (o en vez de) cargar desde cotización. (Flutter: ambos mecanismos alimentan la misma lista `CrearFacturas`, `:1027`.)
- [x] E3. La validación de Tanda 4 (moneda/fecha/condPago/tipoIgv/almacén/items + Factura=Jurídica/Boleta=Natural) sigue aplicando después de cargar desde cotización.

### G. Visibilidad en MODO VER (solo lectura) — origen del documento
- [x] G1. El documento guardado desde cotización debe mostrar en la vista `mode="view"` una línea/sección "Documento de origen: Cotización C001-000001" (o similar) con el `numCotizacion`/referencia conservada. (Flutter guarda `numCotizacion` y la factura lo conserva; la UI de detalle debe reflejarlo.)
- [x] G2. Los ítems cargados desde la cotización deben verse en la tabla de detalle de la vista VER exactamente igual que los agregados manualmente (mismas columnas P. Venta/P. Compra/Utilidad%/Total).
- [x] G3. En ServicioEditor `mode="view"`, la sección de detalle debe mostrar los ítems de origen (servicio/repuesto) y, si aplica, la referencia de la cotización de origen.
- [ ] G4. (Si D) En la vista VER de la Factura/Boleta canjeada desde Nota de Venta, mostrar "Origen: Nota de Venta NVxx-xxxx" y `numCotizacion` conservado. → NO implementado.
- [x] G5. La vista VER no debe permitir recargar ni editar el origen (solo lectura); el botón "Agregar Cotización" está ausente en `isView`.

### F. Verificación final
- [x] F1. `npm run build` compila limpio.
- [x] F2. Manual: crear Factura de Venta → "Agregar Cotización" → elegir cot1 → `items` se puebla con Filtro de Aceite/Bujía, `condPago` se setea, total recalcula. Guardar y ver detalle refleja los ítems.
- [x] F3. Manual: crear Factura de Servicio → "Agregar Cotización" → ítems (servicio/repuesto) se cargan y cabecera se autocompleta.
- [ ] F4. (Si D) Canjear Nota de Venta → Factura precargada con ítems y `numCotizacion` conservado. → NO implementado.
- [x] F5. Compra: confirmar que NO hay opción de cargar cotización.
- [x] F6. Ver detalle (modo view) de un documento creado desde cotización muestra la referencia de origen (G1) y los ítems cargados (G2).

---

## PROMPT DE IMPLEMENTACIÓN — TANDA 5 (detallado)

Objetivo: en VENTAS, permitir que una Factura/Boleta (artículos o servicios) se origine
cargando los ítems de una Cotización previa, y (opcional) canjeando una Nota de Venta.
COMPRAS queda igual (autónoma, sin carga de documento previo).

### Reglas estrictas (copiadas del Flutter verificado)
- Flutter Venta: `crearfactura_widget.dart:1716` botón "Agregar Cotizacion"; `:1681` abre
  `CotizacionesWidget`; al elegir cotización vuelca ítems con `addToCrearFacturas`
  (`cotizaciones_widget.dart:1163,1234,1456`) y devuelve `condpago` (`widget.action`, `:1296`).
- Flutter Nota de Venta: `canjearnotaventa_widget.dart` copia `_model.notaventa?.items` (`:122`)
  y conserva `numCotizacion` (`:113`).
- Flutter Compra: `crearfactura_compra_widget.dart` solo usa `elegir_articulos_widget.dart`;
  NO hay selector de cotización/OC. No tocar CompraEditor.

### Paso 1 — Estado y modelo de item
- En `DocumentEditor.jsx` y `ServicioEditor.jsx` añadir estado `origen` (string|null), p.ej.
  `{ tipo: "cotizacion"|"notaventa"|null, ref: "C001-000001"|null }`.
- El item del editor ya tiene forma `{codigo, descripcion, cant, pu, total, tipo, stock,
  precioCompra, utilidad}`. Mantener esa forma; al cargar desde cotización mapear
  `item.art -> descripcion`, `item.cant->cant`, `item.pu->pu`, `item.total->total`,
  `tipo:"repuesto"`, `stock:null`, `precioCompra:0`, `utilidad:0`.

### Paso 2 — Botón "Agregar Cotización" (solo crear/editar, NO view)
- Ubicación: en DocumentEditor junto al buscador de artículos (bloque `~:336-351`); en
  ServicioEditor en la sección "Artículos / Repuestos" (`~:385-399`).
- Render condicional: `!isView` / `mode!=="view"`.
- Al pulsar: abrir modal que liste `cotizacionesVASeed` (fila: serie-numero, cliente, fecha,
  total). Permitir filtro por texto de cliente.
- Al elegir: `setItems(cot.items.map(...))`; `set("condPago", cot.formaPago || cot.condPago)`;
  si `form.cliente` vacío: `set("cliente", cot.cliente)`, `set("clienteDoc", cot.clienteDoc)`,
  `set("tipoDoc", cot.tipoDoc)`; `setOrigen({tipo:"cotizacion", ref: cot.serie+"-"+cot.numero})`.
- No duplicar: reemplazar `items` (no concatenar) al recargar la misma fuente.

### Paso 3 — ServicioEditor mapeo de tipos
- Para cada item de la cotización: si el nombre coincide con un servicio en `serviciosSeed`
  → `tipo:"servicio"`; si coincide con `articulosSeed` → `tipo:"repuesto"` con
  `stock` tomado de `articulosSeed.Stock`, `precioCompra` de `Precio_compra_Purchase_price`,
  `utilidad` de `Utilidad_Profit_Percentage`.
- Autocompletar cabecera desde cotización si vacía (cliente, clienteDoc, tipoIgv, formaPago,
  moneda).

### Paso 4 — Canje de Nota de Venta (solo si se aprueba D)
- Crear `notasVentaVASeed` en `seed.facturas.js` con forma igual a cotización + `numCotizacion`.
- En `RegistroNotasVentasList.jsx` la acción "Canjear" (Repeat, ya existe Tanda 3) navega a
  `/va-factura/nuevo?fromNotaVenta=<id>` (o estado route) precargando el editor.
- El editor, al detectar el parámetro, precarga `items` desde la nota, cabecera, y
  `form.numCotizacion = nota.numero`; `setOrigen({tipo:"notaventa", ref: nota.serie+"-"+nota.numero})`.

### Paso 5 — Vista VER (solo lectura) — crítico
- En `DocumentEditor.jsx` modo view (`~:241-279`): tras los campos de cabecera, mostrar
  bloque "Documento de origen" si `origen` existe: `<span>Origen: {origen.tipo} {origen.ref}</span>`.
- En `ServicioEditor.jsx` modo view (`~:279-315`): igual, bloque de origen.
- Los ítems cargados deben verse en la misma tabla de detalle (sin distinción visual respecto
  a manuales). El botón "Agregar Cotización" NO se renderiza en view.

### Paso 6 — Persistencia en seed (para que VER funcione tras recargar)
- Al guardar (Tanda 4 `handleSubmit`), incluir `origen` en el objeto guardado (`{...form,
  items, subtotal, igv, total, origen}`).
- Los seeds de destino (facturasVASeed/boletasVASeed y seeds de servicio) deben aceptar campo
  `origen`; al precargar en `mode="view"`/`mode="edit"` leer `existing.origen` y setear estado.

### Paso 7 — No romper Compra ni validaciones
- CompraEditor: no añadir nada de esto.
- Validaciones Tanda 4 permanecen; al cargar cotización los campos autocompletados deben
  seguir pasando `validate()`.

### Paso 8 — Build y pruebas
- `npm run build` limpio.
- Probar F2, F3, F6 del checklist. Compra sin cambios (F5).

### Criterios de aceptación (definition of done)
- [ ] Factura/Boleta Venta puede cargar ítems desde Cotización con 1 clic.
- [ ] Cabecera (cliente/condPago) se autocompleta.
- [ ] Vista VER muestra referencia de origen y los ítems.
- [ ] ServicioEditor soporta lo mismo (servicio/repuesto).
- [ ] Compra intacta.
- [ ] Build limpio.

---

# FASES A–E — Homologación a GMPARTS-ADMIN-LEGACY (Flutter)

Objetivo: llevar gmparts-admin-web (React) a paridad funcional/UX con el Flutter.
Persistencia actual = localStorage vía `src/store/db.js` (no Firebase todavía).

## Fase A — Correcciones + Reportes ✅
- A1 DocumentEditor: select de cliente refleja cliente precargado al editar.
- A2 ServicioEditor: al cambiar tipo de documento precarga tipoDoc/observación y el cliente seleccionado actualiza tipoDoc.
- A3 MovimientoForm: en modo edición precarga datos desde el kardex.
- A4 Unificar tipoIgv en CompraEditor (INCLUIDO / MAS; acepta legacy "INCLUIDO IGV"/"MAS IGV").
- A5 Dashboard: quitar badge de facturación falsa; accesos Rápidos enlazados a rutas reales.
- A6 ReporteVentas / ReporteDocElect: datos desde store, Export CSV, vista previa.

## Fase B — Módulos faltantes (front) ✅
- B0 `db.js`: helpers (maybeGenerateAccount, markRecepcionFacturada, consumirRepuestosOT, saveVale, getOTFacturaItems, setEstadoFactura, saveCuenta, getCuentas) + seeds (users, recepciones, vales, cuentasPorCobrar).
- B1 Orden de Trabajo: `OrdenTrabajoEditor` + `OrdenTrabajoList` (estados, diagnóstico+repuestos, "Generar factura" precarga ServicioEditor y marca `facturado`). Rutas `/vs-orden/nuevo`, `/vs-orden/:id`.
- B2 Vale de insumos real (`ValeInsumos.jsx`): descuenta stock/kardex (Salida), opcional OT. Entrada en Sidebar Almacén.
- B3 Cuentas por Cobrar/Pagar desde store (`CuentasCobrar.jsx`, `CuentasPagar.jsx`); crédito auto-genera cuenta en `saveDocument`.
- B4 PrintDocument + PrintButton + `@media print` en `index.css`; cableado en OrdenTrabajoList + 14 listas de documentos.
- B5 Auth front (`auth.js`, `Login.jsx`, guard en `App.jsx`, rol en Topbar/Sidebar). Demo: `admin@gmparts.com` / `admin123`.
- B6 EnviarSunatButton (stub) en 5 listas de compras; `setEstadoFactura`.

## Fase C — Lógica profunda (front) ✅
- C1 `db.js saveDocument`: al **editar** un documento Venta/Compra, revierte el efecto de stock previo (`reverseStockSideEffects`) y aplica el nuevo (`applyStockSideEffects`) → stock y kardex consistentes ante cambios de ítems/cantidades.
- C2 Conciliación de cuenta por crédito en edición: Crédito→genera cuenta (idempotente); Contado→elimina la cuenta (salvo si ya está "Pagada").

## Fase E — Cierre (front) ✅
- E1 Nota de Venta de Almacén real: `NotaVenta.jsx` (lista) + editor vía `DocumentEditor` (docKey `al-notaventa`, OPERATION "Venta" → aplica Salida de stock). Rutas `/al-nota-venta`, `/al-nota-venta/nuevo`, `/al-nota-venta/:id`. Entrada en Sidebar Almacén.
- E2 Fix `no-dupe-keys vs-orden` en `db.js` SEED_MAP (se eliminó la clave duplicada; comportamiento preservado: `vs-orden` = recepciones).
- E3 QA de paridad: no quedan módulos placeholder activos (solo el componente genérico `Placeholder`, sin rutas). Build + lint OK.

## Fase D — Backend real (Firebase)
El proyecto Firebase (`g-m-parts-lac7fg`) ya está configurado en `src/lib/firebase.js`
(Firestore + Auth exportados). BACKEND_SPEC.md documenta el diseño completo.
Orden de conexión = Sección 6 de BACKEND_SPEC.md (D1→D5).

### BACKEND — Fase D1 — Catálogos simples ✅ confirmado en Console
Capa swappable: `src/store/firestoreDb.js` (`mapDocKeyToCollection`, `addCatalogEntry`,
`deleteCatalogEntry`, `saveDocument`, `getDocuments`) + hook `src/store/useCatalog.js`
(onSnapshot + merge con semillas locales). Panel de prueba: `src/pages/almacen/Catalogos.jsx`
(ruta `/al-catalogos`, entrada en Sidebar Almacén). Formularios conectados a Firestore:
`ArticuloForm.jsx` (marca/grupo/subgrupo/unidad) y `VehiculoForm.jsx` (marca/modelo vehículo).
Repuestos/Insumos NO se conectan (read-only vía Articles, §1.21/1.22).

- [x] `article_brand_marca` (cat-marca) — conectado; crear/leer/eliminar vía Firestore
- [x] `Group` (cat-grupo) — conectado; crear/leer/eliminar vía Firestore
- [x] `subgroup` (cat-subgrupo) — conectado; crear/leer/eliminar vía Firestore (guarda `groupname`)
- [x] `measurement_unit` (cat-unidad) — conectado; crear/leer/eliminar vía Firestore
- [x] `vehicle_marca_brand` (cat-vehmarca) — conectado; crear/leer vía Firestore
- [x] `vehicle_model_modelo` (cat-vehmodelo) — conectado; crear/leer vía Firestore
- [x] `encargados` (cat-encargado) — conectado (colección `encargados`); panel de prueba lista/crea/elimina. Sin formulario consumidor aún (Clientes no tiene UI de encargado, §1.20)
- [x] `npm run build` compila limpio
- [x] `npm run dev` arranca sin errores
- [x] Verificación de escritura real: script de read-back confirma que un doc creado vía `addCatalogEntry` aparece en Firestore (colección `Group`) y se elimina correctamente
- [x] **CONFIRMACIÓN DEL USUARIO en Firebase Console** — usuario confirmó escritura/lectura/eliminación en colección `Group`; pasa a Fase D2.

### BACKEND — Fase D2 — Auth real + maestros ✅ implementado, ⏳ pendiente confirmación de login real + CRUD
Auth real con Firebase Auth (§3.3 BACKEND_SPEC.md): `src/store/auth.js` reemplazado por
`signInWithEmailAndPassword` / `onAuthStateChanged` / `signOut`. Rol leído desde
`users.user_role`. `App.jsx` sincroniza sesión vía `observeAuth`. `Login.jsx` compatible.

Maestros conectados a Firestore real con mapeo de campos a esquema Flutter:
- [x] `users` → Clientes (filtro `user_role == "Cliente"`) — `ClientesList.jsx`
- [x] `Proveedores` → `ProveedoresList.jsx` (mapeo `razon_social`, `dirreccion_fiscal`, `Documento`)
- [x] `personal` → `PersonalList.jsx` (mapeo `nombre`, `Correo_electronico`, `cargo_empleado`)
- [x] `Almacen` → `AlmacenesList.jsx` (mismo nombre de campos, identity)
- [x] `service` → `ServiciosList.jsx` (mapeo `Carroceria` ↔ `Tipo_de_vehiculo`)
- [x] `Vehiculos` → `VehiculosList.jsx` + `VehiculoForm.jsx` (mapeo identity)
- [x] `firestoreDb.js`: helpers genéricos `useFirestoreCollection`, `saveMaestro`, `deleteMaestro`
- [x] `npm run build` compila limpio

Pendiente confirmación del usuario:
- [ ] **CONFIRMACIÓN DEL USUARIO**: Login real con usuario existente en Firebase Auth + crear/editar/eliminar al menos un registro en cualquier maestro y ver en Console.

### BACKEND — Fase D3 — Stock y movimientos reales (Firestore + Algolia) ✅
Stock real sobre `Articles.Stock`, Algolia en selectores de artículos, escritura de
documentos a Firestore con conexión de colecciones `Kardex_element` y `Almacen_movement`.

- [x] **Algolia v5**: `src/lib/algolia.js` usa `liteClient` + `client.search` (v5 API).
  `searchArticles` exportado desde `src/store/firestoreStock.js` — usado en los 6 editores
  (`DocumentEditor`, `ServicioEditor`, `CompraEditor`, `MovimientoForm`, `ValeInsumos`,
  `OrdenTrabajoEditor`) para buscar artículos por nombre/código.
- [x] **Stock real (`Articles.Stock`)**: `updateArticleStockByCode()` en `firestoreStock.js`
  descuenta/aumenta stock atómicamente vía Firestore `runTransaction`. Llamado desde
  `firestoreSaveDocument` (al guardar documento) y `MovimientoForm` (movimiento manual).
- [x] **Documentos guardados a Firestore**: `firestoreSaveDocument()` escribe a colección
  `FacturasVentasCompras`/`Facturas` según `docKey` (mapeo en `mapDocKeyToCollection`).
  Aplica stock (`applyStockToItems`) y crea registros de Kardex + Almacen_movement.
- [x] **Documentos eliminados desde Firestore**: `firestoreDeleteDocument()` elimina el doc
  + revierte stock + elimina entries vinculadas de Kardex_element y Almacen_movement.
- [x] **`Kardex_element`** — conectado a Firestore real:
  - Creación: `createKardexEntries()` en `firestoreStock.js` (`addDoc` a `collection(db, "Kardex_element")`)
  - Lectura: `KardexList.jsx` vía `useFirestoreCollection("Kardex_element")`
  - Eliminación: `deleteKardexEntries()` en `firestoreStock.js`
- [x] **`Almacen_movement`** — conectado a Firestore real:
  - Creación: `createAlmacenMovements()` en `firestoreStock.js` + `MovimientoForm.jsx`
    (`addDoc` / `setDoc` a `collection(db, "Almacen_movement")`)
  - Lectura: `MovimientosList.jsx` vía `useFirestoreCollection("Almacen_movement")`
  - Eliminación: `deleteAlmacenMovements()` en `firestoreStock.js`
- [x] **`Articles_Warehouse`** — implementado con CRUD Firestore real:
  - Página: `src/pages/almacen/ArticulosWarehouseList.jsx` — lista con búsqueda,
    modal de creación/edición con campos `Document_Type`, `Serial_Number`,
    `Register_date`, `Warehouse`, `Observation`, `Article_List` embebido
  - Ruta: `/al-warehouse` — registrada en `App.jsx`
  - Sidebar: entrada "Stock por Almacén" en sección Almacén
  - Usa `useFirestoreCollection("Articles_Warehouse")`, `saveMaestro`, `deleteMaestro`
  - Schema alineado con BACKEND_SPEC.md §1.4
- [x] **Editores migrados a Algolia + Firestore save** (6 editores):
  `DocumentEditor.jsx`, `ServicioEditor.jsx`, `CompraEditor.jsx`,
  `MovimientoForm.jsx`, `ValeInsumos.jsx`, `OrdenTrabajoEditor.jsx`
- [x] **Datalists legacy removidos**: todos los editores ya no usan `articulosSeed.map`
  para datalists — usan Algolia.
- [x] **Tests**: 5 tests unitarios pasando (`stockBlock.test.jsx` + `userFlows.test.jsx`).
  Mocks de `firestoreStock` con `vi.mock` path corregido (`../store/firestoreStock`).
- [x] **`npm run build`** compila limpio
- [x] **Sidebar**: entrada "Stock por Almacén" agregada en Almacén

### BACKEND — Fase D4 — Documentos complejos (cuentasPorCobrar, LastCode, recepciones) ✅
- [x] **LastCode (correlativos atómicos)**: `getNextCorrelative()` en `firestoreStock.js` usa
  `runTransaction` + `increment()` de Firestore para generar números de serie sin colisiones.
  Reemplaza `db.nextDocId()` en todo el flujo de guardado.
- [x] **Cuentas por Cobrar/Pagar**: `createOrUpdateCreditAccount()` en `firestoreStock.js`
  crea/actualiza registro en colección `cuentasPorCobrar` cuando `formaPago === "Credito"`.
  Si se cambia a Contado, elimina la cuenta (salvo Pagada). Subcolección `pagos_CporCobrar`
  lista para registros de pago desde `CuentasCobrar.jsx`.
- [x] **Reconciliación de stock en edición** (Section 3.4): al editar un documento existente,
  `firestoreSaveDocument` revierte el stock/kardex/almacen del documento original antes de
  aplicar los nuevos valores. `articleId` usado para precisión.
- [x] **`firestoreDeleteDocument`**: ahora también elimina la cuenta por cobrar asociada
  (si no está Pagada) al eliminar un documento.
- [x] **Integración en flujo de guardado**: `firestoreSaveDocument` genera correlativo
  automático (`getNextCorrelative`) si el documento no tiene `numero`, y crea la cuenta
  por crédito si aplica.
- [x] **Tests**: 5 tests unitarios pasando.
- [x] **`npm run build`** compila limpio.

### BACKEND — Fase D5 — Cierre de migración ✅
- [x] **onUserDeleted Cloud Function** (`functions/index.js`): se dispara al eliminar un usuario
  en Firebase Auth. Limpia en cascada con `batch.commit()`:
  - **`users/{uid}`**: elimina el documento del usuario
  - **`cuentasPorCobrar`** (donde `clienteid` apunte al usuario): **nullifica** `clienteid`
    y guarda `clienteid_uid` (NO borra — conserva trazabilidad financiera: montos adeudados,
    pagos registrados en subcolección `pagos_CporCobrar`)
  - **`recepciones`** (donde `clienteRef`/`tecnicoservicioRef` apunten): nullifica + guarda uid
  - **`Vehiculos`** (donde `Propietario` apunte): nullifica + guarda uid
  - **`Kardex_element`** (donde `Client` apunte): nullifica + guarda uid
  - **`Articles_Warehouse`** (donde `seller` apunte): nullifica + guarda uid
  - **`Facturas` / `FacturasVentasCompras`**: no se tocan — `Usuario` es String (displayName)
  - **Subcolecciones** (`diagnosticos` bajo `recepciones`, `pagos_CporCobrar` bajo
    `cuentasPorCobrar`): quedan intactas al nullificar el padre (Firestore no las elimina)
- [x] **Firestore rules propuesta** (`firestore.rules.propuesta`, creado en raíz del proyecto):
  reglas por rol (Administrador, Asesor de Servicio, Vendedor, Almacen). Solo autenticados
  pueden leer. Escrituras restringidas por colección y rol. Archivo separado — NO desplegado.
- [x] **`DOC_KEYS_AND_COLLECTIONS.md`**: creado en raíz con la clasificación completa de
  docKeys, colecciones, `tipofactura` y `TipoOperacion` para referencia de desarrolladores.
- [x] **`npm run build`**: compila limpio (1887 modules, 0 errores).
- [x] **`npm test`**: 5/5 tests pasando.

### Inconsistencias detectadas en revisión final (CHECKLIST.md Tandas 1-4 + D1-D5)
- [ ] `al-vale` en `mapDocKeyToCollection` cae a `return docKey` → colección Firestore
      `"al-vale"` nunca se usa (la página usa localStorage). No es bloqueante pero está
      como ruido en el mapeo.
- [ ] Los 5 tests unitarios cubren solo `stockBlock` y `userFlows` — no cubren
      `getNextCorrelative`, `createOrUpdateCreditAccount`, ni reconciliación en edición.
      Cobertura depende de verificación manual en Firebase Console.
- [ ] `ValeInsumos.jsx` sigue escribiendo a localStorage (`db.saveVale`) mientras la
      lectura usa `useStoreCollection` (también localStorage) — consistente con legacy Flutter
      que tampoco tiene persistencia real para vale de insumos.
- [ ] Tanda 5 items A2/D1-D3 (Canje de Nota de Venta) marcados como `[ ]` — fuera de alcance
      acordado, no implementado.
- [ ] Las reglas de seguridad (`firestore.rules.propuesta`) son una propuesta — requieren
      validación contigo antes de desplegar. En particular, los roles mapeados a colecciones
      específicas necesitan confirmación de que coinciden con los flujos reales de trabajo.

### POST-D5 — Canje de Nota de Venta + PDF real
- [x] **Canje de Nota de Venta**: `RegistroNotaVentasList.jsx` — botón "Canjear" (Repeat) ahora
  abre un modal que:
  1. Carga los items de la Nota de Venta original (colección `Facturas`, `tipofactura: "Nota de venta"`)
  2. Permite elegir documento destino: Factura o Boleta
  3. Permite editar cantidades/descripciones/precios antes de confirmar
  4. Al confirmar: genera correlativo con `getNextCorrelative`, crea documento NUEVO en
     colección `Facturas` con `tipofactura` seleccionado, `estado: "Completado"`,
     `origen: { tipo: "notaventa", ref }` y `_docType` correspondiente. Aplica stock vía
     `applyStockToItems` con `articleId`.
  5. La Nota de Venta original NO se modifica (queda intacta)
  6. Campos guardados en ambos formatos (`cliente`/`razonSNombre`, `serie`/`nserie`) para
     compatibilidad con Flutter legacy
- [x] **PDF real via Cloud Function** (`functions/index.js`):
  - HTTP callable `generateDocumentPdf` que recibe `{ collection, docId }`
  - Lee el documento de Firestore, genera PDF con `pdf-lib` (header, campos, tabla items, totales)
  - Sube a Firebase Storage, guarda `pdfUrl` en el documento, devuelve la URL
  - Layout A4 con: logo empresa, tipo documento, datos cabecera, tabla items, subtotal/IGV/total
  - Requiere deploy: `cd functions && npm install && firebase deploy --only functions`
- [x] **Botón Descargar PDF** (`DownloadPdfButton.jsx`): componente reutilizable que abre
  `pdfUrl` existente o llama a `generateDocumentPdf` si no existe. Integrado en
  `DocumentPreviewModal.jsx` (vista de detalle).
- [x] **`npm run build`**: compila limpio (1890 modules, 0 errores).
