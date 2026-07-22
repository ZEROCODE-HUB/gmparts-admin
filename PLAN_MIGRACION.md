# PLAN DE MIGRACIÓN — GM Parts Admin Web

## Flutter → React + Vite + Tailwind + Firebase

---

## 1. INVENTARIO COMPLETO DE PANTALLAS ADMIN

### 1.1 Login / Auth (COMPARTIDA — 5 pantallas)

| # | Nombre Flutter | Ruta Flutter | Propósito | Incluir en React |
|---|---|---|---|---|
| L1 | IniciarSessionWidget | `/iniciar_sesion` | Login con email/contraseña | Sí |
| L2 | RestaurarContrasena1Widget | `/restaurar_contrasena1` | Paso 1: ingresar correo | Sí |
| L3 | RestaurarContrasena2Widget | `/restaurar_contrasena2` | Paso 2: código de verificación | Sí |
| L4 | RestaurarContrasena3Widget | `/restaurar_contrasena3` | Paso 3: nueva contraseña | Sí |
| L5 | ZNuevacontrasenaWidget | `/z_nuevacontrasena` | Cambiar contraseña estando logueado | Sí |
| — | SplashWidget | `/splash` | Pantalla de carga inicial | Sí |
| — | PrivacyWidget | `/privacy` | Políticas de privacidad | No crítica |

### 1.2 Dashboard (1 pantalla)

| # | Nombre Flutter | Ruta Flutter | Colección | Propósito |
|---|---|---|---|---|
| D1 | APcDashboardWidget | `/a_pc_dashboard` | `users`, `diagnosticos` | Tarjetas de resumen, gráficos, accesos rápidos |

### 1.3 Administración — Clientes (3 pantallas + 1 modal)

| # | Nombre Flutter | Ruta Flutter | Colección | Campos del formulario |
|---|---|---|---|---|
| ADM1 | APcRegistroDeClientesWidget | `/a_pc_registro_de_clientes` | `users` | Lista con buscador, editar/eliminar |
| ADM2 | DPcCrearRegistroClienteWidget | `/d_pc_crear_registro_cliente` | `users` | `display_name`, `email`, `phone_number`, `tipo_de_persona` (Natural/Jurídico), `tipo_de_documento` (DNI/RUC/CE), `IdentityDocument` (nº doc), `direccion`, `distrito`, `provincia`, `departamento`, `wsp`, `DNI`, `RUC`, `user_role`, `codigo` |
| ADM3 | DPcEditarRegistroClienteWidget | `/d_pc_editar_registro_cliente` | `users` | Mismos campos que crear (precargados) |
| ADM4 | EliminarClienteWidget | `/eliminar_cliente` | `users` | Confirmación (borrado lógico: estado → inactivo) |

### 1.4 Administración — Proveedores (3 pantallas + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ADM5 | APcRegistroDeProveedoresWidget | `/a_pc_registro_de_proveedores` | `Proveedores` | Lista con buscador, filtro por categoría |
| ADM6 | DPcCrearProveedoresWidget | `/d_pc_crear_proveedores` | `Proveedores` | `nombre`, `Documento` (RUC), `razon_social`, `dirreccion_fiscal`, `correo`, `celular` (int), `website`, `categoria`, `wps`, `provincia`, `distrito`, `departamento`, `create_time`, `item`, `uuid` |
| ADM7 | DPcEditarProvedorWidget | `/d_pc_editar_provedor` | `Proveedores` | Mismos campos (precargados) |
| ADM8 | EliminarProvedoresWidget | `/eliminar_provedores` | `Proveedores` | Confirmación de borrado |

