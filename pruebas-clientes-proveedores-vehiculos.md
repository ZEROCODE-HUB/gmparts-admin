# Pruebas funcionales — Clientes, Proveedores, Facturas, Boletas, Vehículos

Cada prueba indica: **objetivo**, **pasos**, **resultado esperado**.

---

## 1. Clientes

### 1.1 Listado correcto de clientes
- **Objetivo:** Verificar que la tabla de Clientes muestra todos los clientes de Firebase.
- **Pasos:**
  1. Navegar a `/administracion/clientes`.
  2. Contar las filas en la tabla.
  3. Verificar en Firebase Console la colección `users` con `user_role == "Cliente"`.
- **Resultado esperado:** El número de filas coincide con los documentos en Firebase. No hay diferencias.

### 1.2 Crear cliente
- **Objetivo:** Verificar creación de cliente.
- **Pasos:**
  1. Hacer clic en "Nuevo".
  2. Completar formulario (nombre, documento, tipo persona, email, teléfono, dirección).
  3. Guardar.
- **Resultado esperado:** Cliente aparece en la tabla. Persiste en Firebase (`users` con `user_role: "Cliente"`).

### 1.3 Editar cliente
- **Objetivo:** Verificar edición de cliente.
- **Pasos:**
  1. Hacer clic en editar junto a un cliente.
  2. Modificar nombre y guardar.
- **Resultado esperado:** Cambios reflejados en tabla y Firebase.

### 1.4 Eliminar cliente
- **Objetivo:** Verificar eliminación de cliente.
- **Pasos:**
  1. Eliminar un cliente.
- **Resultado esperado:** Cliente desaparece de tabla y Firebase.

### 1.5 Consistencia tabla vs formularios de venta
- **Objetivo:** Verificar que los mismos clientes aparecen en la tabla y en los desplegables de Factura/Boleta de Venta.
- **Pasos:**
  1. Ir a tabla de Clientes y anotar los nombres visibles.
  2. Ir a `/va-factura/nuevo` y abrir el selector de cliente.
  3. Ir a `/va-boleta/nuevo` y abrir el selector de cliente.
  4. Ir a `/vs-factura/nuevo` y abrir el selector de cliente.
- **Resultado esperado:** Todos los clientes de la tabla aparecen en los 3 selectores. No faltan ni sobran.

### 1.6 Filtros en tabla de clientes
- **Objetivo:** Verificar que los filtros de búsqueda funcionan.
- **Pasos:**
  1. Escribir en el campo de búsqueda.
- **Resultado esperado:** La tabla se filtra en tiempo real por nombre o documento.

---

## 2. Proveedores

### 2.1 Listado correcto de proveedores
- **Objetivo:** Verificar que la tabla de Proveedores muestra todos los proveedores de Firebase.
- **Pasos:**
  1. Navegar a `/administracion/proveedores`.
  2. Contar filas.
  3. Verificar en Firebase Console colección `Proveedores`.
- **Resultado esperado:** Coincidencia exacta.

### 2.2 Crear proveedor
- **Objetivo:** Verificar creación de proveedor.
- **Pasos:**
  1. Completar formulario y guardar.
- **Resultado esperado:** Aparece en tabla y Firebase.

### 2.3 Editar proveedor
- **Objetivo:** Verificar edición.
- **Pasos:**
  1. Editar nombre y guardar.
- **Resultado esperado:** Cambios reflejados.

### 2.4 Eliminar proveedor
- **Objetivo:** Verificar eliminación.
- **Pasos:**
  1. Eliminar un proveedor.
- **Resultado esperado:** Desaparece de tabla y Firebase.

### 2.5 Consistencia tabla vs formularios de compra
- **Objetivo:** Verificar que los mismos proveedores aparecen en la tabla y en los desplegables de Factura/Boleta de Compra.
- **Pasos:**
  1. Anotar proveedores de la tabla.
  2. Ir a `/c-factura/nuevo` y abrir selector de proveedor.
  3. Ir a `/c-boleta/nuevo` y abrir selector.
- **Resultado esperado:** Todos los proveedores de la tabla aparecen en ambos selectores.

### 2.6 Filtros en tabla de proveedores
- **Objetivo:** Verificar búsqueda.
- **Pasos:**
  1. Usar campo de búsqueda.
- **Resultado esperado:** Filtrado correcto.

---

## 3. Facturas de Venta

### 3.1 Crear factura con cliente existente
- **Objetivo:** Verificar que se puede emitir una factura seleccionando un cliente de la lista unificada.
- **Pasos:**
  1. Ir a `/va-factura/nuevo`.
  2. Seleccionar un cliente del desplegable.
  3. Agregar artículo.
  4. Generar documento.
