# Tramita

Asistente ciudadano para los trámites del Ayuntamiento de Hermosillo. Responde con el catálogo oficial y, además, respalda a la persona frente a la ventanilla: compara lo que le pidieron con lo que la ley permite pedir.

App: https://tramita-blond.vercel.app

Proyecto independiente para el Hackathon de Innovación por la Transparencia y Anticorrupción (Reto 3), Hermosillo, noviembre de 2026. No es un sitio oficial del Ayuntamiento.

## Qué hace

| Pieza | Para qué sirve |
| --- | --- |
| **Preguntar** | Chat con Sagui, por texto, voz o foto. Elige el trámite, dice qué llevar, cuánto cuesta y a dónde ir, y cita la fuente oficial. |
| **Verificador** | La persona escribe o fotografía lo que le pidieron o cobraron. Cada punto se compara con la ficha oficial y con la Ley Nacional para Eliminar Trámites Burocráticos: requisito publicado, no publicado, copia simple, documento que ya emite el Ayuntamiento, cobro distinto o plazo excedido. |
| **Denuncia lista** | Cuando algo no cuadra, arma en el teléfono el escrito que pide la Contraloría (ficha HMO-00025): hechos, contraste con la ficha oficial, fundamento y anexos, con sello de tiempo verificable en OpenTimestamps. Puede ser anónima (LGRA, art. 91). |
| **Hermosillo simplificado** | Simula la Agenda de Simplificación que la ley exige cada enero y julio (arts. 19, 21 y 22): interruptores de la ley, contadores del catálogo, rutas antes y después, prioridades del art. 21, consulta ciudadana y la propuesta en PDF. |
| **Pase para ventanilla** | Tarjeta con los requisitos, costo y plazo publicados y un código QR a la fuente. |
| **Reportes anónimos** | "Algo no cuadra" en un toque. Se publica solo el conteo por trámite y tipo, como datos abiertos. |
| **Observatorio** | Qué tanto cumple cada trámite el artículo 54 de la ley, qué dato falta más y qué pide simplificar el artículo 19. |
| **Bitácora** | Un vigía revisa el catálogo oficial cada mañana y registra cambios de costo, plazo, vigencia, horario y requisitos. |
| **Rutas completas** | Abrir un negocio de comida, construir, comprar casa o vender en la calle: todos los trámites en orden, incluso los externos. |
| **Mis trámites** | Avance de requisitos, conteo de días hábiles desde la entrega, aviso de plazo vencido y recordatorio en el calendario. |
| **Inclusión** | Letra grande, respuestas en palabras sencillas, lectura en voz alta y perfiles opcionales sin datos personales. |

## Datos

- **Catálogo municipal**: 196 trámites de [tramites.hermosillo.gob.mx](https://tramites.hermosillo.gob.mx), consultado el 9 de noviembre de 2026 (`data/tramites.json`).
- **Formatos y guías**: 59 PDF oficiales, algunos se llenan desde la app.
- **Leyes y reglamentos**: 9 ordenamientos municipales y estatales, divididos en 2,322 fragmentos para citarlos (`data/conocimiento.json`).
- **Ley Nacional para Eliminar Trámites Burocráticos** (DOF 16/07/2025): citas literales en `lib/ley.ts`.

## Datos abiertos

- `GET /api/reportes`: resumen de reportes por tipo y trámite (JSON).
- `GET /api/reportes?formato=csv`: todos los reportes, sin el texto que escribió cada persona.
- `data/bitacora.json`: cambios detectados en el catálogo oficial.
- `data/examen.json`: resultado del examen de 50 preguntas.
- `GET /api/votos`: votos de la consulta ciudadana de simplificación.
- `GET /api/agenda`: propuesta de Agenda de Simplificación en PDF.

## Cómo responde la IA

1. Si el dato está en la ficha (costo, horario, teléfono, requisitos, plazo), responde directo, sin IA.
2. Si no, Gemini elige los trámites que aplican entre los 196 del catálogo.
3. Redacta solo con esas fichas y los artículos de ley recuperados.
4. Cada cifra de la respuesta se compara con las fuentes; la línea que trae un número sin respaldo se descarta.
5. En el verificador la IA solo separa lo que se escribió; el veredicto sale de reglas fijas (`lib/verificador.ts`).

## Correr en local

```bash
npm install
npm run dev
```

Variables de entorno: `GEMINI_API_KEY` para la IA y `BLOB_READ_WRITE_TOKEN` para guardar reportes (sin ella se guardan en memoria).

Scripts:

- `node scripts/vigia.mjs`: revisa el catálogo oficial y actualiza la bitácora (también corre cada día en GitHub Actions).
- `BASE=https://tramita-blond.vercel.app node scripts/examen.mjs`: examen de 50 preguntas.

## WhatsApp

Pasos para preparar la cuenta de desarrollador de Meta: [docs/whatsapp-meta.md](docs/whatsapp-meta.md).

## Tecnología

Next.js 16, React 19, Tailwind 4, Motion, Gemini, Vercel (funciones, caché y Blob), GitHub Actions.