### 1.5 Administración — Personal (3 pantallas + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ADM9 | BPcRegistroDePersonalWidget | `/b_pc_registro_de_personal` | `users` | Lista con buscador, filtro por cargo |
| ADM10 | DPcCrearPersonalWidget | `/d_pc_crear_personal` | `users` | `display_name`, `email`, `DNI`, `phone_number`, `wsp`, `direccion`, `distrito`, `provincia`, `departamento`, `fecha_de_nacimiento`, `edad`, `sexo`, `cargo_personal`, `cargo_empleado`, `user_role` |
| ADM11 | DPcEditaPersonalWidget | `/d_pc_edita_personal` | `users` | Mismos campos (precargados) |
| ADM12 | EliminarPersonalWidget | `/eliminar_personal` | `users` | Confirmación de borrado |

### 1.6 Almacén — Artículos (2 pantallas + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM1 | EPcAlmacenRegistroWidget | `/e_pc_almacen_registro` | `Articles` | Lista con buscador, export CSV |
| ALM2 | DPcCrearArticuloWidget | `/d_pc_crear_articulo` | `Articles` | `Codigo`, `Nombre_name`, `Product_type`, `OEM`, `Codigo_proveedor`, `Marca_brand`, `Unidad_de_medida_Measurement_unit`, `Group_Grupo`, `Subgroup_Subgrupo`, `Garantia_Warranty`, `No_Sere_If_Have_Serial_Nr`, `Stock_minimo_Minimum_Stock`, `Moneda_Currency`, `Precio_compra_Purchase_price`, `Utilidad_Profit_Percentage`, `Precio_Venta_Sale_price`, `Codigo_de_Barras_Bar_Code`, `Imagen_Picture`, `Ubicacion_Location`, `Comentario`, `precioventaconigv`, más 4 precios de fábrica |
| ALM3 | DPcEditarArticuloWidget | `/d_pc_editar_articulo` | `Articles` | Mismos campos (precargados) |
| ALM4 | EliminarArticuloWidget | `/eliminar_articulo` | `Articles` | Confirmación |
| — | Inline create dialogs | (componentes separados) | `article_brand_marca`, `Group`, `subgroup`, `measurement_unit` | Diálogos para crear marca/grupo/subgrupo/unidad sobre la marcha |

### 1.7 Almacén — Almacenes (1 pantalla + modal inline)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM5 | EPcAlmacenGestionWidget | `/e_pc_almacen_gestion` | `Almacen` | `Nombre`, `Direccion`, `Ciudad` |
| ALM6 | EliminarAlmacenWidget | `/eliminar_almacen` | `Almacen` | Confirmación |

### 1.8 Almacén — Movimientos / Ingresos (2 pantallas + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM7 | EPcAlmacenIngresoWidget | `/e_pc_almacen_ingreso` | `Articles_Warehouse` | Lista de movimientos |
| ALM8 | DPcInventarioIngresoCreacionWidget | `/d_pc_inventario_ingreso_creacion` | `Articles_Warehouse` | `Document_Type` (Ingreso/Salida), `Serial_Number`, `Register_date`, `Warehouse` (ref), `Observation`, `Articles` (list ref), `Articale_List` (struct: quantity, descripcion, code, unit, totalPrice, articles ref, pricePerUnit), `seller` (ref) |
| ALM9 | DPcInventarioIngresoEdicionWidget | `/d_pc_inventario_ingreso_edicion` | `Articles_Warehouse` | Mismos campos (precargados) |
| ALM10 | EliminarIngresoalmacnWidget | `/eliminar_ingresoalmacn` | `Articles_Warehouse` | Confirmación |

### 1.9 Almacén — Kardex (1 pantalla)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM11 | EPcAlmacenListaKardexWidget | `/e_pc_almacen_lista_kardex` | `Kardex_element` | Filtros: rango de fechas, almacén, autocomplete. Export CSV |

### 1.10 Almacén — Vale de Insumos (1 pantalla)

| # | Nombre Flutter | Ruta | Colección | Estado |
|---|---|---|---|---|
| ALM12 | EPcAlmacenValeInsumosWidget | `/e_pc_almacen_vale_insumos` | *(placeholder)* | Datos dummy en Flutter también. Pendiente de definir lógica real. |

### 1.11 Almacén — Nota de Venta (1 pantalla)

