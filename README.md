# GM Parts — Panel de administración

Panel web del taller: recepciones, inventario, compras, cobranza y **facturación
electrónica ante SUNAT** a través de Factiliza. React 19 + Vite.

## Pruebas

Hay tres suites y solo la primera se ejecuta sola. Las otras dos dependen de algo externo,
y por eso van aparte: `npm run check` tiene que poder correr sin red.

| Comando | Qué prueba | Necesita |
|---|---|---|
| `npm run check` | lint + build + 246 pruebas | nada |
| `npm run test:reglas` | reglas de Firestore, rol por rol | Java y el emulador |
| `npm run test:facturacion` | camino feliz de facturación contra el QA **real** de Factiliza | token y red |

### `test:facturacion`

Es la que cubre donde hay dinero de por medio: emitir → declarar ante SUNAT → descargar el
PDF y el XML firmados → anular con nota de crédito. Existe porque los cuatro fallos que
aparecieron ahí estaban en el **contrato con Factiliza**, no en nuestra aritmética, y
ninguna prueba offline podía verlos.

```
FACTILIZA_INVOICE_TOKEN=<token de facturación> npm run test:facturacion
```

Emite 3 documentos de verdad por pasada, en una cuenta DEMO **compartida con otro
proyecto**, con un correlativo derivado del reloj en una banda alta para no chocar con su
numeración. No tiene valor fiscal, pero no conviene lanzarla en bucle.

Está comprobada contra sí misma: deshaciendo a mano la corrección del correlativo caen 2
pruebas, y la del RUC de descarga, 1. Una suite que nunca ha estado en rojo no demuestra
nada.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
