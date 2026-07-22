# Mapeo de docKeys — Colecciones y tipos en Firestore

Cada página del admin-web usa un `docKey` interno que determina:
- En qué colección de Firestore se guarda/lee el documento (`mapDocKeyToCollection`)
- Qué `tipofactura` se asigna al documento
- Qué `TipoOperacion` se asigna (solo en colección `FacturasVentasCompras`)

Estos valores **deben coincidir con los que usa el legacy Flutter** para que ambas apps compartan los mismos datos.

## Colecciones Firestore

| docKey | Colección | `tipofactura` | `TipoOperacion` |
|---|---|---|---|
| `va-factura` | `FacturasVentasCompras` | `Factura` | `venta` |
| `va-boleta` | `FacturasVentasCompras` | `Boleta` | `venta` |
| `va-cotizacion` | `FacturasVentasCompras` | `Cotizacion` | `venta` |
| `va-guia` | `FacturasVentasCompras` | `Guia` | `venta` |
| `va-notacredito` | `FacturasVentasCompras` | `NotaCredito` | `venta` |
| `c-factura` | `FacturasVentasCompras` | `Factura` | `compra` |
| `c-boleta` | `FacturasVentasCompras` | `boleta` | `compra` |
| `c-guia` | `FacturasVentasCompras` | `Guia` | `compra` |
| `c-notas` | `FacturasVentasCompras` | `NotaPedido` | `compra` |
| `c-orden` | `FacturasVentasCompras` | `OrdenPago` | `compra` |
| `al-notaventa` | `FacturasVentasCompras` | `Nota de venta` | `venta` |
| `vs-factura` | `Facturas` | `Factura` | — |
| `vs-boleta` | `Facturas` | `Boleta` | — |
| `vs-cotizacion` | `Facturas` | `Cotizacion` | — |
| `vs-orden` | `Facturas` | `OrdenTrabajo` | — |
| `vs-notas` | `Facturas` | `Nota de venta` | — |
| `al-vale` | `ValeInsumos` | — | — |
| `cuentasPorCobrar` | `cuentasPorCobrar` | `cuentasPorCobrar` | — |

## Dónde se definen

- **`mapDocKeyToCollection(docKey)`** → `src/store/firestoreDb.js` — mapea docKey a colección Firestore
- **`DOC_TYPE`** → `src/store/firestoreDb.js` y `src/store/firestoreStock.js` — mapea docKey a `tipofactura`
- **`TIPO_OPERACION`** → `src/store/firestoreDb.js` y `src/store/firestoreStock.js` — mapea docKey a `TipoOperacion` (solo para `FacturasVentasCompras`)
- **`useFirestoreDocuments(docKey)`** → `src/store/firestoreDb.js` — hook que aplica los filtros `where("tipofactura")` y opcionalmente `where("TipoOperacion")`

## Notas importantes

1. **Todas las colecciones son top-level** en Firestore (no subcolecciones), igual que en el legacy Flutter.
2. **Los filtros se aplican a nivel Firestore** vía `where()` en la query, no en JavaScript.
3. **`FacturasVentasCompras`** es compartida por ventas de artículos (va-*) y compras (c-*). Se separan con `tipofactura` + `TipoOperacion`.
4. **`Facturas`** es compartida por servicios/taller (vs-*). Se separan solo con `tipofactura` (no tiene `TipoOperacion`).
5. **`cuentasPorCobrar`** es su propia colección aislada.
6. **`ValeInsumos`** usa localStorage (no Firestore), igual que el legacy Flutter.
7. **Los valores `tipofactura` deben coincidir exactamente** con los que usa el legacy Flutter (incluyendo mayúsculas/minúsculas y espacios). `"boleta"` en minúscula para compras, `"Nota de venta"` con espacios, etc.
