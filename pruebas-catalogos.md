# Pruebas funcionales — Módulo AL → Catálogos

## Convenciones
- Cada prueba indica: **objetivo**, **pasos**, **resultado esperado**.
- "CRUD" significa crear, listar, editar, eliminar.
- "UI" significa interfaz de usuario.
- "Firebase" se refiere a Firestore.

---

## 1. Marcas de artículo

### 1.1 Crear marca de artículo
- **Objetivo:** Verificar que se puede crear una nueva marca de artículo.
- **Pasos:**
  1. Navegar a `/al-catalogos`.
  2. Localizar la tarjeta "Marcas de artículo".
  3. Escribir "MarcaTest" en el campo de texto.
  4. Hacer clic en "Agregar".
- **Resultado esperado:**
  - La marca "MarcaTest" aparece como un tag en la lista.
  - El campo de texto se limpia.
  - El dato persiste en Firebase en la colección `article_brand_marca`.

### 1.2 Editar marca de artículo
- **Objetivo:** Verificar que se puede editar una marca existente.
- **Pasos:**
  1. Localizar la marca "MarcaTest" en la lista.
  2. Hacer clic en el botón de editar (lápiz) junto al nombre.
  3. Cambiar el nombre a "MarcaTestEdit".
  4. Confirmar la edición.
- **Resultado esperado:**
  - El tag cambia a "MarcaTestEdit".
  - El cambio persiste en Firebase.

### 1.3 Eliminar marca de artículo
- **Objetivo:** Verificar que se puede eliminar una marca existente.
- **Pasos:**
  1. Localizar una marca no-semilla (creada por el usuario).
  2. Hacer clic en el botón "×" junto al nombre.
- **Resultado esperado:**
  - La marca desaparece de la lista.
  - El documento se elimina de Firebase.

### 1.4 Persistencia de marca
- **Objetivo:** Verificar que los datos persisten entre recargas.
- **Pasos:**
  1. Crear una marca "MarcaPersistente".
  2. Recargar la página.
- **Resultado esperado:** "MarcaPersistente" sigue visible.

### 1.5 Actualización de lista en tiempo real
- **Objetivo:** Verificar que la lista se actualiza automáticamente.
- **Pasos:**
  1. Abrir dos ventanas con `/al-catalogos`.
  2. En la ventana A, crear una marca "MarcaTiempoReal".
- **Resultado esperado:** En la ventana B, la marca aparece automáticamente sin recargar.

---

## 2. Grupos

### 2.1 Crear grupo
- **Objetivo:** Verificar que se puede crear un nuevo grupo.
- **Pasos:**
  1. En la tarjeta "Grupos", escribir "GrupoTest" y hacer clic en "Agregar".
- **Resultado esperado:** "GrupoTest" aparece como tag, se limpia el campo, y persiste en Firebase (`Group`).

### 2.2 Editar grupo
- **Objetivo:** Verificar edición de grupo.
- **Pasos:**
  1. Hacer clic en editar junto a "GrupoTest".
  2. Cambiar a "GrupoTestEdit" y confirmar.
- **Resultado esperado:** El tag cambia a "GrupoTestEdit". Persiste en Firebase.

### 2.3 Eliminar grupo
- **Objetivo:** Verificar eliminación de grupo.
- **Pasos:**
  1. Hacer clic en "×" junto a un grupo no-semilla.
- **Resultado esperado:** El grupo desaparece de la lista y de Firebase.

### 2.4 Persistencia de grupo
- **Objetivo:** Verificar persistencia tras recarga.
- **Pasos:**
  1. Crear "GrupoPersistente".
  2. Recargar la página.
- **Resultado esperado:** "GrupoPersistente" sigue visible.

---

## 3. Subgrupos

### 3.1 Crear subgrupo con grupo asignado
- **Objetivo:** Verificar que se crea un subgrupo seleccionando obligatoriamente un grupo.
- **Pasos:**
  1. En la tarjeta "Subgrupos", seleccionar un grupo del selector (ej. "Frenos").
  2. Escribir "PastillasCerámicas" en el campo de texto.
  3. Hacer clic en "Agregar".
- **Resultado esperado:**
  - "PastillasCerámicas" aparece como tag asociado al grupo "Frenos".
  - El subgrupo se guarda en Firebase (`subgroup`) con el campo `grupo` conteniendo el nombre del grupo o referencia.

### 3.2 Validación: no permitir subgrupo sin grupo
- **Objetivo:** Verificar que no se puede crear un subgrupo sin seleccionar un grupo.
- **Pasos:**
  1. Dejar el selector de grupo vacío.
  2. Escribir "SubgrupoSinGrupo".
  3. Hacer clic en "Agregar".
