# Vista previa de PDF

Cómo se muestra el PDF oficial de un trámite/formato **dentro de la app**, sin salir a otra pestaña.
Hay dos niveles: una **vista previa embebida** (iframe) dentro de tarjetas/paneles, y un
**visor completo** a pantalla completa con el PDF a la izquierda y contexto/chat a la derecha.

## Dónde vive

Todo el marcado está en `components/sagui-app.tsx`; los estilos en `app/globals.css`.

| Pieza | Símbolo | Rol |
|---|---|---|
| `VisorPdf` | `sagui-app.tsx` ~603 | El `<iframe>` que embebe el PDF |
| `DocumentoNecesario` | ~622 | Tarjeta de un PDF: meta + botones + preview colapsable |
| `DetallePanel` | ~655 | Panel lateral/derecho que lista los PDFs de una respuesta |
| `PanelDocumento` | ~1277 | Visor completo (diálogo) usado desde Formatos |

## 1. El iframe (`VisorPdf`)

```tsx
<iframe
  title={`Vista previa: ${d.titulo}`}
  src={`${rutaDocumento(d)}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
  loading="lazy"
/>
```

- `rutaDocumento(d)` resuelve la URL pública del PDF (local en `/documentos/...` o externa).
- El fragmento `#toolbar=0&navpanes=0&scrollbar=0&view=FitH` intenta ocultar la barra del visor
  y encajar el ancho. **Ojo:** Chrome ignora estos parámetros dentro de `<iframe>` (solo los
  respeta en navegación de nivel superior), así que en la práctica el visor del navegador
  puede mostrar su barra igual. No hay forma limpia de quitarla en un iframe; por eso el visor
  completo (`PanelDocumento`) le da todo el alto disponible.
- Solo se monta cuando se abre (`abierto ? <VisorPdf/> : null`) para no cargar todos los PDF
  de golpe. `loading="lazy"` refuerza lo mismo.
- Si el PDF no es local (`!d.archivo`) se muestra un aviso con botón al sitio oficial.

CSS: `.visor iframe{ width:100%; height:min(520px,62dvh); border:0; background:#fff }`.
En el visor completo se sobrescribe: `.vd-pdf .visor iframe{ flex:1; height:auto; min-height:0 }`.

## 2. Tarjeta de documento (`DocumentoNecesario`)

Estructura `.pdf-doc` → `.pdf-doc-top` (icono + título + subtítulo + botón guardar) +
`.pdf-doc-btns` (tres acciones) + preview condicional.

Botones:
- **Vista previa / Cerrar vista previa** — alterna `abierto` (estado local por documento).
- **Abrir** — `<a target="_blank">` al PDF (enlace externo, para descargar/abrir).
- **Llenar** — `<Link href={/llenar/${d.id}}>` solo si `esLlenable(d.id)` (ver
  `llenado-formularios.md`).

El preview arranca abierto solo para el primer documento cuando el panel se abrió pidiendo
el formato: `abierto = id in abiertos ? abiertos[id] : a.tipo === "formato" && id === docs[0]?.id`.

## 3. Panel de detalle (`DetallePanel`)

`aside.pdf-panel` dentro del chat. Lista, en orden de importancia según el tipo de respuesta
(`formato`, `ruta`, `cercano`, `chat`), los bloques: docs → ficha → plan → ayuda.

Responsive (ver `app/globals.css`):
- **≥1100px:** panel acoplado a la derecha; el chat y el compositor se recorren
  (`.main[data-pdf="1"] .chat-scroll/composer`).
- **821–1099px:** tarjeta flotante debajo del header + scrim.
- **≤820px:** **pantalla completa** (`inset:0`, `z-index:70`, sin scrim), con
  `padding-top: env(safe-area-inset-top)`.

## 4. Visor completo (`PanelDocumento`)

Diálogo `.visor-doc` (grid de 2 columnas): izquierda `.vd-izq` con el `VisorPdf` ocupando todo
el alto (`flex:1`), derecha `.vd-der` con descripción, botones (Llenar conmigo, Guardar),
fuente y un chat contextual (`ChatDocumento`). En ≤860px se apila: PDF arriba
(`max-height:52dvh`), contenido abajo.

## Claves para replicar

1. **No precargar iframes**: renderiza el `<iframe>` solo cuando el usuario abre la preview.
2. **Lazy + fragmentos de PDF**: `loading="lazy"` y `#toolbar=0&view=FitH` (sabiendo que Chrome
   en iframe puede ignorarlos).
3. **Responsive por breakpoint**: panel lateral → tarjeta → pantalla completa; ajusta el layout
   del contenido detrás (padding/margin) para que no quede tapado.
4. **Reutiliza un visor dedicado** para lectura seria; el preview inline es solo un vistazo.
