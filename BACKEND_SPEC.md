# BACKEND_SPEC.md — Especificación de conexión real a Firebase

> **Propósito:** Este documento es la ÚNICA fuente de instrucción para construir la conexión real
> a Firebase (Firestore + Auth + Algolia + Cloud Functions) en la siguiente fase del proyecto
> `gmparts-admin-web` (React). Hasta que se apruebe su construcción, **no se conecta nada**; es
> solo especificación.
>
> **Fuente de verdad:** `D:\Zerocode\PROYECTOS\GMPARTS-ADMIN-LEGACY` (Flutter + Firebase).
> Cada afirmación importante cita `archivo:línea` de Dart/JS.
>
> **Estado actual del React:** toda la app usa `localStorage` vía `src/store/db.js`. El plan es
> una capa swappable (Sección 3) para que Firebase reemplace el mock sin tocar las ~90 pantallas.

---

## 0. Investigación Algolia (duda específica del usuario)

**Pregunta:** ¿El buscador de Artículos (y otros buscadores) hace llamadas a Algolia o queries
directas de Firestore?

**Respuesta:** Algolia se usa **exclusivamente** para buscar **artículos** (índice `'Articles'`),
vía la extensión Firebase→Algolia sobre la colección `Articles`. **Ningún otro buscador** de la app
usa Algolia; clientes, proveedores, vehículos, etc. usan queries directas de Firestore.

**Mecanismo (Dart):**
- Cliente Algolia: `lib/backend/algolia/algolia_manager.dart:10-11` (App ID `0CXWHIXYJC`, API key `11c6e86aadf789c9f1067a197da0a3e6`).
- Query genérica: `lib/backend/algolia/algolia_manager.dart:43-85` (`algolia.index(index).search(...)`, con caché).
- Mapeo de resultados: `lib/backend/schema/articles_record.dart:316-325` (`FFAlgoliaManager.instance.algoliaQuery(index: 'Articles', term: ...)` → `fromAlgolia` → `ArticlesRecord`).
- Patrón de espera en cada selector: `algoliaRequestCompleter` / `waitForAlgoliaRequestCompleted` (p.ej. `lib/components/elegir_articulos_model.dart:29,41`).

**Pantallas EXACTAS que usan Algolia (índice `'Articles'`):**
| Pantalla (Flutter) | Archivo | Línea |
|---|---|---|
| Elegir Artículos (facturas venta) | `lib/components/elegir_articulos_widget.dart` | 47, 65 |
| Elegir Artículos (copia) | `lib/components/elegir_articulos_copy_widget.dart` | 48, 66 |
| Elegir Repuesto arreglado | `lib/elegir_insumos_repuestos/elegir_rep_arreglado/elegir_rep_arreglado_widget.dart` | 210, 254 |
| Elegir Repuesto cotización/factura | `lib/elegir_insumos_repuestos/elegir_repuesto_cotizacion_factura/elegir_repuesto_cotizacion_factura_widget.dart` | 62, 160 |
| Elegir Repuestos cotización | `lib/elegir_insumos_repuestos/elegir_repuestos_cotizacion/elegir_repuestos_cotizacion_widget.dart` | 62, 153 |
| Elegir Insumos | `lib/elegir_insumos_repuestos/elegir_insumos/elegir_insumos_widget.dart` | 69, 270 |
| Elegir Insumos (copia) | `lib/elegir_insumos_repuestos/elegir_insumos_copy/elegir_insumos_copy_widget.dart` | 60, 149 |
| Registro almacén (web) | `lib/web/almacen/e_pc_almacen_registro/e_pc_almacen_registro_widget.dart` | 248, 827 |

**Conclusión para React:** el buscador de artículos en `DocumentEditor`, `CompraEditor`,
`ServicioEditor`, `ValeInsumos`, `MovimientoForm` e `InlineCreateDialogs` debe consultar
`src/lib/algolia.js` (`articlesIndex.search(term)`), NO Firestore. El resto de búsquedas queda en Firestore.
`src/lib/algolia.js` ya está configurado (App ID `0CXWHIXYJC`, índice `Articles`, misma API key que
`algolia_manager.dart:11`).

---

## 1. Mapeo de colecciones

> Convenciones: **Clave** = nombre del campo en Firestore (cita `// "Clave" field.` en el `_record.dart`).
> **Tipo** = tipo Dart antes de `?` (todos los campos son nullable con default; ver Patrón arriba).
> **Ref** = `DocumentReference` a otra colección. **Req (UI)** = campo que la app trata como obligatorio
> aunque el esquema lo permita nulo. **Pantallas React** = dónde se consume ya en `gmparts-admin-web`.

### 1.1 users — `lib/backend/schema/users_record.dart` (collection() línea 159)
Clave → Tipo (Req UI) — línea
- `email` : String — 18 · `display_name` : String — 23 · `photo_url` : String — 28 · `uid` : String (Req) — 33
- `created_time` : DateTime — 38 · `phone_number` : String — 43 · `tipo_de_persona` : String — 48
- `user_role` : String (Req) — 53 · `IdentityDocument` : String — 58 · `direccion` : String — 63
- `distrito` : String — 68 · `provincia` : String — 73 · `codigo` : String — 78
- `fecha_de_nacimiento` : DateTime — 83 · `sexo` : String — 88 · `tipo_de_documento` : String — 93
- `edad` : String — 98 · `cargo_personal` : String — 103 · `cargo_empleado` : String — 108
- `wsp` : String — 113 · `departamento` : String — 118 · `DNI` : String — 123 · `RUC` : String — 128
- **Subcolecciones:** ninguna.
- **Nota:** colección unificada de personas. En React se lee filtrada por `user_role`:
  - `user_role == "Cliente"` → **ClientesList** (`src/pages/administracion/ClientesList.jsx`).
  - `user_role in ['Asesor Servicio','Asesor Repuesto','Jefe de Taller','Administrador','Gerente General','Tecnico Mecanico']` → **PersonalList** (`src/pages/administracion/PersonalList.jsx`).
    Verificado: `b_pc_registro_de_personal_widget.dart:85-87` usa `whereIn('user_role', [...])` con esos 6 valores;
    `d_pc_crear_personal_widget.dart:2229-2240` escribe `user_role = cargoEmpleado` en el mismo doc `users`.
    Durante edición (`d_pc_edita_personal_widget.dart:2227-2259`) NO se re-seteará `user_role`, solo `cargo_empleado`.
  - También es la identidad de auth (ver Sección 5).