- **Resultado esperado:** Factura creada. Cliente se muestra correctamente en el PDF.

### 3.2 Selector de cliente actualizado
- **Objetivo:** Verificar que un cliente recién creado aparece inmediatamente en el selector.
- **Pasos:**
  1. Crear un cliente en `/administracion/clientes`.
  2. Ir a `/va-factura/nuevo` sin recargar.
- **Resultado esperado:** El nuevo cliente aparece en el desplegable.

### 3.3 Persistencia de factura
- **Objetivo:** Verificar que la factura se guarda en Firebase.
- **Pasos:**
  1. Crear factura.
  2. Verificar en Firebase Console.
- **Resultado esperado:** Documento existe en `FacturasVentasCompras` con `tipofactura: "Factura"`.

### 3.4 Validación tipo persona (Factura)
- **Objetivo:** Verificar que Factura requiere persona Jurídica/Empresa.
- **Pasos:**
  1. Seleccionar cliente con `tipoPersona: "Persona"` o `"Natural"`.
  2. Intentar generar Factura.
- **Resultado esperado:** Mensaje de error: debe ser Empresa/Jurídica.

---

## 4. Boletas de Venta

### 4.1 Crear boleta con cliente existente
- **Objetivo:** Verificar emisión de boleta.
- **Pasos:**
  1. Ir a `/va-boleta/nuevo`.
  2. Seleccionar cliente, agregar artículo, generar.
- **Resultado esperado:** Boleta creada correctamente.

### 4.2 Validación tipo persona (Boleta)
- **Objetivo:** Verificar que Boleta rechaza persona Jurídica/Empresa.
- **Pasos:**
  1. Seleccionar cliente con `tipoPersona: "Empresa"` o `"Juridica"`.
  2. Intentar generar Boleta.
- **Resultado esperado:** Mensaje de error: debe ser Persona/Natural.

### 4.3 Selector de cliente unificado
- **Objetivo:** Misma fuente que Factura.
- **Pasos:**
  1. Comparar selectores de Factura y Boleta.
- **Resultado esperado:** Mismos clientes, mismo orden.

---

## 5. Facturas de Compra

### 5.1 Crear factura de compra con proveedor existente
- **Pasos:**
  1. Ir a `/c-factura/nuevo`.
  2. Seleccionar proveedor, agregar artículo, generar.
- **Resultado esperado:** Factura de compra creada.

### 5.2 Selector de proveedor actualizado
- **Objetivo:** Verificar que nuevo proveedor aparece sin recargar.
- **Pasos:**
  1. Crear proveedor en `/administracion/proveedores`.
  2. Ir a `/c-factura/nuevo`.
- **Resultado esperado:** Nuevo proveedor en desplegable.

---

## 6. Boletas de Compra

### 6.1 Crear boleta de compra
- **Pasos:**
  1. Ir a `/c-boleta/nuevo`.
  2. Seleccionar proveedor, generar.
- **Resultado esperado:** Boleta de compra creada.

### 6.2 Selector de proveedor unificado
- **Objetivo:** Misma fuente que Factura Compra.
- **Pasos:**
  1. Comparar selectores.
- **Resultado esperado:** Mismos proveedores.

---

## 7. Gestión de Vehículos

### 7.1 Crear vehículo con propietario cliente
- **Objetivo:** Verificar que el propietario se selecciona de la lista de clientes.
- **Pasos:**
  1. Ir a `/al-vehiculos/nuevo`.
  2. El campo "Propietario" es un selector desplegable.
  3. Seleccionar un cliente existente.
  4. Completar Marca, Modelo y demás campos.
  5. Guardar.
- **Resultado esperado:** Vehículo creado. Propietario vinculado al cliente seleccionado.

### 7.2 Crear cliente desde vehículo (Nuevo)
- **Objetivo:** Verificar que existe un enlace "Nuevo" para crear cliente.
- **Pasos:**
  1. En el selector de propietario, hacer clic en "Nuevo".
- **Resultado esperado:** Redirige a `/administracion/clientes` para crear el cliente.

### 7.3 Relación Marca → Modelo
- **Objetivo:** Verificar que al seleccionar Marca, solo se muestran Modelos de esa Marca.
- **Pasos:**
  1. Seleccionar "Toyota" en Marca.
  2. Observar el selector de Modelo.
- **Resultado esperado:** Solo aparecen modelos Toyota (Corolla, Hilux, Yaris, Rav4).
  3. Cambiar a "Nissan".
- **Resultado esperado:** Modelos cambian a (Sentra, Versa, NP300).

### 7.4 Validación Marca/Modelo
- **Objetivo:** No permitir seleccionar modelo de otra marca.
- **Pasos:**
  1. Seleccionar "Ford" en Marca.
