import { tramitePorClave } from "@/lib/datos";
import { leerVotos, votar } from "@/lib/votos";

const envios = new Map<string, number[]>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < 3_600_000);
  recientes.push(ahora);
  envios.set(ip, recientes);
  return recientes.length > 10;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const cuerpo = (await req.json().catch(() => null)) as { clave?: string } | null;
  const tramite = tramitePorClave(String(cuerpo?.clave ?? ""));
  if (!tramite) return Response.json({ error: "No encontré ese trámite." }, { status: 404 });
  if (excedeLimite(ip)) return Response.json({ error: "Ya votaste varias veces. Inténtalo más tarde." }, { status: 429 });
  try {
    await votar(tramite.clave);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("No se guardó el voto:", error instanceof Error ? error.message : error);
    return Response.json({ error: "No pude guardar tu voto. Inténtalo de nuevo." }, { status: 503 });
  }
}

export async function GET() {
  try {
    const votos = await leerVotos();
    return Response.json({ votos: Object.fromEntries(votos), total: [...votos.values()].reduce((s, n) => s + n, 0) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se leyeron los votos:", error instanceof Error ? error.message : error);
    return Response.json({ error: "No pude leer la consulta ahora." }, { status: 503 });
  }
}
