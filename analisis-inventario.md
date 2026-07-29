# Análisis integral — Módulo de Inventario y Gestión de Stock

---

## 1. Resumen ejecutivo

El módulo de inventario actual presenta una **arquitectura fragmentada** donde:

- El stock se almacena como un campo directo en el documento de cada artículo (`Articles.Stock`)
- Existen **3 mecanismos distintos** para modificar el stock, sin sincronización entre ellos
- Hay **2 pantallas duplicadas** (Movimientos de Almacén y Stock por Almacén) que conceptualmente hacen lo mismo
- El Kardex está **implementado a medias**: existe la colección `Almacen_movement` pero la vista de Kardex usa `db.getKardex()` que es un stub vacío
- Las operaciones de compra/venta modifican el stock en `Articles.Stock` sin dejar trazabilidad completa en `Almacen_movement`

---

## 2. Arquitectura actual del stock

### 2.1 ¿Dónde vive el stock?

El stock vive exclusivamente en **`Articles.Stock`**: un campo numérico dentro del documento de cada artículo en la colección `Articles` de Firestore.

No existe:
- Stock por almacén (no hay campo `Stock` por cada almacén)
- Stock comprometido (no hay reservas)
- Stock disponible vs físico (no hay diferenciación)

### 2.2 ¿Qué modifica el stock?

Actualmente **4 procesos** modifican `Articles.Stock`:

| Proceso | Archivo | Método | ¿Deja trazabilidad? |
|---|---|---|---|
| **Movimiento de almacén** (manual) | `MovimientoForm.jsx` | `updateArticleStockByCode` + `addDoc("Almacen_movement")` | ✅ Sí, crea doc en `Almacen_movement` |
| **Factura de Venta** | `firestoreStock.js` | `applyStockToItems` con delta negativo | ❌ No, no registra en `Almacen_movement` |
| **Factura de Compra** | `firestoreStock.js` | `applyStockToItems` con delta positivo | ❌ No, no registra en `Almacen_movement` |
| **Edición/Anulación de documentos** | `firestoreStock.js` | `applyStockToItems` con delta inverso | ❌ No |

### 2.3 Inconsistencias detectadas

1. **`ArticulosWarehouseList.jsx`** (Stock por Almacén) guarda en la colección `Articles_Warehouse` pero **NO actualiza `Articles.Stock`**. Es un registro de movimientos independiente que no afecta el stock real.

2. **`MovimientoForm.jsx`** guarda en `Almacen_movement` Y actualiza `Articles.Stock`. Pero al editar, carga datos desde `db.getKardex()` (stub vacío), por lo que **la edición no funciona**.

3. **`MovimientosList.jsx`** lista desde `Almacen_movement` (Firestore) pero la columna "Documento" genera un número ficticio (`COMP-0001`, `VENT-0001`) que no se corresponde con ningún documento real.

4. **`ValeInsumos.jsx`** guarda en `ValeInsumos` (Firestore) pero **NO actualiza `Articles.Stock`**. No descuenta stock.

5. **Las facturas/boletas** actualizan `Articles.Stock` a través de `firestoreStock.js` pero **no registran el movimiento en `Almacen_movement`**, por lo que no hay una trazabilidad completa del porqué cambió el stock.

---

## 3. Análisis comparativo con la teoría de inventarios (ERP)

### 3.1 Modelo estándar de inventario en un ERP

```
Maestro de Artículos (catálogo)
  ├── Código, nombre, descripción, unidad, precios, etc.
  └── NO debería contener Stock aquí (o solo como vista)

Stock (entidad separada)
  ├── Articulo_ID, Almacen_ID, Cantidad_fisica, Cantidad_comprometida, Cantidad_disponible
  └── Se actualiza ÚNICAMENTE a través de Movimientos

Movimientos de Almacén (la única fuente de verdad)
  ├── Tipo: Ingreso, Salida, Transferencia, Ajuste, Consumo
  ├── Artículo, Almacén_origen, Almacén_destino, Cantidad, Precio
  ├── Documento_origen (factura, compra, vale, etc.)
  └── Fecha, Usuario, Observación

Kardex (vista histórica)
  ├── Lista todos los movimientos de un artículo
  ├── Saldo inicial → Movimiento → Saldo final
  └── Se genera a partir de Movimientos (no es una entidad separada)
```

