import crudo from "@/data/tramites.json";
import type { Categoria, EntradaIndice, Tramite } from "./tipos";
import { normalizar } from "./buscar";

export const tramites = crudo.tramites as Tramite[];
export const categorias = crudo.categorias as Categoria[];

const porClave = new Map(tramites.map((t) => [t.clave, t]));
export const tramitePorClave = (clave: string) => porClave.get(clave);

export const categoriaPorSlug = (slug: string) => categorias.find((c) => c.slug === slug);
export const tramitesDeCategoria = (slug: string) =>
  tramites.filter((t) => t.categoria === slug).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

export const indice: EntradaIndice[] = tramites.map((t) => ({
  c: t.clave,
  n: t.nombre,
  g: t.categoria,
  l: Boolean(t.enLinea),
  k: normalizar(`${t.categoria} ${t.dependencia} ${t.descripcion}`).slice(0, 220),
}));
