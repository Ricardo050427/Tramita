import { MisTramites } from "@/components/mis-tramites";
import { tramites } from "@/lib/datos";

// Solo el plazo publicado de cada trámite: con él se cuenta cuándo deben responder.
const PLAZOS = Object.fromEntries(tramites.map((t) => [t.clave, t.plazo.replace(/\s+/g, " ").trim().slice(0, 60)]));

export default function PaginaMisTramites() {
  return <MisTramites plazos={PLAZOS} />;
}