### 3.2 Lo que el sistema actual tiene bien

- ✅ `MovimientoForm.jsx` sigue el patrón correcto: crear movimiento + actualizar stock
- ✅ El stock se actualiza atómicamente via Firestore `runTransaction`
- ✅ Los movimientos se almacenan en `Almacen_movement` con trazabilidad básica

### 3.3 Lo que falta o está mal

| Concepto | Estado actual | Debería ser |
|---|---|---|
| Stock por almacén | ❌ No existe | Cada artículo tiene stock en cada almacén |
| Stock comprometido | ❌ No existe | Stock apartado por documentos pendientes |
| Stock disponible | ❌ Es igual al stock físico | Debe ser `físico - comprometido` |
| Kardex como vista | ❌ Usa stub vacío | Debe leer de `Almacen_movement` |
| Movimiento con origen | ❌ No vincula documento | Cada movimiento debe referenciar su documento origen |
| Transferencias | ⚠️ Existe como tipo pero sin lógica real | Debe crear ingreso + salida simultáneos |
| Ajustes | ⚠️ Existe como tipo | Sin validación ni autorización |

---

## 4. Duplicidad de pantallas

### 4.1 Stock por Almacén vs Movimientos de Almacén

**`/al-warehouse`** (`ArticulosWarehouseList.jsx`):
- Colección: `Articles_Warehouse`
- Propósito declarado: "Stock por Almacén"
- Realidad: CRUD de movimientos que **no afectan el stock real**
- Campo `Document_Type`: Ingreso, Salida, Ajuste, Transferencia
- **No integrado con `Articles.Stock`**

**`/al-movimientos`** (`MovimientosList.jsx` + `MovimientoForm.jsx`):
- Colección: `Almacen_movement`
- Propósito: "Movimientos de Almacén"
- Realidad: CRUD de movimientos que **SÍ afectan el stock real**
- Campo `Movement_type`: Ingreso, Salida, Ajuste, Transferencia

**Conclusión:** Ambas pantallas hacen lo mismo (crear movimientos de inventario) pero una actualiza el stock y la otra no. `Articles_Warehouse` es funcionalmente redundante y debería eliminarse o migrarse a `Almacen_movement`.

### 4.2 Vale de Insumos como movimiento

El Vale de insumos es conceptualmente un **movimiento de salida** (consumo interno). Actualmente guarda en colección separada (`ValeInsumos`) sin actualizar stock. Debería integrarse al mismo flujo de `Almacen_movement`.

---

## 5. Kardex

### 5.1 Estado actual

- `KardexList.jsx` usa `db.getKardex()` que retorna `[]` (stub)
- La pantalla está **vacía por completo** — no hay datos visibles
- El menú lateral "Kárdex de Almacén" apunta a `/al-kardex` que muestra una pantalla en blanco

### 5.2 Lo que debería ser

Un Kardex es un **reporte histórico de movimientos por artículo**. La información ya existe en `Almacen_movement` (Firestore). Solo hace falta:

1. Leer los movimientos agrupados por `Code_Id` o `Article`
2. Mostrar para cada artículo: fecha, tipo de movimiento, cantidad, saldo acumulado, documento origen
3. Opcionalmente: filtro por artículo, rango de fechas, almacén

### 5.3 Detalle de Kardex por artículo

Actualmente no existe una vista de "detalle de Kardex para un artículo específico". El usuario no puede ver el histórico de movimientos de un artículo en particular. Esto es una funcionalidad crítica faltante.

---

## 6. Problemas específicos encontrados

### 6.1 Críticos

1. **Stock por Almacén no actualiza stock** — `ArticulosWarehouseList` guarda en `Articles_Warehouse` pero nunca llama a `updateArticleStockByCode`. El stock real del artículo nunca cambia.

2. **Edición de movimientos no funciona** — `MovimientoForm.jsx` en modo edición carga desde `db.getKardex()` (stub vacío). No puede cargar documentos existentes de `Almacen_movement`.

