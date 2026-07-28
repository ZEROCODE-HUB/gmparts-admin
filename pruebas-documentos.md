# Pruebas — Creación de documentos (Facturas y Boletas)

Cada prueba indica: **objetivo**, **pasos**, **resultado esperado**.

---

## 1. Factura de Venta (va-factura)

### 1.1 Crear factura con datos válidos
- **Objetivo:** Verificar que se genera una factura correctamente.
- **Pasos:**
  1. Ir a `/va-factura/nuevo`.
  2. Seleccionar cliente, almacén, forma de pago, moneda, tipo IGV.
  3. Agregar un artículo.
  4. Hacer clic en "Generar documento".
- **Resultado esperado:** Factura creada en Firebase. Redirige a la lista. Sin errores.

### 1.2 Error sin cliente
- **Resultado esperado:** Botón "Generar documento" muestra error "Seleccione..." cerca del botón.

### 1.3 Error sin artículos
- **Resultado esperado:** Error "Seleccione articulos" cerca del botón.

### 1.4 Error sin almacén
- **Resultado esperado:** Error "Seleccione almacen" cerca del botón.

---

## 2. Boleta de Venta (va-boleta)

### 2.1 Crear boleta con datos válidos
- **Pasos:** Mismo flujo que factura pero en `/va-boleta/nuevo`.
- **Resultado esperado:** Boleta creada en Firebase.

---

## 3. Factura de Servicio (vs-factura)

### 3.1 Crear factura de servicio
- **Pasos:** Ir a `/vs-factura/nuevo`, seleccionar cliente, agregar servicio/artículo.
- **Resultado esperado:** Creada en Firebase.

### 3.2 Error sin artículos
- **Resultado esperado:** Error "Seleccione articulos" cerca del botón.

---

## 4. Boleta de Servicio (vs-boleta)

### 4.1 Crear boleta de servicio
- **Pasos:** Mismo flujo que factura servicio.
- **Resultado esperado:** Creada en Firebase.

---

## 5. Factura de Compra (c-factura)

### 5.1 Crear factura de compra
- **Pasos:** Ir a `/c-factura/nuevo`, seleccionar proveedor, agregar artículo.
- **Resultado esperado:** Creada en Firebase.

### 5.2 Error sin proveedor
- **Resultado esperado:** Error "Seleccione..." cerca del botón.

---

## 6. Boleta de Compra (c-boleta)

### 6.1 Crear boleta de compra
- **Pasos:** Mismo flujo que factura compra en `/c-boleta/nuevo`.
- **Resultado esperado:** Creada en Firebase.

---

## 7. Errores cerca del botón submit

### 7.1 DocumentEditor
- **Objetivo:** El error debe aparecer junto al botón "Generar documento", no arriba.
- **Pasos:** Intentar generar sin completar campos.
- **Resultado esperado:** Mensaje de error visible justo encima de los botones Cancelar/Generar.

### 7.2 CompraEditor
- **Objetivo:** Mismo comportamiento.
- **Resultado esperado:** Error visible junto al botón submit.

### 7.3 ServicioEditor
- **Objetivo:** Mismo comportamiento.
- **Resultado esperado:** Error visible junto al botón submit.
