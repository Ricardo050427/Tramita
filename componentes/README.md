# Componentes replicables

Documentación de comportamientos de UI de Sagui para replicarlos en otra aplicación.
Cada carpeta describe **qué hace**, **dónde vive el código** y **cómo está hecho por dentro**,
con rutas de archivo y fragmentos de código para que un LLM (o una persona) pueda reconstruirlo.

| Comportamiento | Archivo |
|---|---|
| Vista previa de PDF (embeber, tarjeta y panel completo) | [`preview-pdf.md`](preview-pdf.md) |
| Llenado de formularios oficiales (entrevista → PDF generado) | [`llenado-formularios.md`](llenado-formularios.md) |

Stack de referencia: Next.js (App Router), React, TypeScript, Tailwind, `pdf-lib`, `motion`.