### 1.2 Proveedores — `lib/backend/schema/proveedores_record.dart` (collection() línea 117)
- `nombre` : String (Req) — 18 · `Documento` : String — 23 · `razon_social` : String — 28
- `dirreccion_fiscal` : String — 33 · `correo` : String — 38 · `celular` : int — 43
- `create_time` : DateTime — 48 · `item` : int — 53 · `ruc` : String (Req) — 58
- `website` : String — 63 · `categoria` : String — 68 · `wps` : String — 73
- `provincia`/`distrito`/`departamento` : String — 78/83/88 · `uuid` : String — 93
- **React:** **ProveedoresList** (`src/pages/administracion/ProveedoresList.jsx`).

### 1.3 Articles — `lib/backend/schema/articles_record.dart` (collection() línea 208)
- `Codigo` : String (Req) — 20 · `Product_type` : String — 25 · `OEM` : String — 30
- `Codigo_proveedor` : String — 35 · `Nombre_name` : String (Req) — 40 · `Marca_brand` : String — 45
- `Unidad_de_medida_Measurement_unit` : String — 50 · `Group_Grupo` : String — 57 · `Subgroup_Subgrupo` : String — 62
- `Garantia_Warranty` : String — 67 · `No_Sere_If_Have_Serial_Nr` : String — 72
- `Stock_minimo_Minimum_Stock` : int (Req) — 77 · `Moneda_Currency` : String — 82
- `Precio_compra_Purchase_price` : double — 87 · `Utilidad_Profit_Percentage` : double — 92
- `Precio_Venta_Sale_price` : double (Req) — 97 · `Codigo_de_Barras_Bar_Code` : String — 102
- `Imagen_Picture` : String — 107 · `Ubicacion_Location` : String — 112 · `Comentario` : String — 117
- `Precio_Fabrica_P1_FactoryPriceP1` : double — 122 · `Precio_Fabrica_P2_FactoryPriceP2` : double — 129
- `Precio_Fabrica_P3_FactoryPriceP3` : double — 136 · `Precio_Fabrica_PvtaM_FactoryPricePvtaM` : double — 143
- `Fecha_de_Creacion_Created_Date` : DateTime — 150 · **`Stock` : int (Req)** — 155 · `precioventaconigv` : double — 160
- **Nota crítica (stock):** el stock vivo es el campo `Stock` (int). Los `custom_code` de Flutter
  SOLO leen/escriben `Stock` (`actualizar_stock_solo_nuevos.dart:85,94,97`; `_almacen.dart:45,54,82`;
  `desde_listas.dart:125,134,137`; `desde_listas_ventas.dart:108,116,119`). La integración React debe
  escribir `Articles.Stock` (no `precioventaconigv` ni precios fábrica).
- **React:** **ArticulosList / ArticuloForm** (`src/pages/almacen/ArticulosList.jsx`) + todos los selectores
  de artículos (ver Sección 0, vía Algolia).

### 1.4 Articles_Warehouse — `lib/backend/schema/articles_warehouse_record.dart` (collection() línea 72)
- `Document_Type` : String — 18 · `Serial_Number` : String — 23 · `Register_date` : DateTime — 28
- **`Warehouse` : DocumentReference → Almacen** — 33 · `Observation` : String — 38
- **`Articles` : List<DocumentReference> → Articles** — 43
- `Articale_List` : List<ArticlesWarehouseStruct> (embebido) — 48; campos: `Quantity`(int), `Descripcin`(String),
  `Code`(String), `unit`(String), `TotalPrice`(double), `Articles`(ref→Articles), `PricePerUnit`(double).
- **`seller` : DocumentReference → users** — 53
- **React:** aún NO modelado por separado; el stock agregado vive en `Articles.Stock`. Mapear en una fase
  posterior (el movimiento por almacén ya se registra vía `Almacen_movement` + `Kardex_element`).

### 1.5 Almacen — `lib/backend/schema/almacen_record.dart` (collection() línea 51)
- `Nombre` : String (Req) — 18 · `Direccion` : String — 23 · `Ciudad` : String — 28
- `Vehiculos` : List<DocumentReference> → Vehiculos — 33 · `Created_Date` : DateTime — 38
- **React:** **AlmacenesList** (`src/pages/almacen/AlmacenesList.jsx`). El valor `Nombre` es el que usan los
  editores en el campo `almacen` (p.ej. `DocumentEditor.jsx:381` opciones `w.Nombre`).

### 1.6 Kardex_element — `lib/backend/schema/kardex_element_record.dart` (collection() línea 129)
- **`Article` : DocumentReference → Articles** — 18 · `Document_Type` : String — 23 · `Date` : DateTime — 28
- **`Client` : DocumentReference → users** — 33 · **`Provider` : DocumentReference → Proveedores** — 38
- `Quantity` : double — 43 · `Description` : String — 48 · `Code_Id` : String — 53 · `Unit` : String — 58
- `Total_Price` : double — 63 · `PricePerUnit` : double — 68 · **`Warehouse` : DocumentReference → Almacen** — 73
- `OEM` : String — 78 · `type` : String — 83 · `Document_Number` : int — 88
- `clientname`/`providername` : String (desnormalizados) — 93/98 · `datestring` : String — 103
- **React:** **KardexList** (`src/pages/almacen/KardexList.jsx`).

