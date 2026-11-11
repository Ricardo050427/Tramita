import { tramitePorClave, tramites } from "./datos";
import { esDelMunicipio, faltantesArt54, pideCopia, pideFormato, publicaFormato } from "./observatorio";
import { estimarCosto } from "./plan";
import { rutas } from "./rutas";
import type { Requisito, Tramite } from "./tipos";

// Simulador de la Agenda de Simplificación (Ley Nacional para Eliminar Trámites Burocráticos, arts. 19, 21 y 22).
// Todo sale del catálogo publicado: cuántas copias, documentos municipales y formatos sin publicar pide cada trámite.

export type Medida = "copias" | "municipales" | "formatos";

export type FichaSimple = {
  clave: string;
  nombre: string;
  dependencia: string;
  requisitos: number;
  copias: number;
  municipales: number;
  /** Trámites del Ayuntamiento que hay que hacer antes solo para conseguir sus documentos. */
  previos: { clave: string; nombre: string; pesos: number; informativo: boolean }[];
  formatoSinPublicar: boolean;
  presencial: boolean;
  vulnerable: boolean;
  sinPlazo: boolean;
  exigidoPor: number;
  enRuta: boolean;
  puntos: number;
  razones: string[];
};

const VULNERABLE = /DIF|Mujer|Atención Ciudadana/i;
// Papeleo que solo informa (constancias, cartas de no adeudo): con la ley el Ayuntamiento lo consulta y el paso desaparece.
// Una licencia o un permiso sigue siendo necesario; solo deja de pedirse el papel.
export const INFORMATIVO = /constancia|certificad|carta de no adeudo|no adeudo|estado de cuenta/i;
const CATEGORIAS_VULNERABLES = new Set(["apoyos", "salud"]);

// "2 copias" cuenta como dos; "copia" sin número, como una.
function copiasDe(r: Requisito) {
  if (!pideCopia(r)) return 0;
  const n = /(\d+)\s*copias?/i.exec(`${r.titulo} ${r.detalle ?? ""}`);
  return n ? Math.min(Number(n[1]), 5) : 1;
}

const pesosDe = (t: Tramite | undefined) => {
  const r = t ? estimarCosto(t) : null;
  return r ? r.min : 0;
};

const exigidos = new Map<string, number>();
for (const t of tramites) for (const r of t.requisitos) if (r.obtener) exigidos.set(r.obtener.clave, (exigidos.get(r.obtener.clave) ?? 0) + 1);
const enRutas = new Set(rutas.flatMap((r) => r.fases.flatMap((f) => f.pasos.flatMap((p) => (p.clave ? [p.clave] : [])))));

export function fichaSimple(t: Tramite): FichaSimple {
  const municipales = t.requisitos.filter(esDelMunicipio);
  const previos = [...new Map(municipales.flatMap((r) => (r.obtener ? [[r.obtener.clave, r.obtener]] : []))).values()].map((o) => ({
    clave: o.clave,
    nombre: o.nombre,
    pesos: pesosDe(tramitePorClave(o.clave)),
    informativo: INFORMATIVO.test(o.nombre),
  }));
  const f = {
    clave: t.clave,
    nombre: t.nombre,
    dependencia: t.dependencia.replace("Tesoreria", "Tesorería"),
    requisitos: t.requisitos.length,
    copias: t.requisitos.reduce((s, r) => s + copiasDe(r), 0),
    municipales: municipales.length,
    previos,
    formatoSinPublicar: pideFormato(t) && !publicaFormato(t),
    presencial: !t.enLinea,
    vulnerable: VULNERABLE.test(t.dependencia) || CATEGORIAS_VULNERABLES.has(t.categoria),
    sinPlazo: faltantesArt54(t).some((x) => x.id === "IX"),
    exigidoPor: exigidos.get(t.clave) ?? 0,
    enRuta: enRutas.has(t.clave),
  };
  // Prioridad con los criterios del artículo 21: frecuencia, grupos vulnerables, costo burocrático y atención presencial.
  const costo = f.requisitos + f.copias + f.municipales * 2 + (f.formatoSinPublicar ? 2 : 0) + (f.sinPlazo ? 2 : 0);
  const frecuencia = f.exigidoPor * 3 + (f.enRuta ? 4 : 0);
  const puntos = costo + frecuencia + (f.presencial ? 3 : 0) + (f.vulnerable ? 4 : 0);
  const razones = [
    ...(f.exigidoPor ? [`Lo exigen ${f.exigidoPor} ${f.exigidoPor === 1 ? "trámite" : "trámites"}`] : []),
    `${f.requisitos} requisitos`,
    ...(f.copias ? [`${f.copias} ${f.copias === 1 ? "copia" : "copias"}`] : []),
    ...(f.municipales ? [`${f.municipales} ${f.municipales === 1 ? "documento" : "documentos"} del propio Ayuntamiento`] : []),
    ...(f.formatoSinPublicar ? ["Formato sin publicar"] : []),
    ...(f.sinPlazo ? ["Sin plazo publicado"] : []),
    ...(f.presencial ? ["Solo presencial"] : []),
    ...(f.vulnerable ? ["Atiende a grupos vulnerables"] : []),
  ];
  return { ...f, puntos, razones };
}

export const fichasSimples = () => tramites.map(fichaSimple);

export type RutaSimple = { slug: string; nombre: string; pasos: { clave: string; nombre: string; pesos: number; requisitos: number; copias: number; municipales: number; quitable: boolean }[] };

// En una ruta, un paso sobra si solo sirve para conseguir un documento que el propio Ayuntamiento emite.
export function rutasSimples(): RutaSimple[] {
  return rutas
    .filter((r) => r.slug === "negocio-de-comida" || r.slug === "construir-o-ampliar")
    .map((r) => {
      const obligatorios = r.fases.flatMap((f) => f.pasos).filter((p) => p.clave && !p.opcional);
      const exigidosAqui = new Set(
        obligatorios.flatMap(
          (p) => tramitePorClave(p.clave!)?.requisitos.filter((q) => esDelMunicipio(q) && q.obtener && INFORMATIVO.test(q.obtener.nombre)).map((q) => q.obtener!.clave) ?? [],
        ),
      );
      return {
        slug: r.slug,
        nombre: r.nombre,
        pasos: obligatorios.map((p) => {
          const t = tramitePorClave(p.clave!)!;
          const s = fichaSimple(t);
          return { clave: t.clave, nombre: t.nombre, pesos: pesosDe(t), requisitos: s.requisitos, copias: s.copias, municipales: s.municipales, quitable: exigidosAqui.has(t.clave) };
        }),
      };
    });
}