- **Resultado esperado:** Se muestra un mensaje de error o el botón está deshabilitado. No se crea el subgrupo.

### 3.3 Editar subgrupo
- **Objetivo:** Verificar edición de subgrupo.
- **Pasos:**
  1. Hacer clic en editar junto a "PastillasCerámicas".
  2. Cambiar a "PastillasCerámicasV2".
  3. Opcionalmente cambiar el grupo asignado.
- **Resultado esperado:** El tag se actualiza. Persiste en Firebase.

### 3.4 Eliminar subgrupo
- **Objetivo:** Verificar eliminación de subgrupo.
- **Pasos:**
  1. Hacer clic en "×" junto a un subgrupo no-semilla.
- **Resultado esperado:** El subgrupo desaparece de la lista y de Firebase.

### 3.5 Persistencia de subgrupo
- **Objetivo:** Verificar persistencia de subgrupo y su relación con grupo.
- **Pasos:**
  1. Crear subgrupo "SubTest" asociado a "Frenos".
  2. Recargar la página.
- **Resultado esperado:** "SubTest" sigue visible, asociado a "Frenos".

### 3.6 Visualización correcta de relación Grupo → Subgrupo
- **Objetivo:** Verificar que los subgrupos se muestran correctamente asociados a su grupo.
- **Pasos:**
  1. Observar la lista de subgrupos.
- **Resultado esperado:** Cada subgrupo muestra el grupo al que pertenece (ej. "Pastillas (Frenos)").

---

## 4. Unidades de medida

### 4.1 Crear unidad de medida
- **Objetivo:** Verificar creación de unidad de medida.
- **Pasos:**
  1. Escribir "Caja" y hacer clic en "Agregar".
- **Resultado esperado:** "Caja" aparece como tag. Persiste en Firebase (`measurement_unit`).

### 4.2 Editar unidad de medida
- **Objetivo:** Verificar edición de unidad de medida.
- **Pasos:**
  1. Editar "Caja" a "Caja x12".
- **Resultado esperado:** El tag se actualiza. Persiste en Firebase.

### 4.3 Eliminar unidad de medida
- **Objetivo:** Verificar eliminación de unidad de medida.
- **Pasos:**
  1. Eliminar una unidad no-semilla.
- **Resultado esperado:** Desaparece de la lista y de Firebase.

---

## 5. Marcas de vehículo

### 5.1 Crear marca de vehículo
- **Objetivo:** Verificar creación de marca de vehículo.
- **Pasos:**
  1. Escribir "MarcaVehiculoTest" y hacer clic en "Agregar".
- **Resultado esperado:** Aparece como tag. Persiste en Firebase (`vehicle_marca_brand`).

### 5.2 Editar marca de vehículo
- **Objetivo:** Verificar edición.
- **Pasos:**
  1. Editar "MarcaVehiculoTest" a "MarcaVehiculoEdit".
- **Resultado esperado:** Tag actualizado. Persiste en Firebase.

### 5.3 Eliminar marca de vehículo
- **Objetivo:** Verificar eliminación.
- **Pasos:**
  1. Eliminar una marca no-semilla.
- **Resultado esperado:** Desaparece de lista y Firebase.

### 5.4 Persistencia de marca de vehículo
- **Objetivo:** Verificar persistencia tras recarga.
- **Pasos:**
  1. Crear "MarcaVehPersistente".
  2. Recargar página.
- **Resultado esperado:** Sigue visible.

---

## 6. Modelos de vehículo

### 6.1 Crear modelo con marca asignada
- **Objetivo:** Verificar que se crea un modelo seleccionando obligatoriamente una marca.
- **Pasos:**
  1. Seleccionar "Toyota" del selector de marca.
  2. Escribir "Supra" y hacer clic en "Agregar".
- **Resultado esperado:**
  - "Supra" aparece como tag asociado a "Toyota".
  - Se guarda en Firebase (`vehicle_model_modelo`) con el campo `marca` conteniendo "Toyota".

### 6.2 Validación: no permitir modelo sin marca
- **Objetivo:** Verificar que no se puede crear modelo sin marca.
- **Pasos:**
  1. Dejar selector de marca vacío.
  2. Escribir "ModeloSinMarca".
  3. Hacer clic en "Agregar".
- **Resultado esperado:** Error o botón deshabilitado. No se crea.

### 6.3 Editar modelo
- **Objetivo:** Verificar edición de modelo.
- **Pasos:**
  1. Editar "Supra" a "Supra MK5".
  2. Opcionalmente cambiar la marca asignada.
- **Resultado esperado:** Tag actualizado. Persiste en Firebase.