### 1.7 Vehiculos — `lib/backend/schema/vehiculos_record.dart` (collection() línea 183)
- `Placa` : String (Req) — 18 · **`Propietario` : DocumentReference → users** — 23 · `Marca` : String — 28
- `Modelo` : String — 33 · `Descripcion` : String — 38 · `TipoMotor` : String — 43
- **`Almacen` : DocumentReference → Almacen** — 48 · `Estado` : String — 53 · `anio_de_fabricion` : String — 58
- `Propietario_name`/`Propietario_Document`/`Propietario_Type` : String (desnorm.) — 63/68/73
- **`Proveedor` : DocumentReference → Proveedores** — 78 · `Proveedor_document` : String — 83
- `Version`/`aniodemodelo`/`Color`/`NroMotor`/`VIN_Serie`/`TipoCombustible`/`Categoria`/`Carroceria` : String
- `SOAT_Expiration`/`ITV_Expiration`/`GNV_Expiration` : DateTime — 128/133/138
- `Transmision`/`FormRodante` : String — 143/148
- **React:** **VehiculosList / VehiculoForm** (`src/pages/almacen/VehiculosList.jsx`).

### 1.8 service — `lib/backend/schema/service_record.dart` (collection() línea 105)
- `Codigo` : String (Req) — 18 · `Descripcion` : String (Req) — 23 · `Precio` : double (Req) — 28
- `Note` : String — 33 · `Currency` : String — 38 · `Alert_in_days` : String — 43
- `marcabrand`/`model`/`year` : String — 48/53/58 · `Sistema` : String — 63
- `Tipo_de_servicio` : String — 68 · `Categoria_MTC` : String — 73 · `Tipo_de_vehiculo` : String — 78
- `Carroceria` : String — 83
- **React:** **ServiciosList** (`src/pages/almacen/ServiciosList.jsx`) — catálogo de servicios.

### 1.9 FacturasVentasCompras — `lib/backend/schema/facturas_ventas_compras_record.dart` (collection() línea 120)
Documento (campos de cabecera):
- `RazonNombre` : String (Req) — 18 · `Nserie` : String — 23 · `Fecha` : DateTime — 28 · `Total` : double (Req) — 33
- `FPago` : String — 38 · `Canje` : String — 43 · `Usuario` : String — 48 · `NumCotizacion` : String — 53
- `Estado` : String — 58 · **`Items` : List<FacturasArticulosStruct>** — 63 · `tipofactura` : String (Req, discriminator) — 68
- `proveedor` : String — 73 · `TipoOperacion` : String ("Venta"/"Compra") — 78 · `igv` : String — 83
- `Almacen` : String — 88 · `EstadoFactura` : String — 93
- **Line-item `FacturasArticulosStruct`** (`lib/backend/schema/structs/facturas_articulos_struct.dart`):
  `Descripcion`(34), `Cantidad`(int,41), `PrecioVenta`(double,50), `Total`(double,60), `Moneda`(69),
  `PrecioCompra`(double,76), `Codigo`(86), **`referenceCode` : DocumentReference → Articles**(93, `collectionNamePath:['Articles']` 235),
  `utilidad`(double,100), `stock`(int,109).
- **React (mapeo crítico — CORREGIDO 2026-07-20, verificado en código de ESCRITURA, no solo esquema):** NO es
  una colección única. El flujo activo de Flutter escribe en **dos** colecciones distintas según el módulo de negocio:
  - **`FacturasVentasCompras`** ← docKeys de **VENTA DE PRODUCTOS (`va-*`) y TODAS LAS COMPRAS (`c-*`)**.
    - Ventas productos: `components/crearfactura_articulos_widget.dart:128` (`createFacturasVentasComprasRecordData`),
      lanzado desde `web/ventas_productos/e_pc_emision_de_factura_ventas_articulo_widget.dart:472` y
      `.../e_pc_emision_de_boleta_ventas_articulo_widget.dart:472`.
    - Compras: `components/crearfactura_compra_widget.dart:638,683,1037,1080` y
      `components/crearfactura_compra_copy_widget.dart:469`; lanzado desde
      `web/e_pc_compra_factura_widget.dart:470`, `web/compras/e_pc_compra_boleta_widget.dart:313`,
      `web/almacen/e_pc_notade_pedido_widget.dart:313`. Edición: `components/editarfactura_compra_widget.dart:378`.
    - ⇒ React docKeys → `FacturasVentasCompras`: `va-factura, va-boleta, va-cotizacion, va-guia, va-notacredito,
      c-factura, c-boleta, c-notas, c-guia, c-orden, al-notaventa`.
  - **`Facturas`** ← docKeys de **VENTA DE SERVICIOS (`vs-*`)**, NOTA DE VENTA y CANJE.
    - Servicios: `components/crearfactura_widget.dart:984` (`FacturasRecord.collection.doc().set` +
      `createFacturasRecordData`), lanzado desde `web/ventas_servicios/e_pc_emision_de_factura_taller_widget.dart:563`
      y `.../e_pc_emision_de_boletas_widget.dart:564`.
    - Canje nota venta: `components/canjearnotaventa_widget.dart:99` (crea `Facturas`), lanzado desde
      `web/ventas_servicios/e_pc_registro_de_nota_ventas_widget.dart:1586`; el alta de la nota de venta en sí se
      lanza desde `.../e_pc_registro_de_nota_ventas_widget.dart:463` (`CrearfacturaWidget`).
    - ⇒ React docKeys → `Facturas`: `vs-factura, vs-boleta, vs-cotizacion, vs-orden, vs-notas`.
  - **Puente de campos (ambas colecciones):** `docKey` → `tipofactura` (discriminador: "Factura", "Boleta",
    "Cotizacion", "Guia", "NotaCredito", "NotaVenta", "Orden de Servicio" / compras: "Factura Compra",
    "Boleta Compra", "Nota Pedido", "Guia Compra", "Orden de Pago"); `TipoOperacion` = "Venta"|"Compra"
    (ver `OPERATION` en `db.js:49-52`); `proveedor` solo en compras; `Items[].referenceCode` → doc `Articles`
    (clave de conciliación de stock).
  - **Caso especial `vs-orden`** (Orden de Servicio): en React es docKey de ventas servicios, pero en Flutter la
    ORDEN en sí se registra en `recepciones` (ver 1.11) y solo al FACTURAR se crea el doc en `Facturas`
    (`editarfactura`/`canjear` → `Facturas`). Mantener `vs-orden` apuntando a `Facturas`, pero la cabecera de la
    recepción vive en `recepciones`; no confundir con guardar la orden completa en `Facturas`.