| # | Nombre Flutter | Ruta | Colección | Estado |
|---|---|---|---|---|
| ALM13 | EPcAlmacenNotaDeVentaWidget | `/e_pc_almacen_nota_de_venta` | *(placeholder)* | Datos dummy en Flutter también. Pendiente. |

### 1.12 Almacén — Vehículos (3 pantallas + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM14 | EPcAlmacenGestinVehculosWidget | `/e_pc_almacen_gestin_vehculos` | `Vehiculos` | Lista con filtros |
| ALM15 | DPcCrearVehiculoWidget | `/d_pc_crear_vehiculo` | `Vehiculos` | `Placa`, `Propietario` (ref), `Propietario_name`, `Propietario_Document`, `Propietario_Type`, `Marca` (string), `Modelo` (string), `Descripcion`, `TipoMotor`, `Almacen` (ref), `Estado`, `anio_de_fabricion`, `Version`, `aniodemodelo`, `Color`, `NroMotor`, `VIN_Serie`, `TipoCombustible`, `Categoria`, `Carroceria`, `SOAT_Expiration`, `ITV_Expiration`, `GNV_Expiration`, `Transmision`, `FormRodante`, `Proveedor` (ref), `Proveedor_document` |
| ALM16 | DPcEditarVehiculoWidget | `/d_pc_editar_vehiculo` | `Vehiculos` | Mismos campos |
| ALM17 | DPcEditarVehiculo1Widget | `/d_pc_editar_vehiculo1` | `Vehiculos` | Variante de edición |
| ALM18 | EliminarVehculosWidget | `/eliminar_vehculos` | `Vehiculos` | Confirmación |

### 1.13 Almacén — Servicios (1 pantalla + 1 modal)

| # | Nombre Flutter | Ruta | Colección | Campos |
|---|---|---|---|---|
| ALM19 | EPcAlmacenServicioWidget | `/e_pc_almacen_servicio` | `service` | CRUD con modales |
| ALM20 | EliminarServicioWidget | `/eliminar_servicio` | `service` | Confirmación |

Campos de `service`: `Codigo`, `Descripcion`, `Precio`, `Note`, `Currency`, `Alert_in_days`, `marcabrand`, `model`, `year`, `Sistema`, `Tipo_de_servicio`, `Categoria_MTC`, `Tipo_de_vehiculo`, `Carroceria`

### 1.14 Ventas — Productos (6 pantallas)

| # | Nombre Flutter | Ruta | Colección | Notas |
|---|---|---|---|---|
| VTA1 | EPcEmisionDeFacturaVentasArticuloWidget | `/e_pc_emision_de_factura_ventas_articulo` | `FacturasVentasCompras` | Emisión de factura para venta de artículos |
| VTA2 | EPcEmisionDeBoletaVentasArticuloWidget | `/e_pc_emision_de_boleta_ventas_articulo` | `FacturasVentasCompras` | Emisión de boleta |
| VTA3 | EPcEmisionDeRemisionWidget | `/e_pc_emision_de_remision` | `FacturasVentasCompras` | Guía de remisión |
| VTA4 | EPcEmisionVentaBoletaWidget | `/e_pc_emision_venta_boleta` | `FacturasVentasCompras` | Otra variante de boleta |
| VTA5 | EPcEmisionVentaFacturaWidget | `/e_pc_emision_venta_factura` | *(dummy)* | Placeholder con datos aleatorios |
| VTA6 | EPcNotadeCreditoWidget | `/e_pc_notade_credito` | `FacturasVentasCompras` | Nota de crédito |

Además el sidebar usa EPcCompraFacturaWidget (mismo widget reutilizado con parámetros `tipoCompra` y `tipoOperacion`) para listar Cotizaciones, Facturas, Boletas de venta.

Campos de `FacturasVentasCompras`: `RazonNombre`, `Nserie`, `Fecha`, `Total`, `FPago`, `Canje`, `Usuario`, `NumCotizacion`, `Estado`, `Items` (lista de `FacturasArticulosStruct`: descripcion, cantidad, precioVenta, total, moneda, precioCompra, codigo, referenceCode, utilidad, stock), `tipofactura`, `proveedor`, `TipoOperacion`, `igv`, `Almacen`, `EstadoFactura`

