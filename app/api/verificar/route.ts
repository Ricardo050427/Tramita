import { GoogleGenAI } from "@google/genai";
import { tramitePorClave } from "@/lib/datos";
import { extraerElementos, registrarVerificacion } from "@/lib/extraer";
import { evaluar, separarSinIA } from "@/lib/verificador";

export const maxDuration = 30;

const LIMITE_MS = 16_000;
const MIMES = /^image\/(jpeg|png|webp|heic|heif)$/;
const MAX_BASE64 = 4_200_000;

const peticiones = new Map<string, number[]>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const recientes = (peticiones.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  recientes.push(ahora);
  peticiones.set(ip, recientes);
  return recientes.length > 10;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (excedeLimite(ip)) return Response.json({ error: "Son muchas revisiones seguidas. Espera un minuto e inténtalo de nuevo." }, { status: 429 });

  const cuerpo = (await req.json().catch(() => null)) as { clave?: string; texto?: string; cobro?: number; foto?: { mime: string; datos: string } } | null;
  const tramite = tramitePorClave(String(cuerpo?.clave ?? ""));
  const texto = String(cuerpo?.texto ?? "").slice(0, 1200).trim();
  const cobro = Number(cuerpo?.cobro) > 0 ? Math.min(Number(cuerpo?.cobro), 10_000_000) : 0;
  const foto = cuerpo?.foto && MIMES.test(cuerpo.foto.mime) && cuerpo.foto.datos.length < MAX_BASE64 ? cuerpo.foto : null;

  if (!tramite) return Response.json({ error: "No encontré ese trámite." }, { status: 404 });
  if (!texto && !foto && !cobro) return Response.json({ error: "Escribe o toma foto de lo que te pidieron." }, { status: 400 });

  const clave = process.env.GEMINI_API_KEY;
  if (clave) {
    const elementos = await extraerElementos(new GoogleGenAI({ apiKey: clave }), tramite, `${texto}${cobro ? `. Además le cobraron ${cobro} pesos` : ""}`, foto, LIMITE_MS);
    if (elementos) {
      if (cobro && !elementos.some((e) => e.tipo === "pago")) {
        elementos.push({ dicho: `Me cobraron $${cobro.toLocaleString("es-MX")}`, tipo: "pago", requisito: -1, copia: false, monto: cobro, informal: false });
      }
      if (elementos.length) return Response.json(registrarVerificacion(evaluar(tramite, elementos, true)));
      if (foto && !texto) return Response.json({ error: "No pude leer qué te pidieron en la foto. Tómala más de cerca o escríbelo." }, { status: 422 });
    }
  }

  if (!texto && !cobro) return Response.json({ error: "Ahora no puedo leer la foto. Escribe lo que te pidieron y lo comparo." }, { status: 503 });
  return Response.json(registrarVerificacion(evaluar(tramite, separarSinIA(tramite, texto, cobro), false)));
}