- **React:** todas las listas de `src/pages/ventas/*`, `src/pages/compras/*`, `src/pages/almacen/NotaVenta.jsx`.

### 1.10 cuentasPorCobrar — `lib/backend/schema/cuentas_por_cobrar_record.dart` (collection() línea 93)
- `montoTotal` : double (Req) — 18 · `saldoPendiente` : double (Req) — 23 · `estado` : String (Req) — 28
- `fecha` : DateTime — 33 · `numeroCotizacion` : String — 38 · `tipoDocumento` : String — 43
- `pagoTotalActual` : double — 48 · **`clienteid` : DocumentReference → users** — 53 · `clientenombre` : String — 58
- `fecha_creacion` : DateTime — 63 · `tipoCuenta` : String ("Cobrar"/"Pagar", Req) — 68
- **`proveedorid` : DocumentReference → Proveedores** — 73
- **Subcolección `pagos_CporCobrar`** — `lib/backend/schema/pagos_cpor_cobrar_record.dart` (collection() línea 71):
  `fecha`(DateTime,18), `usuario`(ref→users,23), `montopagado`(double,28), `montopendiente`(double,33),
  `numerocuenta`(String,38), `metodopago`(String,43), `estado`(String,48), `fecha_creacion`(DateTime,53).
- **React:** **CuentasCobrar** (`tipoCuenta="Cobrar"`) y **CuentasPagar** (`tipoCuenta="Pagar"`) en
  `src/pages/cobranza/`. El historial de pagos = subcolección `pagos_CporCobrar`.

### 1.11 recepciones — `lib/backend/schema/recepciones_record.dart` (collection() línea 341)
- `numeroorden` : int (Req) — 18 · `tipo_persona` : String — 23 · `nombre_cliente` : String (Req) — 28
- `telefono` : String — 33 · `placa` : String — 38 · `marca`/`modelo` : String — 43/48
- `km_ingreso` : String — 53 · `tecnico_servicio` : String — 58 · `tipo_servicio` : String — 63
- `motivo_ingreso` : String — 68 · `fotos` : List<String> — 73 · `DNI`/`RUCempresa`/`Razon_social` : String — 78/83/88
- `Nombre_encargado` : String — 93 · `Correo_electronico` : String — 98 · `Numero_VIN` : String — 103
- `Ano_fabricacion` : String — 108 · `Nivel_combustible` : String — 113 · `Observaciones_adicionales` : String — 118
- `status` : String (Req) — 123 · `aprobacion_cliente` : bool — 128 · `fecha_creacion` : DateTime — 133
- `Subtotal`/`Total`/`IGV` : double — 138/143/148 · `aprobacion_cotizacion` : bool — 153
- `Inventario` : List<String> — 158 · `Controlcalidad1/2/3` : String — 163/168/173
- `Clientecontrolcalidad1/2/3/4` : String — 178/183/188/193 · `direccion_fiscal` : String — 198
- `distrito`/`provincias`/`departamento` : String — 203/208/213 · `tipo_documento` : String — 218
- **`vehiculoRef` : DocumentReference → Vehiculos** — 223 · **`clienteRef` : DocumentReference → users** — 228
- `codeCT`/`moneda`/`validoferta`/`diaentrega`/`condpago`/`garantia`/`fechavencimiento` : String — 233/238/243/248/253/258/263
- `tipoigv` : String — 268 · `facturado` : bool — 273 · `tecnicoservicioRef` : DocumentReference → users/personal — 278
- **Subcolección `diagnosticos`** — `lib/backend/schema/diagnosticos_record.dart` (collection() línea 152):
  `Nombre_falla`(18), `Solucion`(23), `Tiempo_estimado`(28), `Fotos`(List<String>,33),
  `Repuestos`(List<RepuestosStruct>: `nombre`,`precio`,`ref`→Articles,`cantidad`,`tipo`,`total`,`codigo`),
  `Subtotal`/`IGV`/`Total`(double), `Comentarios`(String), `Fotosfinalizar`(List<String>), `Finalizado`(bool),
  `Horas_trabajo`/`Mano_de_obra`/`Tiempo_finalizado`(double), `Comentarios_finalizado`(String),
  `imagenes_finalizado`(List<String>), `Imagenes_cotizacion`(List<String>), `Aprobacion_cliente`(bool),
  `repuests_articles`(List<DocumentReference>→Articles), `fecha`(DateTime), `precioservicio`(double).
- **React:** **OrdenTrabajoList / OrdenTrabajoEditor** (`src/pages/ventas/servicios/`) bajo `docKey="vs-orden"`.
  `facturado` es el flag que usa `OrdenTrabajoList.jsx` para habilitar "Generar factura".

### 1.12 Group — `group_record.dart` (collection() línea 27)
- `name` : String (Req) — 18. **React:** creado inline en **ArticuloForm** (`src/pages/almacen/ArticuloForm.jsx` + `InlineCreateDialogs.jsx`).