### 1.15 Ventas — Servicios (5 pantallas)

| # | Nombre Flutter | Ruta | Colección | Notas |
|---|---|---|---|---|
| VTS1 | EPcCotizacionDeSeviciosWidget | `/e_pc_cotizacion_de_sevicios` | `service` | Lista de cotizaciones de servicio |
| VTS2 | EPcOrdenTrabajoWidget | `/e_pc_orden_trabajo` | `Recepciones` | Lista de órdenes de trabajo |
| VTS3 | EPcOrdenTrabajo2Widget | `/e_pc_orden_trabajo2` | `Recepciones` | Variante de OT |
| VTS4 | EPcEmisionDeFacturaTallerWidget | `/e_pc_emision_de_factura_taller` | `Facturas` | Factura de servicios de taller |
| VTS5 | EPcEmisionDeBoletasWidget | `/e_pc_emision_de_boletas` | `Facturas` | Boleta de servicios |
| VTS6 | EPcRegistroDeNotaVentasWidget | `/e_pc_registro_de_nota_ventas` | `Facturas` | Notas de venta |

### 1.16 Compras (13 pantallas)

| # | Nombre Flutter | Ruta | Colección |
|---|---|---|---|
| CMP1 | EPcCompraFacturaWidget (listados) | `/e_pc_compra_factura` | `FacturasVentasCompras` |
| CMP2 | EPcCompraBoletaWidget (listado) | `/e_pc_compra_boleta` | `FacturasVentasCompras` |
| CMP3 | EPcNotadePedidoWidget (listado) | `/e_pc_notade_pedido` | `FacturasVentasCompras` |
| CMP4 | EPcGuiaCompraWidget (listado) | `/e_pc_guia_compra` | `FacturasVentasCompras` |
| CMP5 | EPcOrdenPagoWidget (listado) | `/e_pc_orden_pago` | `FacturasVentasCompras` |
| CMP6 | EPcCrearComprafacturaWidget | `/e_pc_crear_comprafactura` | `FacturasVentasCompras` |
| CMP7 | EPcEditarComprafacturaWidget | `/e_pc_editar_comprafactura` | `FacturasVentasCompras` |
| CMP8 | EPcCrearCompraboletaWidget | `/e_pc_crear_compraboleta` | `FacturasVentasCompras` |
| CMP9 | EPcEditarCompraboletaWidget | `/e_pc_editar_compraboleta` | `FacturasVentasCompras` |
| CMP10 | EPcCrearCompraNotaPedidoWidget | `/e_pc_crear_compra_nota_pedido` | `FacturasVentasCompras` |
| CMP11 | EPcEditarCompraNotadePedidoWidget | `/e_pc_editar_compra_notade_pedido` | `FacturasVentasCompras` |
| CMP12 | EPcCrearCompraGuiaWidget | `/e_pc_crear_compra_guia` | `FacturasVentasCompras` |
| CMP13 | EPcEditarCompraGuiaWidget | `/e_pc_editar_compra_guia` | `FacturasVentasCompras` |

### 1.17 Cobranza (2 pantallas)

| # | Nombre Flutter | Ruta | Colección |
|---|---|---|---|
| COB1 | EPcCuetasporCobrarWidget | `/e_pc_cuetaspor_cobrar` (con `tipoCuenta=Cobrar`) | `cuentasPorCobrar` |
| COB2 | EPcCuetasporpagarWidget | `/e_pc_cuetaspor_cobrar` (con `tipoCuenta=Pagar`) | `cuentasPorCobrar` |

Campos de `cuentasPorCobrar`: `montoTotal`, `saldoPendiente`, `estado`, `fecha`, `numeroCotizacion`, `tipoDocumento`, `pagoTotalActual`, `clienteid` (ref), `clientenombre`, `fechaCreacion`, `tipoCuenta`, `proveedorid` (ref)
Subcolección: `pagos_CporCobrar` (fecha, usuario, montopagado, montopendiente, numerocuenta, metodopago, estado)

