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
  recibo: ["agua", "aclaracion", "aclaraciones"],
  fuga: ["agua", "inspeccion", "drenaje"],
  lampara: ["alumbrado", "luminaria", "fallas"],
  foco: ["alumbrado", "luminaria", "fallas"],
  poste: ["alumbrado"],
  luz: ["alumbrado"],
  basura: ["recoleccion", "limpia"],
  casa: ["predial", "vivienda", "habitacional"],
  terreno: ["predial", "predio"],
  negocio: ["licencia", "comercio", "funcionamiento"],
  abrir: ["funcionamiento"],
  vender: ["comercio", "publica"],
  tacos: ["comercio", "publica"],
  puesto: ["comercio", "publica"],
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
  // Una lámpara fundida es una falla de alumbrado, no una obra pública.
  fundio: ["fallas", "alumbrado"],
  fundida: ["fallas", "alumbrado"],
  apagada: ["fallas", "alumbrado"],
  apagado: ["fallas", "alumbrado"],
  luminaria: ["alumbrado", "fallas"],
  vacunar: ["vacuna", "antirrabica"],
  vacuna: ["antirrabica"],
  rabia: ["antirrabica", "vacuna"],
  esterilizar: ["esterilizacion"],
  jubilado: ["descuento", "vulnerables"],
  pensionado: ["descuento", "vulnerables"],
  cerveza: ["alcohol", "anuencia"],
  alcohol: ["anuencia"],
  vino: ["alcohol", "anuencia"],
  licor: ["alcohol", "anuencia"],
  tumbar: ["demolicion"],
  demoler: ["demolicion"],
  regularizo: ["regularizacion"],
  regularizar: ["regularizacion"],
  chico: ["menor"],
  pequeno: ["menor"],
  corralon: ["deposito", "liberacion", "vehiculos"],
  grua: ["deposito", "liberacion", "vehiculos"],
  guarderia: ["estancia", "infantil"],
  funeral: ["funerarios", "inhumacion"],
  murio: ["funerarios"],
  inundo: ["emergencia", "desastres"],
  lluvia: ["emergencia", "desastres"],
  fiesta: ["eventos", "sociales"],
  cancha: ["instalaciones", "deportivas"],
  torneo: ["instalaciones", "deportivas"],
  proveedor: ["proveedores", "padron"],
  silla: ["funcionales"],
  debo: ["estado", "cuenta", "adeudo"],
  // Quejas y denuncias: el tema que más le importa a la Contraloría.
  denunciar: ["denuncias", "quejas"],
  denuncia: ["denuncias"],
  quejo: ["quejas"],
  queja: ["quejas"],
  quejarme: ["quejas"],
  funcionario: ["servidores", "publicos"],
  empleado: ["servidores", "publicos"],
  mordida: ["denuncias", "servidores"],
  policia: ["elementos", "seguridad", "quejas"],
  // Un recibo caro se aclara; no es contratar ni pagar.
  caro: ["aclaraciones", "aclaracion"],
  cobraron: ["aclaraciones", "aclaracion"],
};

const TRAMITE_SECUNDARIO = /renov|cancel|prorrog|actualiz|modific|reposic|multiclave|espectaculo/;

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
    const enNombre = new Set<string>();

    for (const palabra of palabras) {
      let mejor = 0;
      if (nombre.includes(palabra)) {
        mejor = 6;
        enNombre.add(palabra);
      }
      else if (palabra.length > 2 && nombre.some((n) => n.startsWith(palabra))) mejor = 4;
      else if (` ${item.k}`.includes(` ${palabra}`)) mejor = 2;

      for (const sinonimo of SINONIMOS[palabra] ?? []) {
        if (nombre.includes(sinonimo)) {
          mejor = Math.max(mejor, 4);
          enNombre.add(sinonimo);
        }
        else if (` ${item.k}`.includes(` ${sinonimo}`)) mejor = Math.max(mejor, 1.5);
      }
      if (mejor) cubiertas++;
      puntos += mejor;
    }
    // Quien inicia algo no busca renovarlo: estos trámites solo ganan si se piden por su nombre.
    const secundario = TRAMITE_SECUNDARIO.test(normalizar(item.n)) && !TRAMITE_SECUNDARIO.test(normalizar(consulta));
    // Desempates: cubrir más palabras de la pregunta y nombrar más de lo que se pidió.
    const desempate = cubiertas * 0.75 + enNombre.size * 0.5;
    return { item, puntos: puntos + desempate + (cubiertas === palabras.length ? 3 : 0) - (secundario ? 5 : 0) };
  });

  return resultados
    .filter((r) => r.puntos >= 4)
    .sort((a, b) => b.puntos - a.puntos || a.item.n.length - b.item.n.length)
    .slice(0, limite);
}