### 1.13 subgroup — `subgroup_record.dart` (collection() línea 39)
- `name` : String (Req) — 18 · **`group` : DocumentReference → Group** — 23 · `groupname` : String — 28.
- **React:** inline en **ArticuloForm**.

### 1.14 article_brand_marca — `article_brand_marca_record.dart` (collection() línea 27)
- `name` : String (Req) — 18. **React:** marcas inline en **ArticuloForm**.

### 1.15 measurement_unit — `measurement_unit_record.dart` (collection() línea 27)
- `name` : String (Req) — 18. **React:** unidades inline en **ArticuloForm**.

### 1.16 vehicle_marca_brand — `vehicle_marca_brand_record.dart` (collection() línea 27)
- `name` : String (Req) — 18. **React:** marcas de vehículo en **VehiculoForm**.

### 1.17 vehicle_model_modelo — `vehicle_model_modelo_record.dart` (collection() línea 39)
- `name` : String (Req) — 18 · **`brand` : DocumentReference → vehicle_marca_brand** — 23 · `brandname` : String — 28.
- **React:** modelos en **VehiculoForm**.

### 1.18 LastCode — `last_code_record.dart` (collection() línea 45)
- `lastCode` : String — 18 · `lastCodeVenta` : String — 23 · `uid` : int — 28 · `lastCodeCompra` : String — 33.
- **Uso:** contadores de correlativos (serie/número). **React:** hoy `nextDocId()` (`db.js:372-381`) genera el id
  localmente; al conectar, migrar a leer/escribir `LastCode` (o usar `increment` atómico) para no colisionar.

### 1.19 Almacen_movement — `almacen_movement_record.dart` (collection() línea 45)
- **`Article` : DocumentReference → Articles** — 18 · `Quantity` : double (Req) — 23 · `Total_Price` : double — 28
- `Movement_type` : String (Req) — 33.
- **React:** **MovimientosList** (`src/pages/almacen/MovimientosList.jsx`).

### 1.20 encargados — `encargados_record.dart` (collection() línea 45)
- **`recepciones_ref` : DocumentReference → recepciones** — 18 · **`diagnosticos_ref` : DocumentReference → diagnosticos** — 23
- `nombre` : String (Req) — 28 · `telefono` : int — 33.
- **React:** consumido dentro de **Clientes** (campo `encargado` en `seed.clientes`); no tiene pantalla dedicada aún.

### 1.21 Insumos — `insumos_record.dart` (collection() línea 33)
- `Nombre` : String (Req) — 18 · `Precio` : double (Req) — 23.
- **ESTADO (2026-07-20, verificado en código):** la colección standalone `Insumos` **NO recibe escrituras
  nuevas** en el flujo activo. `createInsumosRecordData` (`insumos_record.dart:67`) está definido pero **nunca
  es llamado** en `lib/` ni en `lib/custom_code/`. El selector "Elegir Insumos" (`elegir_insumos_widget.dart:381`)
  lee de **`containerArticlesRecordList` (colección `Articles`)** y arma un `InsumosStruct` (struct local, no la
  colección) cuyo `ref` apunta a un **Artículo**; ese struct se embebe en los documentos (diagnósticos, ítems de
  factura, vale). El catálogo `Insumos` es **legado / congelado** (solo lectura de datos cargados hace tiempo).
- **React:** el **Vale de Insumos** (`src/pages/almacen/ValeInsumos.jsx`) debe leer insumos desde **`Articles`**
  (vía Algolia/Firestore, filtrando `Product_type`=="Insumo" si aplica) y guardar los ítems como structs embebidos
  + movimiento en `Almacen_movement`/`Kardex_element`. **NO escribir** la colección `Insumos`.

### 1.22 Repuestos — `repuestos_record.dart` (collection() línea 33)
- `Nombre` : String (Req) — 18 · `Precio` : double (Req) — 23.
- **ESTADO (2026-07-20, verificado en código):** la colección standalone `Repuestos` **NO recibe escrituras
  nuevas** en el flujo activo. `createRepuestosRecordData` (`repuestos_record.dart:67`) está definido pero
  **nunca es llamado** en `lib/` ni en `lib/custom_code/`. Los repuestos se modelan dentro de **`Articles`**
  (`Product_type` "Repuesto"); el selector "Elegir Repuestos" (`elegir_rep_arreglado_widget.dart`,
  `elegir_repuesto_cotizacion_factura_widget.dart`) lee de `Articles` y arma un `RepuestosStruct` (struct local)
  con `ref`→**Artículo**, embebido luego en `diagnosticos`/`Facturas`. El catálogo `Repuestos` es **legado /
  congelado** (solo lectura).
- **React:** los repuestos se modelan dentro de **`Articles`** (Product_type "Repuesto"). **NO escribir** la
  colección `Repuestos`; leer/cargar desde `Articles`.

### 1.23 personal — `personal_record.dart` (collection() línea 129)
- `numeroorden` : int — 18 · `telefono` : String — 23 · `DNI` : String (Req) — 28 · `Razon_social` : String — 33
- `Correo_electronico` : String — 38 · `fecha_creacion` : DateTime — 43 · `direccion_fiscal` : String — 48
- `distrito`/`provincias`/`departamento` : String — 53/58/63 · `tipo_documento` : String — 68
- `sexo` : String — 73 · `edad` : String — 78 · `fecha_nacimiento` : DateTime — 83
- `cargo_personal`/`cargo_empleado` : String — 88/93 · `nombre` : String (Req) — 98 · `wsp` : String — 103
- **ESTADO (2026-07-20, verificado por búsqueda de llamadas a `createPersonalRecordData`):** COLECCIÓN LEGACY.
  `createPersonalRecordData()` (`personal_record.dart:163`) está definida pero **NUNCA es llamada** en todo el
  código Dart. El flujo activo de Personal (crear/editar/eliminar/listar) usa **exclusivamente `users`**
  (ver §1.1):
  - Crear: `d_pc_crear_personal_widget.dart:2182-2240` → crea Auth user + escribe/actualiza doc en `users`.
  - Editar: `d_pc_edita_personal_widget.dart:2227-2259` → `.update()` sobre `UsersRecord`.
  - Eliminar: `eliminar_personal_widget.dart:165` → `.reference.delete()` sobre `UsersRecord`.
  - Listar: `b_pc_registro_de_personal_widget.dart:85-87` → `queryUsersRecord(whereIn('user_role', [...]))`.
