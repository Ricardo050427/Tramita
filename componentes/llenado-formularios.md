# Llenado de formularios oficiales

Entrevista paso a paso que rellena un PDF oficial **en el dispositivo del usuario** (sin enviar
datos a ningún servidor) y devuelve el PDF listo para descargar/imprimir/firma.

Flujo: `preguntas → validación → revisión → generación del PDF (pdf-lib) → descargar/compartir`.

## Dónde vive

| Pieza | Archivo | Rol |
|---|---|---|
| Ruta | `app/(principal)/llenar/[id]/page.tsx` | `generateStaticParams` + `<LlenarFormato id/>` dentro de `<Detalle>` |
| Wizard | `components/llenar.tsx` | `Entrevista`, `Campo`, `Revision`, `Resultado`, `LlenarFormato` |
| Esquema | `lib/llenado.ts` | Tipos `Formato/Paso/Pregunta`, validaciones, perfil en localStorage |
| Generación | `lib/llenar-pdf.ts` | `rellenarPdf()` con `pdf-lib` (cliente) |

## 1. El esquema (`lib/llenado.ts`)

Cada formato es una entrevista declarativa + un mapa de coordenadas sobre la hoja 1 del PDF.

```ts
type Pregunta = {
  id: string; etiqueta: string;
  tipo?: "texto"|"numero"|"tel"|"correo"|"rfc"|"curp"|"cp";
  ayuda?: string; ejemplo?: string; obligatoria?: boolean; max?: number;
  opciones?: { valor: string; etiqueta: string }[];   // → grupo de píldoras
  visibleSi?: (r: Respuestas) => boolean;              // pregunta condicional
};
type Paso = { id: string; titulo: string; mensaje: string; preguntas: Pregunta[] };
type Formato = {
  id: string; clave: string; titulo: string; archivo: string; // ruta del PDF base
  pasos: Paso[];
  textos: { p: string; x0: number; x1: number; y: number }[]; // casillas de texto
  marcas: { p: string; valor: string; x: number; y: number }[]; // casillas de "X"
  fecha?: { x: number; y: number };                             // fecha de hoy
};
```

**Coordenadas:** medidas sobre la hoja 1 dibujada a **1000 px de ancho**; `y` es el **borde
inferior** de la casilla. `x0/x1` delimitan el ancho disponible del texto.

Helpers exportados: `preguntasVisibles(paso, r)` (filtra por `visibleSi`), `errorDe(p, valor)`
(regex por `tipo`), `valorDe(id, r)` (resuelve copias, p. ej. notificación = predio salvo
"otro domicilio"), `leerPerfil/guardarPerfil/borrarPerfil` (localStorage `tramita:perfil`,
solo con la lista blanca `DATOS_RECORDADOS`), `esLlenable/formatoPorId/idsFormatos`.

## 2. La entrevista (`components/llenar.tsx` → `Entrevista`)

Estado clave:
- `actual` (índice de paso) + `direccion` (+1/−1) para la animación de desliz.
- `r: Respuestas` arranca con `{ n_igual: "igual", n_municipio: "Hermosillo", ...leerPerfil() }`
  (recuerda datos entre formatos).
- `errores`, `generando`, `generado`, `borrado`.

UI:
- **Barra de progreso segmentada**: un segmento por paso (+1 de revisión), se llena con
  `i <= actual`. Etiqueta "Paso X de N" / "Último paso".
- **`Campo`** por pregunta visible:
  - `opciones` → `<fieldset>` de radios estilizados como píldoras (`peer-checked` invierte
    colores; el `<input>` real queda invisible pero accesible).
  - resto → input controlado con máscaras (`MAXIMOS`, `TECLADO`: tel/cp numéricos, rfc/curp
    mayúsculas sin espacios).
- **`siguiente()`**: valida todas las preguntas visibles del paso con `errorDe`; si hay error,
  guarda en `errores` y hace `focus()` al primero; si no, `guardarPerfil(r)` y avanza.
- Al terminar los pasos → `enRevision` muestra **`Revision`**: resumen de solo lectura por paso
  con botón "Cambiar" que salta a ese paso.
- En revisión, el botón pasa a **"Generar mi PDF"** → `generar()`.
- Texto de privacidad fijo: *"Tus datos se quedan en este dispositivo…"*.
- Botón "Siguiente"/"Anterior" en barra inferior `sticky`.

`LlenarFormato` usa `useSyncExternalStore(suscribir, () => true, () => false)` para renderizar
la entrevista **solo en el navegador** (el perfil vive en localStorage; evita mismatch de
hidratación y el render en servidor).

## 3. Generación del PDF (`lib/llenar-pdf.ts`)

```ts
const { rellenarPdf } = await import("@/lib/llenar-pdf");       // import dinámico (cliente, pesado)
const resp = await fetch(`/documentos/${formato.archivo}`);     // PDF base oficial
const { bytes, recortados } = await rellenarPdf(await resp.arrayBuffer(), formato, r);
const archivo = new File([bytes], `${formato.titulo}.pdf`, { type: "application/pdf" });
setGenerado({ url: URL.createObjectURL(archivo), archivo, recortados });
```

`rellenarPdf` (pdf-lib):
- `PDFDocument.load(original, { ignoreEncryption: true })`, fuente Helvetica/HelveticaBold.
- `k = anchoPagina / 1000` para escalar las coordenadas del esquema.
- Por cada `texto`: `escribible()` normaliza y **elimina todo lo no-latino1** (emojis rompen
  la fuente estándar); auto-reduce tamaño de 10 a 5.5 pt para caber en `x0..x1`; si aún no cabe,
  **recorta** y lo reporta en `recortados` (la UI avisa: "Un dato no cupo…").
- Por cada `marca`: si `r[p] === valor`, dibuja una "X" centrada en `(x, y)`.
- `fecha`: estampa la fecha de hoy (`es-MX`, `America/Hermosillo`).

`Resultado`: Descargar / Compartir (`navigator.canShare({files})`) / Ver + "Lo que sigue"
(revisar, firmar a mano, llevar documentos) + "Corregir un dato" y "Borrar mis datos".

## Claves para replicar

1. **Esquema declarativo**: separa las preguntas (qué se pide) de las coordenadas (dónde se
   escribe). Nuevos formatos = nueva entrada en `FORMATOS`, sin tocar el wizard.
2. **Condicionales con `visibleSi`** y `valorDe` para derivar respuestas (copias).
3. **Validación por `tipo`** con regex centralizado; enfoca el primer error.
4. **Perfil local** con lista blanca de campos recordados; borrable por el usuario.
5. **PDF 100% cliente**: `pdf-lib` con import dinámico; coordenadas normalizadas a 1000 px;
   auto-shrink + truncado con aviso; sanitizar a latin1.
6. **Revisión antes de generar**: pantalla de solo lectura con "Cambiar" por paso.
