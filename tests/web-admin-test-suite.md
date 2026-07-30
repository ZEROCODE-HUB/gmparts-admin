# Suite de Pruebas — Módulo Web Admin

## Stack asumido
- React + JSX (Vite)
- Firebase Firestore
- Firebase Cloud Functions
- pdfMake para PDF
- Custom CSS (no Tailwind)

---

## R1 — PDF de Recepción nunca muestra precios

### R1.1 Impresión desde Recepción (contenido completo)
1. Crear una OT desde Recepción Rápida (App) con estado `Recepción`
2. Abrir la OT en Web Admin → estado `Recepción`
3. Hacer clic en imprimir / descargar PDF
4. **Esperado:** El PDF contiene **todos** los siguientes datos de la recepción:
   - Datos del vehículo: placa, marca, modelo, año, color, kilometraje
   - Datos del cliente: nombre/razón social, documento, dirección, teléfono
   - Fotos del vehículo (si existen)
   - Fecha y hora de ingreso
   - Motivo de ingreso
   - Comentarios del cliente
   - Número de orden / código de documento
5. **Esperado:** El PDF **NO** contiene montos, precios, columnas de valor monetario, ni ningún dato de servicio/reparación.

### R1.2 Impresión desde estado Diagnóstico
1. Avanzar la OT a `Diagnóstico`
2. Agregar servicios y repuestos con precios
3. Descargar PDF
4. **Esperado:** El PDF SÍ muestra los items de servicio/repuesto con sus precios.

### R1.3 Transición Recepción → Diagnóstico no debe heredar precios en PDF
1. OT en Recepción sin precios en PDF ✓
2. Pasar a Diagnóstico, agregar items con precio
3. PDF de Diagnóstico debe mostrar precios
4. **Esperado:** Misma OT, dos PDFs distintos según estado.

---

## R2 — Tiempo estimado de trabajo siempre en horas

### R2.1 Campo en formulario de Servicios
1. Abrir formulario de creación/edición de Servicio
2. Verificar que el campo "tiempo estimado" usa `number` con label o unidad que indique horas
3. **Esperado:** No existe campo en "días". El valor almacenado en Firestore es en horas.

### R2.2 Tiempo en Diagnóstico
1. En el editor de OT, estado Diagnóstico
2. Agregar un diagnóstico con tiempo estimado
3. **Esperado:** El campo de horas acepta decimales (ej: 1.5 horas). Se guarda como número en Firestore.

### R2.3 Reporte/PDF muestra horas
1. Generar PDF de una OT con tiempo estimado
2. **Esperado:** El PDF muestra "X hrs" o "X horas" — nunca "días".

---

## R3 — No se puede aprobar cotización con datos de cliente incompletos

### R3.1 Validación en backend/API
1. Llamar a la Cloud Function `approveCotizacion` (o endpoint correspondiente) con un cliente que tenga `nombre` vacío
2. **Esperado:** La función rechaza con error "Faltan datos del cliente" y código `failed-precondition`

### R3.2 Validación en Firestore rules (si aplica)
1. Intentar escribir `aprobacion_cliente = true` en una OT donde `nombre_cliente` o `Razon_social` esté vacío
2. **Esperado:** La escritura es rechazada por regla de seguridad (o validación server-side)

### R3.3 Mensaje visible en UI
1. En Web Admin, ver una cotización con datos de cliente incompletos
2. **Esperado:** Hay un banner/mensaje visible: "Faltan los datos del cliente — no se puede aprobar"
3. El botón/badge de aprobación está deshabilitado o no se muestra

---

## R4 — Nota de Venta no pasa por SUNAT

### R4.1 Creación de Nota de Venta
1. Crear un comprobante de tipo "Nota de Venta"
2. **Esperado:** El documento se guarda con `sunatEnvio = false` o `sunatEstado = "No aplica"` (o campo similar)

### R4.2 Botón SUNAT invisible en Nota de Venta
1. Ir a la lista de Notas de Venta
2. **Esperado:** No hay botón "Enviar a SUNAT" ni badge de estado SUNAT en esta lista