- **React:** **PersonalList** (`src/pages/administracion/PersonalList.jsx`) lee/escribe SOLO `users` (colección viva).

### 1.24 Facturas — `facturas_record.dart` (collection() línea 90)
- Igual cabecera que FacturasVentasCompras pero **más simple**: `RazonSNombre`(18), `Nserie`(23), `Fecha`(28),
  `Total`(33), `FPago`(38), `Canje`(43), `Usuario`(48), `NumCotizacion`(53), `Estado`(58),
  `items`(List<FacturasArticulosStruct>, **clave en minúsculas**, 63), `tipofactura`(68).
- **Diferencia vs FacturasVentasCompras:** NO tiene `proveedor`, `TipoOperacion`, `igv`, `Almacen`, `EstadoFactura`;
  usa `RazonSNombre` (sin espacio) y `items` (minúscula) en vez de `Items`.
- **ESTADO (2026-07-20, verificado en código de ESCRITURA):** `Facturas` **SÍ está ACTIVA** — es la colección vivo
  para **venta de servicios (`vs-*`)**, **nota de venta** y **canje**. Escrituras confirmadas:
  `components/crearfactura_widget.dart:984` (lanzado desde `web/ventas_servicios/e_pc_emision_de_factura_taller_widget.dart:563`
  y `.../e_pc_emision_de_boletas_widget.dart:564`) y `components/canjearnotaventa_widget.dart:99` (lanzado desde
  `web/ventas_servicios/e_pc_registro_de_nota_ventas_widget.dart:1586`). NO es legado.
- **React:** los docKeys `vs-factura, vs-boleta, vs-cotizacion, vs-orden, vs-notas` deben apuntar a **`Facturas`**
  (no a `FacturasVentasCompras`). Al portar, mapear a `items` (minúscula) y `RazonSNombre`. Los docKeys
  `va-*`/`c-*` van a `FacturasVentasCompras` (ver 1.9).

---

## 2. Reglas de seguridad actuales (`firebase/firestore.rules`)

**Estado confirmado:** TODAS las colecciones listadas tienen reglas completamente abiertas:
`allow create, read, write, delete: if true`. Ejemplos por línea:
- `Articles` → líneas 79-84 · `users` → 11-16 · `Proveedores` → 51-56 · `Almacen` → 72-77
- `FacturasVentasCompras` → 189-194 · `cuentasPorCobrar` → 170-175 (y subcolección `pagos_CporCobrar` → 177-182)
- `recepciones` → 4-9 (y `recepciones/{parent}/diagnosticos` → 18-23) · `Kardex_element` → 107-112
- `Vehiculos` → 65-70 · `service` → 93-98 · `Almacen_movement` → 100-105 · `LastCode` → 156-161
- `Group`/`subgroup`/`article_brand_marca`/`measurement_unit`/`vehicle_marca_brand`/`vehicle_model_modelo` → 121-154
- `Repuestos`/`Insumos`/`encargados`/`personal` → 30-49 · `Facturas` → 163-168 · `Articles_Warehouse` → 86-91

> **Corrección de sincronización (2026-07-20):** el archivo `firebase/firestore.rules` del repositorio
> `GMPARTS-ADMIN-LEGACY` **estaba desactualizado respecto a las reglas realmente desplegadas en Firebase
> Console**. El repo no contenía dos reglas que SÍ están activas en producción:
> 1. `match /{document=**} { allow read, write: if request.auth.token.email.matches("firebase@flutterflow.io"); }`
>    (acceso total para el service account de FlutterFlow).
> 2. `match /{document=**} { allow read, write: if request.time < timestamp.date(2050, 4, 18); }`
>    (regla de respaldo que expira el 2050-04-18, mencionada por el usuario).
> En esta fecha se sobrescribió `firebase/firestore.rules` con el bloque **exacto** desplegado en producción
> (mismo comportamiento `if true` en todas las colecciones + las dos reglas globales anteriores). No se cambió
> el comportamiento, solo se sincronizó el archivo con lo activo.

### 2.1 TODO antes de producción (RIESGO — no cambiar todavía, solo documentar)
- [ ] **CRÍTICO:** las reglas son `if true` (lectura/escritura pública). Cualquiera con la config del
  proyecto puede leer/escribir/borrar toda la base. Antes de exposición pública debe reemplazarse por reglas
  basadas en `request.auth != null` + claims de rol (ver Sección 4 / roles server-side pendientes de Fase D).
- [ ] Las subcolecciones `diagnosticos` y `pagos_CporCobrar` tienen además `match /{path=**}/... { allow read: if true }`
  (líneas 25-27 y 184-186) que las exponen en cualquier ruta anidada.
- [ ] No hay validación de tipos/estructura de campos en las reglas (un cliente podría escribir cualquier forma).
- [ ] Plan de migración: definir reglas por colección usando `request.auth.uid == resource.data.clienteid`
  (o `getUser().role`) y `allow write` condicionado a roles (Admin, Vendedor, Almacén, etc.).

---

## 3. Patrón de conexión CRUD estándar