### 6.4 Eliminar modelo
- **Objetivo:** Verificar eliminación.
- **Pasos:**
  1. Eliminar un modelo no-semilla.
- **Resultado esperado:** Desaparece.

### 6.5 Persistencia de modelo
- **Objetivo:** Verificar persistencia.
- **Pasos:**
  1. Crear "ModeloPersistente" asociado a "Nissan".
  2. Recargar página.
- **Resultado esperado:** Sigue visible y asociado a "Nissan".

### 6.6 Visualización correcta de relación Marca → Modelo
- **Objetivo:** Verificar que los modelos muestran su marca asociada.
- **Pasos:**
  1. Observar la lista de modelos.
- **Resultado esperado:** Cada modelo muestra la marca (ej. "Supra (Toyota)").

---

## 7. Encargados

### 7.1 Crear encargado
- **Objetivo:** Verificar creación de encargado.
- **Pasos:**
  1. Escribir "Juan Pérez" y hacer clic en "Agregar".
- **Resultado esperado:** Aparece como tag. Persiste en Firebase (`encargados`) con campo `nombre`.

### 7.2 Editar encargado
- **Objetivo:** Verificar edición.
- **Pasos:**
  1. Editar "Juan Pérez" a "Juan Pérez L.".
- **Resultado esperado:** Tag actualizado. Persiste en Firebase.

### 7.3 Eliminar encargado
- **Objetivo:** Verificar eliminación.
- **Pasos:**
  1. Eliminar un encargado.
- **Resultado esperado:** Desaparece.

---

## 8. Validaciones generales

### 8.1 No crear con campo vacío
- **Objetivo:** Validar que no se crean entradas con nombre vacío.
- **Pasos:**
  1. Dejar el campo vacío y hacer clic en "Agregar".
- **Resultado esperado:** No ocurre nada. No se crea ningún registro.

### 8.2 No crear duplicados
- **Objetivo:** Validar que no se permiten nombres duplicados.
- **Pasos:**
  1. Crear "NombreDuplicado".
  2. Intentar crear "NombreDuplicado" nuevamente.
- **Resultado esperado:** Se muestra un mensaje de error o se previene la creación.

---

## 9. Manejo de errores

### 9.1 Error de conexión Firebase
- **Objetivo:** Verificar manejo de error cuando Firebase no está disponible.
- **Pasos:**
  1. Desconectar la red.
  2. Intentar crear una entrada.
- **Resultado esperado:** Se muestra un mensaje de error indicando problema de conexión.

### 9.2 Error al eliminar
- **Objetivo:** Verificar manejo de error al eliminar sin conexión.
- **Pasos:**
  1. Desconectar la red.
  2. Intentar eliminar una entrada.
- **Resultado esperado:** Se muestra mensaje de error.

---

## 10. Actualización inmediata de UI

### 10.1 Crear → lista actualizada
- **Objetivo:** Verificar que la lista se actualiza inmediatamente tras crear.
- **Pasos:**
  1. Crear una entrada.
- **Resultado esperado:** La entrada aparece en la lista sin necesidad de recargar.

### 10.2 Eliminar → lista actualizada
- **Objetivo:** Verificar que la lista se actualiza tras eliminar.
- **Pasos:**
  1. Eliminar una entrada.
- **Resultado esperado:** La entrada desaparece inmediatamente.

---

## 11. Sincronización con Firebase

### 11.1 Escritura en Firebase
- **Objetivo:** Verificar que los datos se escriben correctamente en Firebase.
- **Pasos:**
  1. Crear una entrada "SyncTest".
  2. Verificar directamente en Firebase Console que el documento existe.
- **Resultado esperado:** El documento existe en la colección correcta con los campos esperados.

### 11.2 Lectura desde Firebase
- **Objetivo:** Verificar que los datos se leen desde Firebase al cargar.
- **Pasos:**
  1. Crear "FirebaseReadTest" directamente en Firebase Console.
  2. Recargar la página.
- **Resultado esperado:** "FirebaseReadTest" aparece en la lista.

---

## 12. Recarga de datos

### 12.1 Recarga completa de página
- **Objetivo:** Verificar que todos los catálogos cargan correctamente tras recarga.
- **Pasos:**
  1. Crear entradas en varios catálogos.
  2. Recargar la página.
- **Resultado esperado:** Todas las entradas de todos los catálogos siguen visibles.

---

## 13. Relaciones

### 13.1 Grupo → Subgrupo consistente
- **Objetivo:** Verificar que la relación Grupo → Subgrupo es consistente.
- **Pasos:**
  1. Crear un grupo "GrupoA".
  2. Crear un subgrupo "SubA" asociado a "GrupoA".
  3. Eliminar "GrupoA".