### R4.3 Factura/Boleta sí tienen botón SUNAT
1. Ir a listas de Factura y Boleta
2. **Esperado:** El botón "Enviar a SUNAT" SÍ está presente (comportamiento actual)

---

## F1 — Flujo completo de estados de OT

### F1.1 Recepción → Diagnóstico
1. OT creada con estado `Recepción`
2. Web Admin permite editar y cambiar a `Diagnóstico`
3. **Esperado:** Al cambiar a Diagnóstico, el formulario muestra secciones para fallas, servicios y repuestos

### F1.2 Diagnóstico → Cotización
1. OT en Diagnóstico con al menos un servicio y un repuesto
2. Cambiar a `Cotización`
3. **Esperado:** El PDF de Cotización muestra mano de obra (horas × precio unitario) y materiales con precios, subtotal, IGV, total

### F1.3 Cotización → Reparación (aprobada)
1. OT en Cotización con datos de cliente completos
2. Marcar como aprobada (simular acción desde App o API)
3. Cambiar a `Reparación`
4. **Esperado:** El detalle de fallas y servicios se hereda de Diagnóstico/Cotización

### F1.4 Reparación → Listo para entrega
1. OT en Reparación
2. Marcar como "Listo para entrega"
3. **Esperado:** El estado cambia y el PDF/consulta muestra la orden como finalizada

### F1.5 Listo para entrega → Entregado + calificación
1. OT en Listo para entrega
2. Cliente califica desde App (1-5 + comentario)
3. **Esperado:** Web Admin muestra la calificación y comentario en el detalle de la OT

### F1.6 Transiciones inválidas
1. Intentar saltar de Recepción directamente a Reparación
2. **Esperado:** El sistema rechaza la transición (error o UI bloqueada)

---

## F2 — Facturación desde Cotización aprobada

### F2.1 Generar Factura desde Cotización
1. OT en estado "Cotización aprobada"
2. Hacer clic en "Generar Factura"
3. **Esperado:** Se crea un nuevo documento tipo Factura con los mismos items, cliente y montos de la cotización

### F2.2 Generar Boleta desde Cotización
1. Mismo flujo que F2.1 pero seleccionando "Boleta"
2. **Esperado:** Se crea una Boleta

### F2.3 Generar Nota de Venta desde Cotización
1. Mismo flujo seleccionando "Nota de Venta"
2. **Esperado:** Se crea una Nota de Venta (sin campo SUNAT)

---

## F3 — Órdenes de Trabajo creadas desde App (Recepciones)

### F3.1 Carga de OT creada en App
1. App crea una OT vía Recepción Rápida
2. Web Admin carga la lista de OT
3. **Esperado:** La OT aparece en `/vs-orden` con estado `Recepción`

### F3.2 Edición desde Web Admin
1. Hacer clic en editar sobre la OT cargada
2. **Esperado:** El editor muestra los datos precargados (cliente, vehículo, motivo, fotos)

### F3.3 Diagnósticos desde Web
1. OT en Diagnóstico desde Web
2. Agregar falla, servicio y repuesto en el editor
3. Guardar
4. **Esperado:** Al recargar, los datos persisten

---

## F4 — Catálogos de Servicios

### F4.1 CRUD de Servicios
1. Crear servicio con nombre, descripción, precio, tiempo estimado (horas)
2. Listar servicio en catálogo
3. Editar servicio
4. Eliminar servicio
5. **Esperado:** Todas las operaciones CRUD funcionan

### F4.2 Servicio visible en Diagnóstico
1. Tener un servicio en el catálogo
2. Abrir OT en Diagnóstico
3. **Esperado:** El servicio aparece en el selector/dropdown de servicios

---

## F5 — Nota de Venta (documento interno)

### F5.1 Creación sin SUNAT
1. Crear Nota de Venta
2. **Esperado:** No hay campo/envió a SUNAT. El documento es válido sin aprobación externa.

### F5.2 Lista separada
1. Ir a "Registro de Notas de Venta"
2. **Esperado:** La lista existe y es accesible desde el menú