### 1.18 Reportes (2 pantallas)

| # | Nombre Flutter | Ruta | Colección |
|---|---|---|---|
| REP1 | EPcReporteDeVentasWidget | `/e_pc_reporte_de_ventas` | `FacturasVentasCompras` |
| REP2 | EPcReporteDocumentosElectWidget | `/e_pc_reporte_documentos_elect` | `FacturasVentasCompras` |

---

## 2. MAPEO: PREVIEW REACT → PANTALLAS FLUTTER

### 2.1 Equivalencias directas (ya existen en preview)

| Preview React (App.jsx) | Flutter equivalente | Estado |
|---|---|---|
| `Login` | IniciarSessionWidget | Esqueleto listo, faltan campos reales y conexión Auth |
| `Dashboard` | APcDashboardWidget | Esqueleto listo, faltan datos reales y KPIs |
| `ClientesView` | APcRegistroDeClientesWidget | Esqueleto listo, faltan campos reales del formulario |
| `ProveedoresView` | APcRegistroDeProveedoresWidget | Esqueleto listo, faltan campos reales |
| `PersonalView` | BPcRegistroDePersonalWidget | Esqueleto listo, faltan campos reales |
| `VehiculosView` | EPcAlmacenGestinVehculosWidget | Esqueleto listo, faltan ~20 campos del formulario real |
| `AlmacenesView` | EPcAlmacenGestionWidget | Esqueleto listo, faltan campos |
| `ServiciosCatalogoView` | EPcAlmacenServicioWidget | Esqueleto listo, faltan ~10 campos reales |
| `ArticulosView` | EPcAlmacenRegistroWidget | Esqueleto listo, faltan ~20 campos reales |
| `KardexView` | EPcAlmacenListaKardexWidget | Esqueleto listo, faltan filtros y export |
| `MovimientosView` | EPcAlmacenIngresoWidget | Esqueleto listo, falta estructura real del formulario |
| `DocListView` / `DocumentEditor` | (múltiples: EPcCompraFacturaWidget, etc.) | Esqueleto listo, pero la versión Flutter tiene pantallas separadas por tipoDoc + tipoOp |
| `ServiceQuotesView` | EPcCotizacionDeSeviciosWidget | Esqueleto listo |
| `WorkOrdersView` | EPcOrdenTrabajoWidget/2 | Esqueleto listo |
| `ServiceEmisionView` | EPcEmisionDeFacturaTallerWidget (y similares) | Esqueleto listo |
| `CobranzaView` | EPcCuetasporCobrarWidget | Esqueleto listo, faltan subcolección de pagos |
| `ReportesView` | EPcReporteDeVentasWidget / EPcReporteDocumentosElectWidget | Esqueleto listo, faltan filtros reales |

### 2.2 Pantallas SIN equivalente en preview (hay que crearlas)

| Flutter | Motivo |
|---|---|
| DPcCrearRegistroClienteWidget / DPcEditarRegistroClienteWidget | Preview usa `GenericFormModal` genérico; los formularios reales son más complejos con validaciones, tipos de persona, ubicación anidada, etc. |
| DPcCrearProveedoresWidget / DPcEditarProvedorWidget | Idem: preview usa GenericFormModal |
| DPcCrearPersonalWidget / DPcEditaPersonalWidget | Idem |
| DPcCrearArticuloWidget / DPcEditarArticuloWidget | Preview usa GenericFormModal; faltan decenas de campos, inline creation de marca/grupo/subgrupo/unidad |
| DPcCrearVehiculoWidget / DPcEditarVehiculoWidget | Preview tiene modal simple; faltan ~20 campos |
| DPcInventarioIngresoCreacionWidget / DPcInventarioIngresoEdicionWidget | Preview tiene modal genérico; falta estructura con artículos picker + cantidades + warehouse |
| EPcAlmacenValeInsumosWidget | No existe en preview |
| EPcAlmacenNotaDeVentaWidget | No existe en preview |
| EPcCrearComprafacturaWidget / Editar (y similares) | Preview usa DocumentEditor genérico; cada tipo necesita su propia pantalla |
| EPcOrdenPagoWidget | No existe en preview |
| Eliminar*Widget (9 modales) | Preview tiene delete inline en tabla; Flutter tiene modales de confirmación aparte |