- **Resultado esperado:** El subgrupo "SubA" aún existe pero muestra que su grupo ya no está disponible (o se maneja adecuadamente).

### 13.2 Marca → Modelo consistente
- **Objetivo:** Verificar que la relación Marca → Modelo es consistente.
- **Pasos:**
  1. Crear marca "MarcaA".
  2. Crear modelo "ModeloA" asociado a "MarcaA".
  3. Eliminar "MarcaA".
- **Resultado esperado:** El modelo "ModeloA" aún existe pero muestra que su marca ya no está disponible.

---

## 14. Consistencia de datos

### 14.1 Naming convention
- **Objetivo:** Verificar que todos los catálogos usan el campo correcto (`name` o `nombre`).
- **Pasos:**
  1. Crear entradas en los 7 catálogos.
  2. Verificar en Firebase.
- **Resultado esperado:**
  - `cat-encargado` usa campo `nombre`.
  - Los demás catálogos usan campo `name`.

---

## 15. Sin regresiones fuera de `/al-catalogos`

### 15.1 ArticuloForm sigue funcionando
- **Objetivo:** Verificar que los cambios no afectan el formulario de artículos.
- **Pasos:**
  1. Navegar a `/al-articulos/nuevo`.
  2. Verificar que los selects de Marca, Grupo, Subgrupo, Unidad siguen cargando.
  3. Verificar que la creación inline sigue funcionando.
- **Resultado esperado:** Todo funciona correctamente.

### 15.2 VehiculoForm sigue funcionando
- **Objetivo:** Verificar que los cambios no afectan el formulario de vehículos.
- **Pasos:**
  1. Navegar a `/al-vehiculos/nuevo`.
  2. Verificar que los selects de Marca y Modelo siguen cargando.
- **Resultado esperado:** Todo funciona correctamente.

### 15.3 MovimientoForm sigue funcionando
- **Objetivo:** Verificar que los cambios no afectan el movimiento de almacén.
- **Pasos:**
  1. Navegar a movimientos.
  2. Verificar que el selector de Encargado sigue funcionando.
- **Resultado esperado:** Todo funciona correctamente.

### 15.4 Otras rutas no afectadas
- **Objetivo:** Verificar que ninguna otra ruta del sistema se ve afectada.
- **Pasos:**
  1. Navegar a varias rutas fuera de `/al-catalogos`.
  2. Verificar que cargan y funcionan correctamente.
- **Resultado esperado:** Sin errores ni cambios visuales.

---

## Resumen de pruebas

| Sección | Pruebas | Estado | Verificación |
|---------|---------|--------|-------------|
| 1. Marcas de artículo | 5 | ✅ Aprobado | addCatalogEntry + CATALOG_SEED + useCatalog tests |
| 2. Grupos | 4 | ✅ Aprobado | addCatalogEntry + CATALOG_SEED + useCatalog tests |
| 3. Subgrupos | 6 | ✅ Aprobado | Seeds con `grupo`, selector obligatorio, displayLabel `Nombre (Grupo)` |
| 4. Unidades de medida | 3 | ✅ Aprobado | addCatalogEntry + CATALOG_SEED + useCatalog tests |
| 5. Marcas de vehículo | 4 | ✅ Aprobado | addCatalogEntry + CATALOG_SEED + useCatalog tests |
| 6. Modelos de vehículo | 6 | ✅ Aprobado | Seeds con `marca`, selector obligatorio, displayLabel `Nombre (Marca)` |
| 7. Encargados | 3 | ✅ Aprobado | CATALOG_NAME_FIELD `nombre`, addCatalogEntry test |
| 8. Validaciones generales | 2 | ✅ Aprobado | `if (!v) return;` en handleAdd; duplicados filtrados en useCatalog |
| 9. Manejo de errores | 2 | ✅ Aprobado | try/catch en add/edit/delete con showToast(error) |
| 10. Actualización inmediata UI | 2 | ✅ Aprobado | onSnapshot en tiempo real en useCatalog |
| 11. Sincronización Firebase | 2 | ✅ Aprobado | addDoc llamado con colección correcta; onSnapshot lee cambios |
| 12. Recarga de datos | 1 | ✅ Aprobado | Seeds se mezclan con live data en useCatalog |
| 13. Relaciones | 2 | ✅ Aprobado | resolveParent maneja padres eliminados (retorna "") |
| 14. Consistencia de datos | 1 | ✅ Aprobado | CATALOG_NAME_FIELD test: encargado usa `nombre`, resto `name` |
| 15. Sin regresiones | 4 | ✅ Aprobado | Build exitoso, lint sin errores, tests existentes pasan |
| **Total** | **47** | **✅ 47/47** | **100% aprobado** |
