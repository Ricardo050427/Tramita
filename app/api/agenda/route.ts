import { generarAgenda } from "@/lib/agenda-pdf";
import { tramites } from "@/lib/datos";
import { resumir } from "@/lib/observatorio";
import { fichasSimples } from "@/lib/simplificacion";
import { leerVotos } from "@/lib/votos";

// La propuesta de Agenda se arma al momento para incluir los votos más recientes de la consulta.
export async function GET() {
  const votos = await leerVotos().catch(() => new Map<string, number>());
  const bytes = await generarAgenda({ fichas: fichasSimples(), votos, cumplenArt54: resumir(tramites).completos });
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="agenda-simplificacion-hermosillo-2027.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