---

## 3. ESTRUCTURA DE CARPETAS PROPUESTA

```
src/
├── main.jsx                    # Entry point
├── index.css                   # Tailwind import + estilos globales
├── App.jsx                     # Router + Layout (sidebar + topbar)
│
├── lib/
│   ├── firebase.js             # Config Firebase (YA EXISTE, no modificar)
│   └── utils.js                # Helpers: formateo, fecha, moneda
│
├── mock/
│   ├── seed.clientes.js        # Datos simulados con forma real
│   ├── seed.proveedores.js
│   ├── seed.personal.js
│   ├── seed.vehiculos.js
│   ├── seed.articulos.js
│   ├── seed.almacenes.js
│   ├── seed.servicios.js
│   ├── seed.facturas.js
│   ├── seed.cobranza.js
│   ├── seed.kardex.js
│   └── seed.reportes.js
│
├── components/
│   ├── ui/                     # Primitivos UI (del preview)
│   │   ├── Badge.jsx
│   │   ├── Btn.jsx
│   │   ├── IconBtn.jsx
│   │   ├── Field.jsx
│   │   ├── Modal.jsx
│   │   ├── Toolbar.jsx
│   │   ├── SearchBox.jsx
│   │   ├── Table.jsx
│   │   └── Td.jsx
│   │
│   ├── layout/
│   │   ├── Sidebar.jsx         # Nav con acordeones
│   │   ├── Topbar.jsx          # Barra superior
│   │   └── Login.jsx           # Pantalla de login
│   │
│   ├── shared/
│   │   ├── ArticlePicker.jsx   # Selector de artículos (reusable)
│   │   ├── GenericFormModal.jsx
│   │   ├── PartnerSelect.jsx   # Selector cliente/proveedor
│   │   └── DeleteConfirm.jsx   # Modal de confirmación de borrado
│   │
│   └── documents/
│       ├── DocumentEditor.jsx  # Editor genérico de documentos
│       └── LineItemTable.jsx   # Tabla de ítems con subtotal/IGV/total
│
├── pages/
│   ├── Dashboard.jsx
│   │
│   ├── administracion/
│   │   ├── ClientesList.jsx
│   │   ├── ClienteForm.jsx     # Crear + Editar (reutilizable)
│   │   ├── ProveedoresList.jsx
│   │   ├── ProveedorForm.jsx
│   │   ├── PersonalList.jsx
│   │   └── PersonalForm.jsx
│   │
│   ├── almacen/
│   │   ├── ArticulosList.jsx
│   │   ├── ArticuloForm.jsx
│   │   ├── AlmacenesList.jsx
│   │   ├── MovimientosList.jsx
│   │   ├── MovimientoForm.jsx
│   │   ├── KardexList.jsx
│   │   ├── VehiculosList.jsx
│   │   ├── VehiculoForm.jsx
│   │   ├── ServiciosList.jsx
│   │   ├── ValeInsumos.jsx
│   │   └── NotaVenta.jsx
│   │
│   ├── ventas/
│   │   ├── articulos/
│   │   │   ├── CotizacionesList.jsx
│   │   │   ├── FacturaList.jsx
│   │   │   ├── FacturaForm.jsx
│   │   │   ├── BoletaList.jsx
│   │   │   ├── BoletaForm.jsx
│   │   │   ├── GuiaRemisionList.jsx
│   │   │   ├── GuiaRemisionForm.jsx
│   │   │   └── NotaCreditoList.jsx
│   │   └── servicios/
│   │       ├── CotizacionServicioList.jsx
│   │       ├── OrdenTrabajoList.jsx
│   │       ├── FacturaTallerList.jsx
│   │       ├── FacturaTallerForm.jsx
│   │       ├── BoletaServicioList.jsx
│   │       └── NotaVentaServicioList.jsx
│   │
│   ├── compras/
│   │   ├── FacturaList.jsx
│   │   ├── FacturaForm.jsx
│   │   ├── BoletaList.jsx
│   │   ├── BoletaForm.jsx
│   │   ├── NotaPedidoList.jsx
│   │   ├── NotaPedidoForm.jsx
│   │   ├── GuiaList.jsx
│   │   ├── GuiaForm.jsx
│   │   ├── OrdenCompraList.jsx
│   │   └── OrdenPagoList.jsx
│   │
│   ├── cobranza/
│   │   ├── CuentasCobrar.jsx
│   │   └── CuentasPagar.jsx
│   │
│   └── reportes/
│       ├── ReporteVentas.jsx
│       └── ReporteDocElect.jsx
│
└── hooks/
    ├── useCrud.js              # Hook genérico CRUD con estado local
    ├── useAuth.js              # Hook de autenticación
    └── useFirestore.js         # Hook para queries Firestore (para después)
```