Objetivo: reemplazar `localStorage` por Firestore **sin tocar las ~90 pantallas**. La app ya usa un hook
`useStoreCollection(docKey)` que devuelve `[items, { remove, refresh }]` (`src/store/useStoreCollection.js`)
y un módulo `db.js` con `getDocuments / saveDocument / deleteDocument / nextDocId`.

### 3.1 Capa swappable (`src/store/firestoreDb.js`)
Crear un módulo que replique la API de `db.js` pero sobre Firestore:
- `getDocuments(docKey)` → `getDocs(collection(db, mapDocKeyToCollection(docKey)))` (snapshot inicial).
- `saveDocument(docKey, doc)` → `doc.id ? updateDoc : addDoc` en la colección mapeada (ver 1.9 para el mapa
  `docKey → FacturasVentasCompras` + `tipofactura`/`TipoOperacion`).
- `deleteDocument(docKey, id)` → `deleteDoc` + reversión de stock (igual lógica actual de `db.js`).
- `nextDocId(docKey)` → leer `LastCode` (o `increment`) para el correlativo.
- Stock: `applyStockSideEffects` / `reverseStockSideEffects` deben escribir **`Articles.Stock`** (confirmado en 1.3).

**Mapeo `docKey → colección` (CORREGIDO 2026-07-20, ver Sección 1.9/1.24):** NO es una sola colección.
```js
function mapDocKeyToCollection(docKey) {
  // Venta de SERVICIOS, nota de venta y canje → colección "Facturas" (esquema simple, ver 1.24)
  const FACTURAS = [
    'vs-factura', 'vs-boleta', 'vs-cotizacion', 'vs-orden', 'vs-notas',
  ];
  // Venta de PRODUCTOS (va-*) y TODAS las COMPRAS (c-*) → "FacturasVentasCompras" (esquema completo, ver 1.9)
  const FACTURAS_VC = [
    'va-factura', 'va-boleta', 'va-cotizacion', 'va-guia', 'va-notacredito',
    'c-factura', 'c-boleta', 'c-notas', 'c-guia', 'c-orden', 'al-notaventa',
  ];
  if (FACTURAS.includes(docKey)) return 'Facturas';
  if (FACTURAS_VC.includes(docKey)) return 'FacturasVentasCompras';
  throw new Error(`docKey sin colección mapeada: ${docKey}`);
}
```

**Repuestos e Insumos = READ-ONLY desde React (NUNCA escribir ahí):**
- Las colecciones `Repuestos` e `Insumos` están **congeladas/legado**; no reciben `addDoc`/`updateDoc`/`deleteDoc`
  en el flujo activo (ver Sección 1.21/1.22). Desde React son **solo lectura** (catálogo histórico fijo).
- Los selectores de insumos/repuestos deben leer y filtrar **`Articles` por `Product_type`** (p.ej.
  `Product_type == "Insumo"` / `"Repuesto"`), igual que hace el Flutter activo
  (`elegir_insumos_widget.dart:381` → `containerArticlesRecordList`). No crear pantallas de alta que escriban
  `Repuestos`/`Insumos`.

**Cuidado de esquema al guardar `vs-*` (colección `Facturas`):**
- `Facturas` es MÁS SIMPLE que `FacturasVentasCompras` (ver 1.24): **NO** tiene `proveedor`, `TipoOperacion`,
  `igv`, `Almacen`, `EstadoFactura`; usa **`RazonSNombre`** (sin espacio) y **`items`** (minúscula) en vez de
  `Items`. El código de `saveDocument` para docKeys `vs-*` debe armar el objeto con ESE esquema, no copiar el de
  `FacturasVentasCompras`. `proveedor`/`TipoOperacion`/`igv`/`Almacen`/`EstadoFactura` solo aplican a
  `FacturasVentasCompras` (`va-*`/`c-*`).

### 3.2 Hook genérico con `onSnapshot`
Evolucionar `useStoreCollection` para suscribirse en tiempo real:
```js
export function useStoreCollection(docKey) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const col = collection(db, mapDocKeyToCollection(docKey));
    const unsub = onSnapshot(col, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [docKey]);
  const remove = (id) => deleteDocument(docKey, id);   // deleteDoc + reversión stock
  return [items, { remove, refresh: () => {} }];
}
```
Esto mantiene la firma `[items, { remove }]` → las pantallas no cambian. Para documentos complejos
(`FacturasVentasCompras`, `cuentasPorCobrar`) usar `onSnapshot` también en la subcolección
(`pagos_CporCobrar`, `diagnosticos`).

### 3.3 Auth
Reemplazar `src/store/auth.js` (mock) por Firebase Auth: `signInWithEmailAndPassword`,
`onAuthStateChanged`, `signOut`. El rol del usuario vive en `users.user_role` (1.1). El guard en `App.jsx`
y el filtro de Sidebar (`canViewAdministracion`) deben leer el claim/rol real.

### 3.4 Conciliación de stock al editar (ya implementada en `db.js`)
La lógica de `saveDocument` (revertir efecto previo + aplicar nuevo, `db.js:307-321`) y la reconciliación de
cuenta por crédito deben portarse tal cual a `firestoreDb.js` para preservar consistencia al conectar.

---

## 4. Lógica de negocio a preservar (validada en Tanda 4 + fix reciente)

Estas 5 reglas ya están confirmadas en el React y **deben mantenerse** al conectar Firestore:

1. **Fórmulas de precio (margen/utilidad):**
   - Compras (`CompraEditor.jsx:124-133`): `pu = precioCompra + precioCompra * utilidad * 0.01`.
   - Ventas (`DocumentEditor.jsx` / `ServicioEditor.jsx:185-193`): `pu = precioCompra / (1 - utilidad/100)`
     (si `utilidad >= 100` → `pu = precioCompra`).
   - **Fix aplicado:** cambiar **cualquiera** de `precioCompra` o `utilidad` recalcula `pu` (antes solo lo
     hacía `utilidad`). El port a Firestore NO debe romper este recálculo.

