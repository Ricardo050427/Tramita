import { anotar, leerMetricas } from "@/lib/metricas";
import { leerReportes } from "@/lib/reportes";

const vistas = new Map<string, number[]>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const recientes = (vistas.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  recientes.push(ahora);
  vistas.set(ip, recientes);
  return recientes.length > 10;
}

// El pase es una página estática: avisa desde el navegador que alguien lo abrió.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const cuerpo = (await req.json().catch(() => null)) as { evento?: string } | null;
  if (cuerpo?.evento === "pase" && !excedeLimite(ip)) anotar({ pases: 1 });
  return new Response(null, { status: 204 });
}

export async function GET() {
  try {
    const [metricas, reportes] = await Promise.all([leerMetricas(), leerReportes()]);
    return Response.json({ ...metricas, reportes: reportes.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se leyeron las métricas:", error instanceof Error ? error.message : error);
    return Response.json({ error: "No pude leer los indicadores ahora." }, { status: 503 });
  }
}