---

## 4. BLOQUES DE GENERACIÓN DE CÓDIGO

Cada bloque es autónomo y genera un conjunto completo de componentes que pueden probarse de inmediato.

### Bloque A — Infraestructura base (Login + Layout + UI primitives)
**Archivos:** `App.jsx`, `Login.jsx`, `Sidebar.jsx`, `Topbar.jsx`, `main.jsx`, `index.css` + todos los `ui/*` components
**Mock:** Ninguno (layout puro)
**Estimado:** ~500 líneas

### Bloque B — Administración (Clientes + Proveedores + Personal)
**Archivos:** `clientes/*`, `proveedores/*`, `personal/*`, `DeleteConfirm.jsx`, `PartnerSelect.jsx`
**Mock:** `seed.clientes.js`, `seed.proveedores.js`, `seed.personal.js`
**Estimado:** ~1200 líneas (3 listas + 3 formularios completos con campos reales de Firestore)

### Bloque C — Dashboard
**Archivos:** `Dashboard.jsx`
**Mock:** `seed.dashboard.js` (si se separa)
**Estimado:** ~300 líneas

### Bloque D — Almacén: Artículos + Almacenes
**Archivos:** `articulos/*`, `almacenes/*`, `ArticlePicker.jsx`
**Mock:** `seed.articulos.js`, `seed.almacenes.js`
**Inline creation:** Marcas, grupos, subgrupos, unidades de medida
**Estimado:** ~800 líneas

### Bloque E — Almacén: Vehículos + Servicios + Movimientos + Kardex
**Archivos:** `vehiculos/*`, `servicios/*`, `movimientos/*`, `kardex/*`, `vale-insumos/*`, `nota-venta/*`
**Mock:** `seed.vehiculos.js`, `seed.servicios.js`, `seed.kardex.js`
**Estimado:** ~1500 líneas

### Bloque F — Ventas Artículos (Listados + Emisión)
**Archivos:** `ventas/articulos/*`, `documents/DocumentEditor.jsx`, `documents/LineItemTable.jsx`
**Mock:** `seed.facturas.js`
**Estimado:** ~1000 líneas

### Bloque G — Ventas Servicio + Órdenes de Trabajo
**Archivos:** `ventas/servicios/*`
**Mock:** Datos de servicio y recepciones
**Estimado:** ~800 líneas

### Bloque H — Compras (Listados + Creación/Edición por tipo)
**Archivos:** `compras/*`
**Mock:** Mismo seed de facturas
**Estimado:** ~1200 líneas

### Bloque I — Cobranza + Reportes
**Archivos:** `cobranza/*`, `reportes/*`
**Mock:** `seed.cobranza.js`, `seed.reportes.js`
**Estimado:** ~600 líneas

---

## 5. PLAN DE EJECUCIÓN

