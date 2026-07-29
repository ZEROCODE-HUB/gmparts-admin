# Pruebas — Observaciones de funcionalidad

Cada prueba indica: **objetivo**, **pasos**, **resultado esperado**.

---

## 1. Catalogos — Cascada Marca → Modelo

### 1.1 Crear modelo con marca seleccionada
- **Objetivo:** Al seleccionar una marca en el selector, solo deben aparecer los modelos de esa marca.
- **Pasos:**
  1. Ir a `/al-catalogos`.
  2. Seleccionar la pestaña "Modelos de vehículo".
  3. En el selector "Marca", elegir "Toyota".
  4. Observar el selector de "Modelo" (si existe) o la lista de modelos creados.
- **Resultado esperado:** Solo se muestran modelos Toyota (Corolla, Hilux, Yaris, Rav4). No aparecen modelos de otras marcas.

### 1.2 Cambiar marca actualiza modelos
- **Pasos:**
  1. Con "Toyota" seleccionado, cambiar a "Nissan".
- **Resultado esperado:** La lista cambia a modelos Nissan (Sentra, Versa, NP300).

---

## 2. Catalogos — Cascada Grupo → Subgrupo

### 2.1 Crear subgrupo con grupo seleccionado
- **Objetivo:** Al seleccionar un grupo, solo deben aparecer los subgrupos de ese grupo.
- **Pasos:**
  1. Ir a `/al-catalogos`.
  2. Seleccionar la pestaña "Subgrupos".
  3. En el selector "Grupo", elegir "Frenos".
  4. En el campo "Nombre", escribir "Pastillas Test".
  5. Hacer clic en "Agregar".
- **Resultado esperado:** El subgrupo se crea asociado a "Frenos". En la lista se muestra como "Pastillas Test (Frenos)".

---

## 3. VehiculoForm — Fechas SOAT, ITV, GNV

### 3.1 SOAT como selector de fecha
- **Objetivo:** El campo SOAT exp. debe ser un input tipo date, no texto libre.
- **Pasos:**
  1. Ir a `/al-vehiculos/nuevo`.
  2. Localizar el campo "SOAT exp.".
- **Resultado esperado:** El campo muestra un selector de fecha (`<input type="date">`), no un input de texto.

### 3.2 ITV como selector de fecha
- **Objetivo:** Mismo comportamiento que SOAT.
- **Resultado esperado:** Campo "ITV exp." es un selector de fecha.

### 3.3 GNV como selector de fecha
- **Objetivo:** Mismo comportamiento.
- **Resultado esperado:** Campo "GNV exp." es un selector de fecha.

---

## 4. VehiculoForm — Loader al guardar

### 4.1 Indicador de carga al crear vehículo
- **Objetivo:** Al hacer clic en "Crear vehículo", debe mostrarse un indicador de carga.
- **Pasos:**
  1. Completar datos del vehículo.
  2. Hacer clic en "Crear vehículo".
- **Resultado esperado:** El botón muestra un spinner o estado "Guardando..." y se deshabilita hasta que la operación termine.

### 4.2 Indicador de carga al editar vehículo
- **Pasos:**
  1. Editar un vehículo existente.
  2. Hacer clic en "Guardar cambios".
- **Resultado esperado:** Mismo comportamiento: botón con loading, deshabilitado durante la operación.

---

## 5. Ordenamiento de listas — Más reciente primero

### 5.1 Facturas de Venta (va-factura)
- **Objetivo:** La lista debe mostrar la factura más reciente primero.
- **Pasos:**
  1. Ir a `/va-factura`.
- **Resultado esperado:** Documentos ordenados por fecha descendente (el más nuevo arriba).

### 5.2 Boletas de Venta (va-boleta)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/va-boleta`.
- **Resultado esperado:** Orden descendente por fecha.

### 5.3 Facturas de Servicio (vs-factura)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/vs-factura`.
- **Resultado esperado:** Orden descendente.

### 5.4 Boletas de Servicio (vs-boleta)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/vs-boleta`.
- **Resultado esperado:** Orden descendente.

### 5.5 Facturas de Compra (c-factura)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/c-factura`.
- **Resultado esperado:** Orden descendente.

### 5.6 Boletas de Compra (c-boleta)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/c-boleta`.
- **Resultado esperado:** Orden descendente.

### 5.7 Guías de Remisión (c-guia, va-guia)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/c-guia`.
  2. Ir a `/va-guia`.
- **Resultado esperado:** Orden descendente.

### 5.8 Cotizaciones (va-cotizacion, vs-cotizacion)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/va-cotizacion`.
  2. Ir a `/vs-cotizacion`.
- **Resultado esperado:** Orden descendente.

### 5.9 Nota de Venta (al-notaventa)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/al-nota-venta`.
- **Resultado esperado:** Orden descendente.

### 5.10 Nota de Crédito (va-notacredito)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/va-notacredito`.
- **Resultado esperado:** Orden descendente.

### 5.11 Vale de Insumos (al-vale-insumos)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/al-vale-insumos`.
- **Resultado esperado:** Orden descendente.

### 5.12 Orden de Trabajo (vs-orden)
- **Objetivo:** Mismo orden.
- **Pasos:**
  1. Ir a `/vs-orden`.
- **Resultado esperado:** Orden descendente.

---

## 6. Recepciones en vs-orden

### 6.1 Listado de todas las recepciones sin importar estado
- **Objetivo:** La lista vs-orden debe mostrar recepciones de TODOS los estados.
- **Pasos:**
  1. Ir a `/vs-orden`.
  2. Verificar que se ven recepciones con estados: Recepción, Diagnóstico, Cotización, Reparación, Finalizado.
- **Resultado esperado:** La tabla incluye documentos con cualquier valor en `status`.

### 6.2 Recepción creada desde app móvil es visible
- **Objetivo:** Una recepción creada desde la app FlutterFlow aparece inmediatamente en vs-orden.
- **Pasos:**
  1. Crear recepción en la app móvil (cliente "2909 test").
  2. Abrir `/vs-orden` en el web admin.
- **Resultado esperado:** La recepción aparece en la lista. El campo `status` puede ser "Recepción", "Diagnóstico", etc.

---

## 7. PDF de recepción / cotización desde app móvil

### 7.1 Generar PDF desde vs-orden
- **Objetivo:** El botón de imprimir en vs-orden debe generar un PDF sin errores.
- **Pasos:**
  1. Ir a `/vs-orden`.
  2. Hacer clic en el ícono de impresión junto a una recepción.
- **Resultado esperado:** Se abre el modal de PrintDocument con opciones de descargar/imprimir. Sin errores en consola.

---

## Resumen

| Sección | Pruebas | Estado |
|---------|---------|--------|
| 1. Catalogos Marca→Modelo | 2 | Pendiente |
| 2. Catalogos Grupo→Subgrupo | 1 | Pendiente |
| 3. VehiculoForm fechas | 3 | Pendiente |
| 4. VehiculoForm loader | 2 | Pendiente |
| 5. Ordenamiento listas | 12 | Pendiente |
| 6. Recepciones vs-orden | 2 | Pendiente |
| 7. PDF desde vs-orden | 1 | Pendiente |
| **Total** | **23** | **0/23** |
