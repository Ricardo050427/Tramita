# Tramita

## Purpose
Asistente ciudadano para acceder a los servicios públicos de Hermosillo. Una persona pregunta con sus propias palabras, por texto, voz o foto, y recibe qué necesita, cuánto cuesta, a dónde ir y cómo hacerlo, con la fuente oficial a la vista.

Prototipo para el Hackathon de Innovación por la Transparencia y Anticorrupción (Tema 3), 10 y 11 de noviembre de 2026, Universidad Kino. Proyecto independiente, no es un producto oficial del Ayuntamiento.

## Users
Vecinas y vecinos de Hermosillo con un trámite común (agua, predial, reportes, apoyos), desde el celular y con prisa. Construcción y negocios existen en el catálogo, pero quedan en un segundo nivel.

## Mechanism and position
La organización es su mayor fuerte: todo es muy fácil de identificar, y cada trámite se presenta siempre con la misma estructura. El chatbot es rápido, accesible, predictivo (anticipa lo que buscas) y reactivo (se adapta a lo que escribes, dictas o adjuntas).

## Capabilities
- Chat con IA sobre el catálogo municipal (196 trámites).
- Dictado por voz.
- Pegar o subir imágenes y archivos ligeros.
- Sugerencias mientras se escribe y siguiente paso tras cada respuesta.

## Constraints
- Responde con fuentes oficiales. Si no tiene el dato, lo dice y remite a la dependencia.
- Sin gasto adicional: Gemini en plan gratuito. Google puede usar lo enviado, así que la app pide no subir datos personales reales.
- Adjuntos sin guardar en el servidor. Historial solo en el dispositivo.
- Uso principal en celular (iPhone y Samsung), responsiva en tablet y PC.

## Brand commitments
- Naranja como color principal, por el sitio del Ayuntamiento (`#E96000`).
- Sin logo ni escudo oficial.
- Español de México, claro y cercano.

## Accessibility
WCAG AA, áreas táctiles de 44 px, y respeto a la preferencia de reducir movimiento.

## Platform
web

## Stack
Next.js, TypeScript, Tailwind, Motion, Gemini API, Vercel.
