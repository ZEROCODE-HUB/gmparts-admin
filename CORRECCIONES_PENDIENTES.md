# Correcciones Pendientes

## Reportadas
- [x] `+` buttons no agregan items al seleccionar del datalist (DocumentEditor, ServicioEditor, MovimientoForm) — Fixed

## Por revisar en tanda 3

### DocumentEditor.jsx
- [ ] Select de cliente siempre muestra "Selecciona cliente" (value="") incluso en edición — no refleja el cliente precargado

### ServicioEditor.jsx
- [ ] `tipoDoc` y `observacion` no se cargan desde datos existentes en modo edición
- [ ] Select de cliente no actualiza `tipoDoc` al cambiar cliente

### MovimientoForm.jsx
- [ ] No tiene carga de datos existentes en modo edición (`isEdit` no usa seed data)
