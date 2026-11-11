import { tramitePorClave } from "@/lib/datos";
import { guardarReporte, leerReportes, resumirReportes } from "@/lib/reportes";
import { ES_TIPO, TIPOS_REPORTE, type TipoReporte } from "@/lib/tipos-reporte";

const envios = new Map<string, number[]>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < 3_600_000);
  recientes.push(ahora);
  envios.set(ip, recientes);
  return recientes.length > 6;
}

const ORIGENES = new Set(["verificador", "ficha", "mis-tramites"]);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const cuerpo = (await req.json().catch(() => null)) as { clave?: string; tipo?: string; detalle?: string; origen?: string; sitio?: string } | null;
  // El campo "sitio" está oculto: solo lo llenan los robots.
  if (cuerpo?.sitio) return Response.json({ ok: true });
  if (excedeLimite(ip)) return Response.json({ error: "Ya enviaste varios reportes. Inténtalo más tarde." }, { status: 429 });

  const tramite = tramitePorClave(String(cuerpo?.clave ?? ""));
  if (!tramite || !ES_TIPO.has(String(cuerpo?.tipo))) return Response.json({ error: "Elige qué pasó para enviar el reporte." }, { status: 400 });

  try {
    const origen = ORIGENES.has(String(cuerpo?.origen)) ? String(cuerpo?.origen) : "ficha";
    await guardarReporte(tramite.clave, cuerpo!.tipo as TipoReporte, String(cuerpo?.detalle ?? "").trim(), origen);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("No se guardó el reporte:", error instanceof Error ? error.message : error);
    return Response.json({ error: "No pude guardar tu reporte. Inténtalo de nuevo." }, { status: 503 });
  }
}

// Datos abiertos: el conteo de reportes por trámite y tipo, sin el texto que escribió cada persona.
export async function GET(req: Request) {
  const formato = new URL(req.url).searchParams.get("formato");
  try {
    const reportes = await leerReportes();
    if (formato === "csv") {
      const nombres = new Map<string, string>(TIPOS_REPORTE.map((t) => [t.id, t.corto]));
      const filas = reportes
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((r) => {
          const t = tramitePorClave(r.clave);
          return [r.fecha, r.clave, t?.nombre ?? "", t?.dependencia ?? "", nombres.get(r.tipo) ?? r.tipo].map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
        });
      return new Response(["fecha,clave,tramite,dependencia,tipo", ...filas].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reportes-tramita.csv"' },
      });
    }
    return Response.json(resumirReportes(reportes), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("No se leyeron los reportes:", error instanceof Error ? error.message : error);
    return Response.json({ error: "No pude leer los reportes ahora." }, { status: 503 });
  }
}
