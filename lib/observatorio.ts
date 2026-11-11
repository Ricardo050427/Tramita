import { normalizar } from "./buscar";
import { FRACCIONES_54, type IdFraccion } from "./ley";
import type { Requisito, Tramite } from "./tipos";

const SIN_DATO = /^(indefinido|desconocido|no publicado|n\/a)\b/i;

// Qué fracciones del artículo 54 cumple la ficha, juzgando solo lo que el catálogo publica.
const CUMPLE: Record<IdFraccion, (t: Tramite) => boolean> = {
  IV: (t) => Boolean(t.fundamento.trim()),
  VI: (t) => t.requisitos.length > 0,
  VIII: (t) => Boolean(t.telefono.trim() || t.oficinas?.some((o) => o.telefono)),
  IX: (t) => Boolean(t.plazo.trim()) && !SIN_DATO.test(t.plazo.trim()),
  XI: (t) => Boolean(t.costo.trim()),
  XII: (t) => Boolean(t.vigencia.trim()) && !/^desconocido/i.test(t.vigencia.trim()),
  XIII: (t) => Boolean(t.domicilio.trim() || t.oficinas?.length),
  XIV: (t) => Boolean(t.horario.trim() || t.oficinas?.some((o) => o.horario)),
};

export const faltantesArt54 = (t: Tramite) => FRACCIONES_54.filter((f) => !CUMPLE[f.id](t));

const texto = (r: Requisito) => normalizar(`${r.titulo} ${r.detalle ?? ""}`);
const COPIA = /\bcopias?\b/;
const SOLO_CERTIFICADA = /\bcopias? certificadas?\b/;
// Documentos que emite el propio Ayuntamiento y que la ley pide no volver a solicitar.
const DEL_MUNICIPIO =
  /no adeudo|predial|licencia de uso de suelo|numero oficial|alineamiento|licencia de construccion|cedula catastral|(sindicatura|tesoreria) municipal|expedid[oa] por el (h )?ayuntamiento/;

// "Constancia" no dice nada: cuando el título es genérico se completa con el inicio de su detalle.
export function nombreRequisito(r: { titulo: string; detalle?: string }) {
  const detalle = (r.detalle ?? "").replace(/^\s*\d+\s*(copias?|originale?s?)\.?\s*/i, "").trim();
  if (r.titulo.trim().split(/\s+/).length > 2 || !detalle) return r.titulo;
  const frase = detalle.split(/\.\s|\(/)[0].replace(/[.,;:]+$/, "");
  const corta = frase.length > 70 ? `${frase.slice(0, 68).replace(/\s+\S*$/, "")}…` : frase;
  return `${r.titulo} ${corta.charAt(0).toLowerCase()}${corta.slice(1)}`;
}

export const pideCopia = (r: Requisito) => {
  const t = texto(r);
  return COPIA.test(t) && !(SOLO_CERTIFICADA.test(t) && !/copia simple|fotocopia/.test(t));
};
export const esDelMunicipio = (r: Requisito) => Boolean(r.obtener) || DEL_MUNICIPIO.test(normalizar(r.titulo));
const PIDE_FORMATO = /\b(formato|formulario|solicitud (oficial|debidamente|por escrito|llenad|firmad)|solicitud de)\b/;
export const pideFormato = (t: Tramite) => t.requisitos.some((r) => PIDE_FORMATO.test(texto(r)));
export const publicaFormato = (t: Tramite) => Boolean(t.documentos?.some((d) => d.tipo === "solicitud"));

export type ResumenObservatorio = {
  total: number;
  completos: number;
  porFraccion: { id: IdFraccion; corto: string; texto: string; cumplen: number; faltan: { clave: string; nombre: string }[] }[];
  copias: number;
  delMunicipio: number;
  pidenFormato: number;
  formatoSinPublicar: number;
  dependencias: { nombre: string; total: number; completos: number; huecos: number }[];
  pendientes: { clave: string; nombre: string; dependencia: string; faltan: string[] }[];
};

export function resumir(tramites: Tramite[]): ResumenObservatorio {
  const faltas = new Map(tramites.map((t) => [t.clave, faltantesArt54(t)]));
  const porDependencia = new Map<string, { total: number; completos: number; huecos: number }>();
  for (const t of tramites) {
    const d = porDependencia.get(t.dependencia) ?? { total: 0, completos: 0, huecos: 0 };
    const f = faltas.get(t.clave)!.length;
    d.total++;
    d.huecos += f;
    if (!f) d.completos++;
    porDependencia.set(t.dependencia, d);
  }
  const pidenFormato = tramites.filter(pideFormato);
  return {
    total: tramites.length,
    completos: tramites.filter((t) => !faltas.get(t.clave)!.length).length,
    porFraccion: FRACCIONES_54.map((f) => ({
      ...f,
      cumplen: tramites.filter((t) => CUMPLE[f.id](t)).length,
      faltan: tramites.filter((t) => !CUMPLE[f.id](t)).map((t) => ({ clave: t.clave, nombre: t.nombre })),
    })).sort((a, b) => a.cumplen - b.cumplen),
    copias: tramites.filter((t) => t.requisitos.some(pideCopia)).length,
    delMunicipio: tramites.filter((t) => t.requisitos.some(esDelMunicipio)).length,
    pidenFormato: pidenFormato.length,
    formatoSinPublicar: pidenFormato.filter((t) => !publicaFormato(t)).length,
    dependencias: [...porDependencia]
      .map(([nombre, d]) => ({ nombre: nombre.replace(/^Cmcop_c/, "C").replace("Tesoreria", "Tesorería"), ...d }))
      .sort((a, b) => a.completos / a.total - b.completos / b.total || b.total - a.total),
    pendientes: tramites
      .filter((t) => faltas.get(t.clave)!.length)
      .map((t) => ({ clave: t.clave, nombre: t.nombre, dependencia: t.dependencia, faltan: faltas.get(t.clave)!.map((f) => f.corto) }))
      .sort((a, b) => b.faltan.length - a.faltan.length || a.nombre.localeCompare(b.nombre, "es")),
  };
}