```
Fase 1 (Bloque A):  Layout base + UI primitives + Login
Fase 2 (Bloque B):  Administración — CRUD completo de Clientes/Proveedores/Personal
Fase 3 (Bloque C):  Dashboard con KPIs y gráficos
Fase 4 (Bloque D):  Artículos + Almacenes
Fase 5 (Bloque E):  Vehículos + Servicios + Movimientos + Kardex
Fase 6 (Bloque F):  Ventas Artículos
Fase 7 (Bloque G):  Ventas Servicio + Órdenes de Trabajo
Fase 8 (Bloque H):  Compras
Fase 9 (Bloque I):  Cobranza + Reportes
```

**Estrategia:** Cada fase:
1. Puede ser aprobada/revisada antes de pasar a la siguiente
2. Se desarrolla con datos mock con la forma real de Firestore
3. Al final de cada fase, la app sigue funcionando (navegación completa entre fases)
4. Fases independientes: podrían trabajarse en paralelo si se requiere

---

## 6. COLECCIONES FIRESTORE (resumen)

| Colección | Registros por documento | Módulos que la usan |
|---|---|---|
| `users` | ~23 campos | Clientes, Personal, Auth |
| `Proveedores` | ~16 campos | Proveedores |
| `Articles` | ~27 campos | Almacén, Ventas, Compras |
| `Articles_Warehouse` | ~8 campos + struct lista | Movimientos |
| `Almacen` | ~5 campos | Almacenes |
| `Kardex_element` | ~18 campos | Kardex |
| `Vehiculos` | ~27 campos | Vehículos |
| `service` | ~14 campos | Servicios |
| `FacturasVentasCompras` | ~16 campos + struct items | Ventas, Compras |
| `cuentasPorCobrar` | ~12 campos | Cobranza |
| `pagos_CporCobrar` (sub) | ~8 campos | Cobranza (pagos) |
| `Recepciones` | ~53 campos | Ventas Servicio, Órdenes Trabajo |
| `diagnosticos` (sub) | ~21 campos + struct | Diagnóstico taller |
| `Group` | 1 campo | Artículos (grupo) |
| `subgroup` | 3 campos | Artículos (subgrupo) |
| `article_brand_marca` | 1 campo | Artículos (marca) |
| `measurement_unit` | 1 campo | Artículos (unidad) |
| `vehicle_marca_brand` | 1 campo | Vehículos (marca) |
| `vehicle_model_modelo` | 3 campos | Vehículos (modelo) |
| `LastCode` | 4 campos | Correlativos |
| `Almacen_movement` | 4 campos | Movimientos alterno |
| `Encargados` | 4 campos | Recepciones |

---

## 7. OBSERVACIONES CRÍTICAS

1. **El preview React NO tiene rutas (React Router).** La navegación es state-based (`view` state). Decidir: ¿mantener state-based como el preview, o migrar a React Router desde ahora?

2. **El preview usa `GenericFormModal`** para crear/editar todo. Los formularios reales de Flutter son mucho más específicos y tienen validaciones, ubicación anidada (dep/prov/dist), creación inline de referencias (marcas, grupos). Cada formulario real necesita su propio componente.

3. **Pantallas "líst" y pantallas "formulario" están separadas en Flutter** (Create ≠ Edit ≠ List), mientras que el preview las mezcla (modal inline en la misma página). Decidir qué patrón seguir.

4. **Datos mock deben reflejar EXACTAMENTE la estructura Firestore**, con los mismos nombres de campo, tipos y defaults. Esto asegura que el reemplazo por queries reales sea mecánico.

5. **Hay pantallas placeholder en Flutter** (ValeInsumos, NotaVenta, EPcEmisionVentaFactura) que también usan datos dummy. Se pueden migrar igual o marcarlas como "pendiente de definición".

6. **La lógica de stock** (actualizar stock al crear/editar facturas) está en las acciones personalizadas de Flutter. Esa lógica se implementará cuando conectemos el backend, no en esta ronda.

---

*Documento generado el 19/07/2026*
