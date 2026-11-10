import type { EntradaIndice } from "./tipos";

export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VACIAS = new Set(
  "a al algo como con cual cuando cuanto de del donde el en es esta este hacer hay la las lo los me mi mis necesito para pedir por puedo que quiero sacar se si sobre su tengo tramite tramitar un una y yo".split(" "),
);

// Palabras que usa la gente frente a las que usa el catálogo.
export const SINONIMOS: Record<string, string[]> = {
  recibo: ["agua", "aclaracion"],
  fuga: ["agua", "inspeccion", "drenaje"],
  lampara: ["alumbrado", "luminaria"],
  foco: ["alumbrado", "luminaria"],
  poste: ["alumbrado"],
  luz: ["alumbrado"],
  basura: ["recoleccion", "limpia"],
  casa: ["predial", "vivienda", "habitacional"],
  terreno: ["predial", "predio"],
  negocio: ["licencia", "comercio", "funcionamiento"],
  abrir: ["funcionamiento"],
  vender: ["comercio", "publica"],
  calle: ["publica", "comercio"],
  taqueria: ["funcionamiento", "licencia"],
  papeleria: ["funcionamiento", "licencia"],
  tienda: ["funcionamiento", "licencia"],
  restaurante: ["funcionamiento", "licencia"],
  cafeteria: ["funcionamiento", "licencia"],
  local: ["funcionamiento", "licencia"],
  cuarto: ["ampliacion", "habitacional", "construccion"],
  recamara: ["ampliacion", "habitacional", "construccion"],
  departamento: ["ampliacion", "habitacional", "construccion"],
  ampliar: ["ampliacion", "habitacional", "construccion"],
  perro: ["animal", "vacunacion", "mascota"],
  gato: ["animal", "mascota"],
  mascota: ["animal", "vacunacion"],
  deuda: ["adeudo"],
  adeudo: ["constancia", "certificado"],
  descuento: ["tarifa", "social"],
  barato: ["tarifa", "social"],
  multa: ["infraccion", "sancion"],
  transito: ["infraccion"],
  construir: ["licencia", "construccion"],
  obra: ["construccion", "licencia"],
  doctor: ["salud", "medica"],
  consulta: ["salud", "medica"],
  mujer: ["asesoria", "terapia"],
  violencia: ["mujer", "asesoria"],
  beca: ["educacion", "apoyo"],
  ayuda: ["apoyo", "asistencia"],
  arbol: ["poda", "derribo"],
};

export function palabrasClave(consulta: string) {
  return normalizar(consulta)
    .split(" ")
    .filter((p) => p.length > 1 && !VACIAS.has(p));
}

export function buscar(consulta: string, indice: EntradaIndice[], limite = 6) {
  const palabras = palabrasClave(consulta);
  if (!palabras.length) return [];

  const resultados = indice.map((item) => {
    const nombre = normalizar(item.n).split(" ");
    let puntos = 0;
    let cubiertas = 0;

    for (const palabra of palabras) {
      let mejor = 0;
      if (nombre.includes(palabra)) mejor = 6;
      else if (palabra.length > 2 && nombre.some((n) => n.startsWith(palabra))) mejor = 4;
      else if (` ${item.k}`.includes(` ${palabra}`)) mejor = 2;

      for (const sinonimo of SINONIMOS[palabra] ?? []) {
        if (nombre.includes(sinonimo)) mejor = Math.max(mejor, 4);
        else if (` ${item.k}`.includes(` ${sinonimo}`)) mejor = Math.max(mejor, 1.5);
      }
      if (mejor) cubiertas++;
      puntos += mejor;
    }
    return { item, puntos: puntos + (cubiertas === palabras.length ? 3 : 0) };
  });

  return resultados
    .filter((r) => r.puntos >= 4)
    .sort((a, b) => b.puntos - a.puntos || a.item.n.length - b.item.n.length)
    .slice(0, limite);
}
