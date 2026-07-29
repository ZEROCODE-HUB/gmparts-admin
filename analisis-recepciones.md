# Análisis completo — Módulo de Recepciones (Ordenes de Trabajo)

## Ciclo de vida completo vs implementación actual

---

## 1. Estados del ciclo de vida

### Original (FlutterFlow)
```
Recepción → Diagnóstico → (cotización PDF) → Reparación → Finalizado
```

### Web admin actual
```
Recepción → Diagnóstico → Cotización* → Reparación → Finalizado
```
*Estado "Cotización" agregado en web admin, NO existe en FlutterFlow original.

### Estado "Cotización" es un invento del web admin
En FlutterFlow la cotización es solo un PDF generado al vuelo desde los diagnósticos. No hay un estado persistente "Cotización". El web admin lo agregó como estado para separar visualmente OT en espera de aprobación vs en reparación. No está mal, pero no estaba en el original.

---

## 2. ¿Dónde se guardan los datos?

| Dato | FlutterFlow | Web Admin |
|---|---|---|
| OT / Recepción | `recepciones/{id}` | `recepciones/{id}` (vía `useFirestoreCollection("recepciones")`) |
| Diagnósticos | Subcolección `recepciones/{id}/diagnosticos/{id}` | Array embebido `diagnosticos` en la recepción + se sincroniza a subcolección |
| Repuestos | Struct embebido dentro de cada diagnóstico | Array `repuestos` dentro de cada diagnóstico (embebido) |
| Cotización | Solo PDF (NO persistente) | `Facturas` con `tipofactura: "Cotizacion"` (persistente) |
| Factura/Boleta | `Facturas` collection | `Facturas` (vs-*) o `FacturasVentasCompras` (va-*) |

**Problema:** Los diagnósticos en web admin se guardan como array embebido en la recepción Y como subcolección. El guardado en subcolección solo ocurre al generar factura (`firestoreStock.js:299-319`). Hay riesgo de inconsistencia.

---

## 3. Flujo de creación de documentos desde OT

### En FlutterFlow (original)
```
OT Finalizada → Botón "Facturar" → ServicioEditor → genera Factura en colección Facturas
                                                      → marca facturado=true en OT
```

### En Web Admin (actual)
```
OrdenTrabajoList.jsx → Botón "Generar factura" → ServicioEditor.jsx con location.state.fromOT
                      → firestoreSaveDocument("vs-factura", doc)
                      → db.markRecepcionFacturada(otId)
```

Ambos flujos son similares. El web admin tiene la ventaja de que el `ServicioEditor` puede crear facturas/boletas con los items de la OT.

---

## 4. Gaps encontrados

### 🔴 Gap 1: Diagnosticos como array embebido vs subcolección
- **Problema:** Web admin guarda diagnosticos como array en la recepción. FirestoreStock los escribe a subcolección SOLO al facturar. Si alguien ve la OT antes de facturar, los diagnósticos solo existen en el array embebido. Si se consulta desde la app móvil (que lee subcolección), no los ve.
- **Solución:** Escribir diagnosticos como subcolección EN EL MOMENTO de crearlos (no al facturar).

### 🔴 Gap 2: Cotización no es persistente en FlutterFlow
- **Problema:** El original no guarda cotizaciones como documentos. Solo genera PDF. Si se pierde, no hay registro.
- **Web admin:** Ya mejora esto guardando en `Facturas` con `tipofactura: "Cotizacion"`. Pero la cotización de servicio usa `vs-cotizacion` que va a `Facturas`. La de artículos usa `va-cotizacion` que va a `FacturasVentasCompras`. Son flujos separados.

### 🟡 Gap 3: No hay aprobación de cotización
- **Original:** Tiene campos `aprobacion_cliente` y `aprobacion_cotizacion` booleanos, más enlace de aprobación externo.
- **Web admin:** No implementa estos campos. No hay forma de registrar si el cliente aprobó la cotización.

