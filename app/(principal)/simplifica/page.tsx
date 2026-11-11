import { Simulador } from "@/components/simulador";
import { accionesDe, totalesAgenda } from "@/lib/agenda-pdf";
import { fichasSimples, rutasSimples } from "@/lib/simplificacion";

export const metadata = { title: "Hermosillo simplificado · Tramita" };

export default function PaginaSimplifica() {
  const fichas = fichasSimples();
  const t = totalesAgenda(fichas);
  const prioritarios = [...fichas]
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 10)
    .map((f) => ({ clave: f.clave, nombre: f.nombre, dependencia: f.dependencia, razones: f.razones, acciones: accionesDe(f) }));
  const rutas = rutasSimples().map((r) => ({ slug: r.slug, nombre: r.nombre, pasos: r.pasos.map((p) => ({ clave: p.clave, nombre: p.nombre, pesos: p.pesos, quitable: p.quitable })) }));
  return (
    <Simulador
      totales={{ requisitos: t.requisitos, copias: t.copias, municipales: t.municipales, formatos: t.formatos, constanciaExigida: t.constanciaExigida }}
      prioritarios={prioritarios}
      rutas={rutas}
    />
  );
}
