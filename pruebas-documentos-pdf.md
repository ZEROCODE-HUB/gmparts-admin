# Pruebas — Formatos PDF de documentos GM Parts

Cada prueba indica: **objetivo**, **pasos**, **resultado esperado**.

---

## 1. Cabecera

### 1.1 Logo y empresa
- **Objetivo:** Logo y nombre de empresa visibles y consistentes en todos los documentos.
- **Pasos:** Generar PDF de cada tipo: Cotización, Factura Venta, Boleta Venta, Factura Servicio, Boleta Servicio, Factura Compra, Boleta Compra.
- **Resultado esperado:** Mismo logo (80-100px), mismo nombre "GEAR MOTOR PARTS S.A.C." (16px bold, sin italic), mismos datos fiscales (dirección, teléfono, email) en todos.

### 1.2 Bloque RUC/tipo/número
- **Objetivo:** Mismo bloque en todos los documentos: RUC + tipo doc + número + fecha.
- **Pasos:** Comparar bloque derecho de la cabecera en los 7 tipos.
- **Resultado esperado:** Borde 1.5px, RUC 11px bold, tipo doc 13px bold, número 11px bold. Fecha incluida.

### 1.3 Título correcto
- **Objetivo:** Cada documento muestra su tipo real.
- **Pasos:** Generar cada tipo.
- **Resultado esperado:**
  - Cotización → "COTIZACIÓN"
  - Factura Venta → "FACTURA ELECTRÓNICA" o "FACTURA"
  - Boleta Venta → "BOLETA ELECTRÓNICA" o "BOLETA"
  - Factura Servicio → "FACTURA ELECTRÓNICA"
  - Boleta Servicio → "BOLETA ELECTRÓNICA"
  - Factura Compra → "FACTURA ELECTRÓNICA"
  - Boleta Compra → "BOLETA ELECTRÓNICA"
  - Nunca "COMPROBANTE" genérico

---

## 2. Datos del cliente/receptor

### 2.1 Estructura unificada
- **Objetivo:** Todos los documentos usan la misma estructura visual.
- **Pasos:** Comparar bloque de datos.
- **Resultado esperado:** Caja con borde, labels en bold, valores en regular. Distribución 2 columnas.

### 2.2 Labels correctos por tipo
- **Pasos:** Revisar label según documento.
- **Resultado esperado:**
  - Cotización: "CLIENTE" / "NOMBRE COMPLETO" / "RAZÓN SOCIAL" según `natural`
  - Factura/Boleta Venta: "CLIENTE"
  - Factura/Boleta Compra: "PROVEEDOR"

---

## 3. Datos del vehículo y servicio

### 3.1 Vehículo en documentos que corresponden
- **Objetivo:** Solo aparece en documentos con datos de vehículo.
- **Pasos:** Revisar cada tipo según spec.
- **Resultado esperado:**
  - Cotización: Incluye DATOS DEL VEHÍCULO (con sección de título gris)
  - Factura Venta: Incluye si hay datos (placa/marca/modelo/km)
  - Boleta Venta: Incluye si hay datos
  - Factura Servicio: Incluye si hay datos
  - Compra: NO tiene datos de vehículo

### 3.2 Condiciones comerciales
- **Objetivo:** Aparecen en Cotización (forma pago, moneda, lugar, plazo, validez).
- **Resultado esperado:** Solo Cotización tiene bloque CONDICIONES COMERCIALES.

### 3.3 Service block
- **Objetivo:** Aparece en Cotización (fecha servicio, tipo servicio, N° OR).
- **Resultado esperado:** Solo Cotización tiene bloque SERVICE.

### 3.4 Estructura visual consistente
- **Objetivo:** Datos de vehículo usan el mismo formato en todos los documentos.
- **Resultado esperado:** Mismos títulos, misma distribución 3 columnas, mismo espaciado.

---

## 4. Tabla de ítems

### 4.1 Columnas correctas
- **Objetivo:** Mismas columnas en todos los documentos.
- **Pasos:** Comparar tablas.
- **Resultado esperado:** ITEM | DESCRIPCIÓN | UNIDAD | CANT | PRECIO | TOTAL

### 4.2 Alineación y formato
- **Objetivo:** Precios con S/, cantidades centradas.
- **Resultado esperado:** Precios con formato `S/ x.xx`, alineados a derecha. Cantidades centradas.

### 4.3 Encabezado con fondo gris
- **Objetivo:** Fila de encabezado con #EEEEEE.
- **Resultado esperado:** Mismo estilo en todos.

### 4.4 Unidad dinámica
- **Objetivo:** Unidad se muestra según tipo de ítem.
- **Resultado esperado:** `HRS` para servicio/mano_obra, `UND` para repuesto, valor del ítem si existe.

### 4.5 Numeración automática
- **Objetivo:** Columna ITEM numerada automáticamente (1, 2, 3...).
- **Resultado esperado:** Todos los documentos tienen ITEM auto-numerado.