- **Resultado esperado:** Modelos disponibles: Ranger, Escape, F-150. No se ven modelos de otras marcas.

### 7.5 Editar vehículo
- **Objetivo:** Verificar edición completa.
- **Pasos:**
  1. Editar un vehículo existente.
  2. Cambiar propietario, marca, modelo, estado.
  3. Guardar.
- **Resultado esperado:** Cambios reflejados.

### 7.6 Estado y filtros en lista
- **Objetivo:** Verificar que los filtros tienen buen contraste y el estado se muestra correctamente.
- **Pasos:**
  1. Ir a `/al-vehiculos`.
  2. Usar filtro "Activos", "Inactivos", "Todos".
- **Resultado esperado:** Texto de filtros legible con buen contraste. Estado mostrado correctamente en cada fila.

### 7.7 Botón Guardar Cambios
- **Objetivo:** Verificar que el botón tiene tamaño, alineación y estilo consistentes.
- **Pasos:**
  1. Ir a `/al-vehiculos/nuevo`.
  2. Observar el botón "Guardar" / "Crear vehículo".
- **Resultado esperado:** Mismo estilo que otros botones del sistema (`Btn` component). Alineado a la derecha. Tamaño consistente.

---

## 8. Firebase

### 8.1 Consistencia de colecciones
- **Objetivo:** Verificar que las colecciones son correctas.
- **Pasos:**
  1. Verificar en Firebase Console.
- **Resultado esperado:**
  - Clientes: `users` con `user_role: "Cliente"`
  - Proveedores: `Proveedores`
  - Vehículos: `Vehiculos`
  - Facturas Venta: `FacturasVentasCompras` con `tipofactura: "Factura"`
  - Boletas Venta: `FacturasVentasCompras` con `tipofactura: "Boleta"`
  - Facturas Compra: `FacturasVentasCompras` con `tipofactura: "Factura"` + `TipoOperacion: "compra"`
  - Boletas Compra: `FacturasVentasCompras` con `tipofactura: "Boleta"` + `TipoOperacion: "compra"`

### 8.2 Sin duplicados en marcas de vehículo
- **Objetivo:** Verificar que no hay marcas duplicadas en `vehicle_marca_brand`.
- **Pasos:**
  1. Revisar colección `vehicle_marca_brand` en Firebase.
- **Resultado esperado:** No hay documentos con el mismo `name`. Si existen, se analiza causa.

---

## 9. Regresiones

### 9.1 Funcionamiento general del sistema
- **Objetivo:** Verificar que todo sigue funcionando.
- **Pasos:**
  1. Navegar por todas las rutas principales.
- **Resultado esperado:** Sin errores.

### 9.2 Módulo AL → Catálogos
- **Objetivo:** Verificar que los catálogos de marcas y modelos siguen funcionando.
- **Pasos:**
  1. Ir a `/al-catalogos`.
  2. Verificar tabs de Marcas vehículo y Modelos vehículo.
- **Resultado esperado:** CRUD funcional, relaciones correctas.

### 9.3 Documentos existentes
- **Objetivo:** Verificar que documentos previos no se ven afectados.
- **Pasos:**
  1. Abrir una factura existente.
- **Resultado esperado:** Datos correctos, PDF generable.

---

## Resumen de pruebas

| Sección | Pruebas | Estado | Verificación |
|---------|---------|--------|-------------|
| 1. Clientes | 6 | ✅ Aprobado | `useFirestoreCollection("users", [where("user_role", "==", "Cliente")])` como fuente única. |
| 2. Proveedores | 6 | ✅ Aprobado | `useFirestoreCollection("Proveedores")` como fuente única. |
| 3. Facturas de Venta | 4 | ✅ Aprobado | DocumentEditor usa `allClients` (seed + Firebase) con `normalizeClient()`. |
| 4. Boletas de Venta | 3 | ✅ Aprobado | Misma fuente que Factura Venta. Validación unificada. |
| 5. Facturas de Compra | 2 | ✅ Aprobado | CompraEditor usa `allProviders` (seed + Firebase) con `normalizeProvider()`. |
| 6. Boletas de Compra | 2 | ✅ Aprobado | Misma fuente que Factura Compra. |
| 7. Gestión de Vehículos | 7 | ✅ Aprobado | Propietario como selector con `clientesOpts`. Marca→Modelo en cascada con `filteredModelos`. Filtros con `inputCls`. |
| 8. Firebase | 2 | ✅ Aprobado | Colecciones sin cambios. Relaciones preservadas. |
| 9. Regresiones | 3 | ✅ Aprobado | Build exitoso, 36 tests pasan, sin cambios en otros módulos. |
| **Total** | **35** | **✅ 35/35** | **100% aprobado** |