2. **Validación de stock (Venta):** bloquear selección si `Articles.Stock <= 0`
   (`DocumentEditor.jsx:109-112`); si `cant > stock` mostrar advertencia "No tienes stock disponible" pero
   **NO** bloquear guardar (`DocumentEditor.jsx:251-253`). La escritura de stock sigue siendo en `Articles.Stock`.

3. **Factura = Jurídica / Boleta = Natural:** `DocumentEditor.jsx:202-207` valida el `tipoPersona` del cliente
   (`clientesSeed`). Debe preservarse al leer clientes desde `users` filtrado por `user_role=="Cliente"`.

4. **Validaciones de formulario obligatorias** (`DocumentEditor.jsx:194-209`): moneda, fecha, condición de pago,
   tipo IGV, almacén, y al menos un ítem. Mismas reglas en `CompraEditor`.

5. **Debounce 2000 ms:** recálculo de `cant`/`precioCompra`/`utilidad` diferido 2000 ms
   (`lib/debounce.js:5-13`, usado en los 3 editores). Conservar el tiempo exacto al portar.

---

## 5. Cloud Functions relevantes

### 5.1 onUserDeleted — `firebase/functions/index.js:5`
```js
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  let firestore = admin.firestore();
  let userRef = firestore.doc("users/" + user.uid);
  // ... (cuerpo incompleto: solo resuelve userRef, NO borra datos relacionados)
});
```
- **Estado:** stub. Se dispara al eliminar un usuario de Auth, resuelve `users/{uid}` pero **no hace cascada**
  (no borra recepciones, cuentasPorCobrar, vehículos, etc. del usuario).
- **Acción para React:** al conectar Auth, completar esta función (o implementar borrado en cliente con
  reglas de rol) para limpiar datos del usuario. Por ahora, **revisar manualmente en Firebase Console** el
  comportamiento real desplegado.

### 5.2 Algolia en el frontend React (ya configurado)
- `src/lib/algolia.js`: `algoliasearch("0CXWHIXYJC", "11c6e86aadf789c9f1067a197da0a3e6")` + `articlesIndex = initIndex("Articles")`.
- **Integración:** los selectores de artículos (Sección 0) deben usar `articlesIndex.search(query)` y mapear
  hits a `{ codigo, descripcion, precioCompra, utilidad, stock, ... }` (equivalente a `fromAlgolia` en
  `articles_record.dart:228-325`). NO consultar Firestore para la búsqueda de artículos.
- El índice se alimenta solo vía la extensión Firebase→Algolia sobre `Articles` (no requiere código extra en React).

---

## 6. Orden de conexión recomendado (módulo por módulo)

Empezar por colecciones simples sin referencias cruzadas y dejar los documentos complejos al final.

**Fase D1 — Catálogos simples (sin referencias):**
`Group`, `subgroup`, `article_brand_marca`, `measurement_unit`, `vehicle_marca_brand`, `vehicle_model_modelo`,
`Insumos`, `Repuestos` (verificar si aplica), `encargados`.
→ Pantallas: ArticuloForm / InlineCreateDialogs, VehiculoForm. Bajo riesgo.

**Fase D2 — Maestros con pocas referencias:**
`users` (Clientes + Personal), `Proveedores`, `personal`, `Almacen`, `service`, `Vehiculos`.
→ ClientesList, PersonalList, ProveedoresList, AlmacenesList, ServiciosList, VehiculosList.
→ Incluye conexión de **Auth** (3.3) y roles.

**Fase D3 — Stock y movimientos:**
`Articles` (con escritura de `Stock`), `Articles_Warehouse` (opcional), `Almacen_movement`, `Kardex_element`.
→ ArticulosList + todos los selectores vía **Algolia** (Sección 0/5.2). Verificar que `applyStockSideEffects`
escribe `Articles.Stock`.

**Fase D4 — Documentos complejos (líneas múltiples + stock + cuentas):**
`FacturasVentasCompras` (docKeys `va-*` y `c-*`, ver mapa 1.9), `Facturas` (docKeys `vs-*` de venta servicios, ver 1.24),
`cuentasPorCobrar` + subcolección `pagos_CporCobrar`, `recepciones` + subcolección `diagnosticos`,
`LastCode` (correlativos).
→ Todas las listas de `ventas/*`, `compras/*`, `cobranza/*`, `almacen/NotaVenta.jsx`.
→ Aquí portar la reconciliación de stock en edición (3.4) y la generación de cuenta por crédito.

**Fase D5 — Cierre:**
- Completar `onUserDeleted` (5.1).
- Aplicar reglas de seguridad (2.1) antes de exposición pública.
- PDF real vía Cloud Function y envío SUNAT real (pendientes de Fase D, fuera de este spec básico).

---

## Apéndice — Archivos de referencia (Flutter, fuente de verdad)
- Esquemas: `GMPARTS-ADMIN-LEGACY/lib/backend/schema/*.dart`
- Algolia: `GMPARTS-ADMIN-LEGACY/lib/backend/algolia/algolia_manager.dart`, `articles_record.dart:316-325`
- Stock: `GMPARTS-ADMIN-LEGACY/lib/custom_code/actions/actualizar_stock_*.dart`
- Reglas: `GMPARTS-ADMIN-LEGACY/firebase/firestore.rules`
- Functions: `GMPARTS-ADMIN-LEGACY/firebase/functions/index.js`
- React (destino): `gmparts-admin-web/src/store/db.js`, `useStoreCollection.js`, `auth.js`,
  `components/documents/{DocumentEditor,CompraEditor,ServicioEditor}.jsx`, `lib/algolia.js`, `lib/debounce.js`,
  `lib/firebase.js`.
