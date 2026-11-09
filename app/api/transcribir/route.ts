import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export const maxDuration = 20;

const MODELOS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
const ESPERA_MS = 8_000;
const MAX_BASE64 = 4_200_000;

export async function POST(req: Request) {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return Response.json({ error: "El dictado no está disponible por ahora. Escribe tu pregunta." }, { status: 503 });

  const cuerpo = (await req.json().catch(() => null)) as { mime?: string; datos?: string } | null;
  if (!cuerpo?.datos || !/^audio\//.test(cuerpo.mime ?? "") || cuerpo.datos.length > MAX_BASE64) {
    return Response.json({ error: "No pude leer el audio. Intenta grabar un mensaje más corto." }, { status: 400 });
  }

  const ia = new GoogleGenAI({ apiKey: clave });
  for (const modelo of MODELOS) {
    try {
      const r = await ia.models.generateContent({
        model: modelo.trim(),
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: cuerpo.mime!.split(";")[0], data: cuerpo.datos } },
              { text: "Transcribe literalmente este audio en español de México. Devuelve solo lo dicho, sin comillas ni comentarios. Si no se entiende nada, devuelve vacío." },
            ],
          },
        ],
        config: { temperature: 0, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, abortSignal: AbortSignal.timeout(ESPERA_MS) },
      });
      return Response.json({ texto: (r.text ?? "").trim() });
    } catch (error) {
      console.error(`Falló la transcripción con ${modelo}:`, error instanceof Error ? error.message : error);
    }
  }
  return Response.json({ error: "No pude transcribir el audio. Escribe tu pregunta o intenta de nuevo." }, { status: 502 });
}