### 4.6 Mínimo de filas
- **Objetivo:** Tabla se completa con filas vacías hasta un mínimo visual.
- **Resultado esperado:** Mínimo 10 filas de datos (o más si hay más ítems).

---

## 5. Totales

### 5.1 Bloques de totales consistentes
- **Objetivo:** Mismo diseño en todos los documentos.
- **Pasos:** Comparar bloque de totales.
- **Resultado esperado:** Op. Gravada, IGV (18%), Importe Total. Misma fuente, alineación, espaciado.

### 5.2 Rectángulo con borde
- **Objetivo:** Totales dentro de un bloque con borde.
- **Resultado esperado:** Recuadro con borde, alineado a la derecha, ~180px de ancho.

### 5.3 Subtotal
- **Objetivo:** Línea "SUB TOTAL" o "OP. GRAVADA".
- **Resultado esperado:** Label + valor en S/.

### 5.4 IGV
- **Objetivo:** Línea "I.G.V. (18%)".
- **Resultado esperado:** Label + valor en S/.

### 5.5 Importe Total
- **Objetivo:** Línea "IMP. TOTAL" en bold.
- **Resultado esperado:** Label bold + valor bold en S/.

### 5.6 "SON:" con total en letras
- **Objetivo:** Texto "SON:" + monto en palabras.
- **Resultado esperado:** Visible en todos los documentos.

### 5.7 Sin desbordamiento
- **Objetivo:** Ningún valor se sale del área imprimible.
- **Pasos:** Probar con total alto (S/ 1,000,000.00).
- **Resultado esperado:** Todo contenido dentro del bloque.

---

## 6. Parte inferior

### 6.1 Cuentas bancarias
- **Objetivo:** Mismas cuentas en todos los documentos.
- **Pasos:** Revisar bloque de cuentas.
- **Resultado esperado:** BCP CTA CTE, BCP CTA CCI, BN DETRACCIÓN. Mismo formato.

### 6.2 Textos SUNAT
- **Objetivo:** Solo en facturas/boletas electrónicas.
- **Resultado esperado:**
  - Factura Venta: "Representación impresa de la FACTURA ELECTRÓNICA" + SUNAT text
  - Boleta Venta: "Representación impresa de la BOLETA ELECTRÓNICA"
  - Factura Compra: Mismo
  - Cotización: NO tiene textos SUNAT

### 6.3 Fecha de vencimiento
- **Objetivo:** Solo en facturas de venta (próximo mes).
- **Resultado esperado:** "FECHA DE VENCIMIENTO:" en rojo solo en Factura Venta.

### 6.4 Sin QR
- **Objetivo:** QR eliminado de todos los documentos.

### 6.5 Sin logo ERP inferior
- **Objetivo:** Logo inferior eliminado de todos los documentos.

---

## 7. Tipo correcto de documento

### 7.1 Boleta de artículos
- **Objetivo:** Usa plantilla Boleta, no Factura.
- **Pasos:** Crear boleta VA, generar PDF.
- **Resultado esperado:** Título "BOLETA ELECTRÓNICA". Estructura correcta.

### 7.2 Boleta de servicios
- **Objetivo:** Usa plantilla Boleta, no Cotización.
- **Pasos:** Crear boleta VS, generar PDF.
- **Resultado esperado:** Título "BOLETA ELECTRÓNICA". Sin formato de cotización.

### 7.3 Factura de servicios
- **Objetivo:** Usa plantilla Factura.
- **Pasos:** Crear factura VS, generar PDF.
- **Resultado esperado:** Título "FACTURA ELECTRÓNICA".

### 7.4 Cotización de artículos
- **Objetivo:** Usa plantilla Cotización.
- **Pasos:** Crear cotización VA, generar PDF.
- **Resultado esperado:** Título "COTIZACIÓN". Datos de vehículo incluidos.

---

## 8. Regresiones

### 8.1 Generación correcta
- **Objetivo:** Todos los PDFs se generan sin error.
- **Pasos:** Generar PDF de cada tipo.
- **Resultado esperado:** Sin errores en consola.

### 8.2 Datos correctos
- **Objetivo:** Los datos en el PDF coinciden con el documento.
- **Pasos:** Comparar formulario vs PDF.
- **Resultado esperado:** Cliente, RUC, items, totales coinciden exactamente.

### 8.3 Sin cambios en cálculos
- **Objetivo:** Subtotal, IGV, total no se modifican.
- **Resultado esperado:** Valores idénticos al formulario.

---

## Resumen

| Sección | Pruebas |
|---------|---------|
| 1. Cabecera | 3 |
| 2. Datos del cliente | 2 |
| 3. Vehículo/servicio | 4 |
| 4. Tabla de ítems | 6 |
| 5. Totales | 7 |
| 6. Parte inferior | 5 |
| 7. Tipo correcto | 4 |
| 8. Regresiones | 3 |
| **Total** | **34** |
