import { tramitePorClave } from "./datos";
import type { Plan, PasoPlan, Tramite } from "./tipos";

// Valor de la VUMAV que publican las fichas del catálogo municipal ("1 VUMAV = $113.14").
export const VUMAV = 113.14;
const PROFUNDIDAD_MAXIMA = 3;

const numero = (t: string) => Number(t.replace(/,/g, ""));
const redondear = (n: number) => Math.round(n * 100) / 100;

type Rango = { min: number; max: number };

/** Lee el costo publicado. Devuelve null cuando no se puede calcular sin inventar. */
export function estimarCosto(t: Tramite, metros?: number): Rango | null {
  const texto = t.costo.replace(/\s+/g, " ");
  if (/^sin costo/i.test(texto)) return { min: 0, max: 0 };
  const base = /^\$\s*([\d,]+(?:\.\d+)?)/.exec(texto);
  const fijo = base ? numero(base[1]) : 0;

  // Tablas por superficie: "De 60 m2 hasta 100 m2: 0.30 VUMAV por m2".
  const tramos = [...texto.matchAll(/([\d,.]+)\s*m2\s*hasta\s*([\d,.]+)\s*m2\s*:?\s*([\d.]+)\s*vumav\s*por\s*m2/gi)].map((m) => ({
    desde: numero(m[1]),
    hasta: numero(m[2]),
    tasa: Number(m[3]),
  }));
  if (tramos.length) {
    if (!metros) return null;
    const tramo = tramos.find((x) => metros >= x.desde && metros <= x.hasta);
    if (!tramo) return null;
    const total = redondear(fijo + metros * tramo.tasa * VUMAV);
    return { min: total, max: total };
  }

  const porMetro = /^([\d.]+)(?:\s*a\s*([\d.]+))?\s*vumav\s*por\s*m2/i.exec(texto);
  if (porMetro) {
    if (!metros) return null;
    const a = Number(porMetro[1]);
    const b = Number(porMetro[2] ?? porMetro[1]);
    return { min: redondear(metros * a * VUMAV), max: redondear(metros * b * VUMAV) };
  }

  const rango = /^(?:var[ií]an\s+)?(?:de\s+)?([\d,.]+)\s*(?:vumav\s*)?a\s*([\d,.]+)\s*vumav/i.exec(texto);
  if (rango) return { min: redondear(numero(rango[1]) * VUMAV), max: redondear(numero(rango[2]) * VUMAV) };

  const unico = /^([\d,.]+)\s*vumav/i.exec(texto);
  if (unico) {
    const total = redondear(numero(unico[1]) * VUMAV);
    return { min: total, max: total };
  }
  if (base && !/varian|varían|m2/i.test(texto)) return { min: fijo, max: fijo };
  return null;
}

/** Días que dura un documento: "mes" si caduca al terminar el mes de expedición. */
function vigenciaDe(t: Tramite, detalleRequisito: string): number | "mes" | null {
  const exigida = /(\d+)\s*d[ií]as de vigencia/i.exec(detalleRequisito);
  if (exigida) return Number(exigida[1]);
  if (/mes de su expedici/i.test(t.vigencia)) return "mes";
  const dias = /^(\d+)\s*d[ií]as/i.exec(t.vigencia);
  if (dias && Number(dias[1]) > 0) return Number(dias[1]);
  const meses = /^(\d+)\s*meses/i.exec(t.vigencia);
  if (meses && Number(meses[1]) > 0) return Number(meses[1]) * 30;
  const anios = /^(\d+)\s*a[nñ]os?/i.exec(t.vigencia);
  if (anios && Number(anios[1]) > 0) return Number(anios[1]) * 365;
  return null;
}

const esOpcional = (texto: string) => /si aplica|en caso de|solo si/i.test(texto);

function prerrequisitos(t: Tramite) {
  const unicos = new Map<string, { clave: string; detalle: string }>();
  for (const r of t.requisitos) {
    if (!r.obtener || esOpcional(`${r.titulo} ${r.detalle ?? ""}`)) continue;
    if (!unicos.has(r.obtener.clave)) unicos.set(r.obtener.clave, { clave: r.obtener.clave, detalle: r.detalle ?? "" });
  }
  // Lo que caduca pronto se deja al final para que siga vigente cuando se use.
  return [...unicos.values()].sort((a, b) => Number(/vigencia/i.test(a.detalle)) - Number(/vigencia/i.test(b.detalle)));
}

/** Arma el camino completo hacia un trámite: primero lo que ese trámite exige. */
export function armarPlan(claveMeta: string, metros?: number): Plan | null {
  const meta = tramitePorClave(claveMeta);
  if (!meta) return null;

  const pasos: PasoPlan[] = [];
  const vistos = new Set<string>();

  const visitar = (t: Tramite, profundidad: number, detalle: string, requeridoPor?: string) => {
    if (vistos.has(t.clave)) return;
    vistos.add(t.clave);
    if (profundidad < PROFUNDIDAD_MAXIMA) {
      for (const p of prerrequisitos(t)) {
        const hijo = tramitePorClave(p.clave);
        if (hijo) visitar(hijo, profundidad + 1, p.detalle, t.nombre);
      }
    }
    const estimado = estimarCosto(t, metros);
    pasos.push({
      clave: t.clave,
      nombre: t.nombre,
      dependencia: t.dependencia,
      costo: t.costo.slice(0, 140),
      plazo: t.plazo.slice(0, 90),
      estimado,
      vigencia: vigenciaDe(t, detalle),
      ...(requeridoPor ? { requeridoPor } : {}),
    });
  };
  visitar(meta, 0, "");

  if (pasos.length < 2) return null;
  const conocidos = pasos.filter((p) => p.estimado);
  return {
    meta: meta.nombre,
    clave: meta.clave,
    pasos,
    ...(metros ? { metros } : {}),
    total: { min: redondear(conocidos.reduce((s, p) => s + p.estimado!.min, 0)), max: redondear(conocidos.reduce((s, p) => s + p.estimado!.max, 0)) },
    sinCalcular: pasos.length - conocidos.length,
  };
}

export const planEnTexto = (plan: Plan) =>
  [
    `Plan calculado por la app para "${plan.meta}" (ya se muestra en una tarjeta):`,
    ...plan.pasos.map((p, i) => {
      const costo = p.estimado ? (p.estimado.min === p.estimado.max ? `${p.estimado.min} pesos` : `${p.estimado.min} a ${p.estimado.max} pesos`) : "costo por confirmar";
      const vence = p.vigencia === "mes" ? "vence al terminar el mes en que se expide" : p.vigencia ? `dura ${p.vigencia} días` : "";
      return `${i + 1}. ${p.nombre} (${p.dependencia}). Costo: ${costo}. ${vence}${p.requeridoPor ? ` Lo exige: ${p.requeridoPor}.` : ""}`;
    }),
    `Total estimado conocido: ${plan.total.min} a ${plan.total.max} pesos. Pasos sin costo calculable: ${plan.sinCalcular}.`,
  ].join("\n");