### 🟡 Gap 4: Control de calidad no implementado
- **Original:** Campos `Controlcalidad1/2/3` y `Clientecontrolcalidad1/2/3/4` en la recepción.
- **Web admin:** No existen estos campos en el editor.

### 🟡 Gap 5: Sin fotos/imágenes
- **Original:** Múltiples campos de fotos en cada etapa (ingreso, diagnóstico, finalización).
- **Web admin:** No hay manejo de imágenes.

### 🟢 Gap 6: Sin registro de cambios de estado (audit log)
- Ninguno de los dos sistemas tiene auditoría de cambios de estado.

### 🟢 Gap 7: Sin validación de transiciones de estado
- Se puede saltar de "Recepción" directo a "Finalizado" sin pasar por diagnóstico ni reparación.

### 🟢 Gap 8: Repuestos sin control de stock al cotizar
- Cuando se agregan repuestos a un diagnóstico, no se verifica stock disponible ni se reserva.

---

## 5. Lo que el web admin tiene MEJOR que el original

| Aspecto | Web Admin | FlutterFlow |
|---|---|---|
| Cotización persistente | ✅ Guarda en Firebase como documento | ❌ Solo PDF volátil |
| Control de stock | ✅ `updateArticleStockByCode` atómico | ❌ Acciones custom frágiles |
| Kardex | ✅ `createKardexEntries` al facturar | ❌ No implementado |
| Cuentas por cobrar | ✅ Auto-creación al emitir a crédito | ❌ Manual |
| Correlativos automáticos | ✅ `getNextCorrelative` con `increment()` | ❌ Contador manual |
| Unificación facturas/boletas servicios | ✅ Mismo `ServicioEditor` para ambos | ❌ Widgets separados |

---

## 6. Mapa de archivos involucrados

| Archivo | Rol |
|---|---|
| `src/pages/ventas/servicios/OrdenTrabajoList.jsx` | Lista de OT con filtros por estado (Recepción, Diagnóstico, Cotización, Reparación, Finalizado) |
| `src/pages/ventas/servicios/OrdenTrabajoEditor.jsx` | Creación/edición de OT con formulario de recepción, diagnósticos, repuestos |
| `src/pages/ventas/servicios/CotizacionServicioList.jsx` | Lista de cotizaciones de servicio (vs-cotizacion) con filtro por estado |
| `src/components/documents/ServicioEditor.jsx` | Editor de documentos de servicio (Factura/Boleta/Cotización) |
| `src/pages/ventas/servicios/EmisionFacturaTallerList.jsx` | Lista de facturas de taller |
| `src/pages/ventas/servicios/EmisionBoletaTallerList.jsx` | Lista de boletas de taller |
| `src/store/firestoreStock.js` | Lógica de stock, kardex, cuentas, y escritura de diagnósticos a subcolección |
| `src/store/firestoreDb.js` | Mapeo de docKeys y hooks Firestore |

---

## 7. Resumen de hallazgos

| # | Hallazgo | Severidad | Origen |
|---|---|---|---|
| 1 | Diagnosticos embebidos vs subcolección (inconsistencia) | 🔴 Alta | Web admin |
| 2 | Cotización no persistente en original | 🔴 Alta | FlutterFlow (diseño) |
| 3 | Sin aprobación de cotización | 🟡 Media | Ambos |
| 4 | Sin control de calidad | 🟡 Media | Ambos |
| 5 | Sin fotos | 🟡 Media | Ambos |
| 6 | Sin auditoría de estados | 🟢 Baja | Ambos |
| 7 | Sin validación de transiciones | 🟢 Baja | Ambos |
| 8 | Stock no verificado al cotizar | 🟢 Baja | Ambos |
| 9 | Web admin tiene mejor control de stock | ✅ Mejora | Web admin |
| 10 | Web admin tiene cuentas por cobrar automáticas | ✅ Mejora | Web admin |