3. **Kardex vacío** — La página de Kardex no muestra datos porque `db.getKardex()` es un stub.

4. **Facturas y compras no registran en Almacen_movement** — Cuando se emite una factura, el stock se descuenta pero no queda registro en `Almacen_movement`. No hay trazabilidad.

### 6.2 Moderados

5. **Vale de insumos no descuenta stock** — `ValeInsumos.jsx` guarda en Firebase pero nunca actualiza `Articles.Stock`.

6. **Documento ficticio en MovimientosList** — La columna "Documento" genera un número secuencial falso sin relación con documentos reales.

7. **Pantallas duplicadas** — `Articles_Warehouse` y `Almacen_movement` tienen el mismo propósito pero desconectadas.

### 6.3 Leves

8. **Sin validación de stock negativo** — Se puede crear una salida con más cantidad que el stock disponible.

9. **Sin transferencias reales** — El tipo "Transferencia" existe en los formularios pero no implementa la lógica de restar de un almacén y sumar a otro.

---

## 7. Propuesta de arquitectura

### 7.1 Modelo de datos propuesto

```yaml
Articles (maestro de artículos)
  - id, Codigo, Nombre_name, ... (sin campo Stock aquí)

ArticleStock (stock por almacén)
  - articleId (ref a Articles)
  - warehouseId (w1, w2, w3)
  - quantity (cantidad física)
  - minStock (stock mínimo, heredado o por almacén)

InventoryMovement (único registro de movimientos)
  - id
  - type: INBOUND | OUTBOUND | TRANSFER | ADJUSTMENT | CONSUMPTION
  - articleId (ref a Articles)
  - sourceWarehouse (para salidas/transferencias)
  - targetWarehouse (para ingresos/transferencias)
  - quantity (siempre positiva; el signo lo da type)
  - unitPrice
  - totalPrice
  - documentRef (facturaId, compraId, valeId, etc.)
  - documentType (Factura, Compra, Vale, etc.)
  - description
  - createdBy
  - createdAt
```

### 7.2 Flujo de stock unificado

```
Documento (Factura/Compra/Vale/Movimiento manual)
    │
    ▼
firestoreSaveDocument / handleSubmit
    │
    ├── 1. Crear InventoryMovement (trazabilidad)
    ├── 2. Actualizar ArticleStock (stock por almacén)
    └── 3. (Opcional) Actualizar vista desnormalizada Articles.Stock
```

### 7.3 Reorganización de pantallas

| Pantalla actual | Acción propuesta |
|---|---|
| `/al-articulos` (maestro) | Mantener. Quitar campo Stock del formulario (se gestiona por movimientos) |
| `/al-warehouse` (stock por almacén) | Eliminar. Reemplazar por vista de stock actual por almacén (solo lectura) |
| `/al-movimientos` (movimientos) | Mantener como única entrada de movimientos manuales |
| `/al-kardex` (kárdex) | Reconstruir: leer desde `Almacen_movement` con saldos acumulados |
| `/al-vale-insumos` | Migrar a usar `InventoryMovement.type=CONSUMPTION` |
| — | Agregar: detalle de Kardex por artículo (histórico de un artículo específico) |

---

## 8. Prioridades de implementación

| Prioridad | Cambio | Justificación |
|---|---|---|
| 🔴 P1 | Reconstruir Kardex desde `Almacen_movement` | Pantalla actualmente rota (vacía) |
| 🔴 P1 | Hacer que edición de movimientos cargue desde Firebase | Funcionalidad rota |
| 🟡 P2 | Unificar `Articles_Warehouse` y `Almacen_movement` | Eliminar duplicidad |
| 🟡 P2 | Registrar movimientos al emitir facturas/compras | Trazabilidad completa |
| 🟡 P2 | Vale de insumos descuente stock | Consistencia de inventario |
| 🟢 P3 | Detalle de Kardex por artículo | Funcionalidad faltante |
| 🟢 P3 | Stock por almacén (real, no mock) | Funcionalidad faltante |
| 🔵 P4 | Transferencias entre almacenes | Funcionalidad avanzada |
| 🔵 P4 | Stock comprometido | Funcionalidad avanzada |
