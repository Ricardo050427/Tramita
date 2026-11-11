import { anotar } from "@/lib/metricas";

// Sello de tiempo con OpenTimestamps: recibe solo la huella SHA-256 del escrito, nunca su contenido.
// Devuelve el archivo .ots que prueba que ese documento existía hoy; se confirma en Bitcoin en unas horas.
const CALENDARIOS = ["https://a.pool.opentimestamps.org", "https://b.pool.opentimestamps.org", "https://finney.calendar.eternitywall.com"];
const CABECERA = Buffer.from("004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294", "hex");

const peticiones = new Map<string, number[]>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const recientes = (peticiones.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  recientes.push(ahora);
  peticiones.set(ip, recientes);
  return recientes.length > 6;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (excedeLimite(ip)) return Response.json({ error: "Espera un minuto para sellar otro documento." }, { status: 429 });
  const cuerpo = (await req.json().catch(() => null)) as { huella?: string } | null;
  const huella = String(cuerpo?.huella ?? "");
  if (!/^[0-9a-f]{64}$/.test(huella)) return Response.json({ error: "Huella inválida." }, { status: 400 });

  const digesto = Buffer.from(huella, "hex");
  for (const calendario of CALENDARIOS) {
    try {
      const r = await fetch(`${calendario}/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/vnd.opentimestamps.v1" },
        body: digesto,
        signal: AbortSignal.timeout(6_000),
      });
      if (!r.ok) continue;
      const respuesta = Buffer.from(await r.arrayBuffer());
      // Archivo .ots: cabecera, versión 1, operación SHA-256, la huella y la respuesta del calendario.
      const ots = Buffer.concat([CABECERA, Buffer.from([0x01, 0x08]), digesto, respuesta]);
      anotar({ denuncias: 1 });
      return Response.json({ ots: ots.toString("base64"), calendario: new URL(calendario).host, sellado: new Date().toISOString() });
    } catch (error) {
      console.error(`Falló el sello con ${calendario}:`, error instanceof Error ? error.message : error);
    }
  }
  return Response.json({ error: "No pude sellar el documento ahora. Tu escrito sigue siendo válido sin el sello." }, { status: 503 });
}
