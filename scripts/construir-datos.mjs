// Une el listado y las fichas en data/tramites.json con textos legibles.
import { readFileSync, writeFileSync } from "node:fs";

const listado = JSON.parse(readFileSync("data/listado.json", "utf8"));
const fichas = new Map(
  readFileSync("data/fichas.jsonl", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .map((f) => [f.clave, f]),
);

const CATEGORIAS = [
  ["agua", "Agua y drenaje", "agua", ["SERVICIOS DE AGUA POTABLE, DRENAJE Y SANEAMIENTO"]],
  ["predial-impuestos", "Predial e impuestos", "impuestos", ["IMPUESTOS"]],
  ["alumbrado-servicios", "Alumbrado y servicios", "alumbrado", ["ALUMBRADO PÚBLICO", "SERVICIOS PÚBLICOS"]],
  ["apoyos", "Apoyos y asistencia", "apoyos", ["ASISTENCIA SOCIAL"]],
  ["salud", "Salud", "salud", ["SALUD"]],
  ["vivienda", "Vivienda", "vivienda", ["VIVIENDA"]],
  ["seguridad", "Seguridad y protección civil", "seguridad", ["SEGURIDAD PÚBLICA", "PROTECCIÓN CIVIL"]],
  ["derechos-gobierno", "Derechos y gobierno", "gobierno", ["DERECHOS", "GOBIERNO", "PROCURACIÓN DE JUSTICIA"]],
  ["educacion-cultura", "Educación, cultura y deporte", "educacion", ["EDUCACIÓN", "CULTURA", "DEPORTES"]],
  ["medio-ambiente", "Medio ambiente", "ambiente", ["MEDIO AMBIENTE"]],
  ["transporte", "Transporte", "transporte", ["TRANSPORTE"]],
  ["negocios", "Negocios y comercio", "negocios", ["COMERCIO", "ECONOMÍA Y NEGOCIOS"]],
  ["construccion", "Construcción y obra", "construccion", ["CONSTRUCCIÓN"]],
];
const slugDe = new Map(CATEGORIAS.flatMap(([slug, , , fuentes]) => fuentes.map((f) => [f, slug])));

const SIGLAS = /\b(dif|curp|rfc|ine|ife|inapam|iva|imss|issste|vumav|dap|cfdi|pdf|sat|cp|cmcop|implan|uma)\b/gi;
const PROPIOS = [
  ["hermosillo", "Hermosillo"],
  ["sonora", "Sonora"],
  ["agua de hermosillo", "Agua de Hermosillo"],
  ["registro público de la propiedad", "Registro Público de la Propiedad"],
  ["méxico", "México"],
];
const limpio = (t = "") => t.replace(/\s+/g, " ").trim();

function oracion(texto = "") {
  let t = limpio(texto).toLocaleLowerCase("es-MX");
  t = t.replace(/(^|[.!?:]\s+)(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase("es-MX"));
  t = t.replace(SIGLAS, (s) => s.toUpperCase());
  for (const [de, a] of PROPIOS) t = t.replace(new RegExp(`\\b${de}\\b`, "giu"), a);
  return t.replace(/\.(\s*\.)+/g, ".").replace(/^0 desconocido\s*/i, "").replace(/\s*comentarios$/i, "");
}

const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "a", "en", "para"]);
function titulo(texto = "") {
  return limpio(texto)
    .toLocaleLowerCase("es-MX")
    .split(" ")
    .map((p, i) => (i && MENORES.has(p) ? p : p.charAt(0).toLocaleUpperCase("es-MX") + p.slice(1)))
    .join(" ")
    .replace(SIGLAS, (s) => s.toUpperCase());
}

function requisitosDe(lineas = []) {
  const items = [];
  for (const linea of lineas) {
    const m = /^(\d+)\s+(ORIGINAL(?:ES)?|COPIAS?|ORIGINAL Y COPIA|IMPRESI[ÓO]N(?:ES)?|DIGITAL(?:ES)?|ELECTR[ÓO]NICO|EJEMPLAR(?:ES)?)\s*-\s*(.*)$/i.exec(linea);
    if (m) items.push({ cantidad: `${m[1]} ${m[2]}`, partes: [m[3]] });
    else if (items.length) items.at(-1).partes.push(linea);
    else items.push({ cantidad: "", partes: [linea] });
  }
  return items.map(({ cantidad, partes }) => {
    const [a, b, ...resto] = partes;
    const nombre = oracion([a, b && b.length < 60 ? b : ""].join(" ")).replace(/[:.,]+$/, "");
    const extra = b && b.length >= 60 ? [b, ...resto] : resto;
    const detalle = [cantidad ? oracion(cantidad) : "", oracion(extra.join(". "))].filter(Boolean).join(". ");
    return detalle ? { titulo: nombre, detalle } : { titulo: nombre };
  });
}

function costoDe(t) {
  const base = t.SinCosto === "True" ? "Sin costo" : t.Costo ? `$${t.Costo}` : t.CostoVSM;
  return oracion([base, t.ComplementoCosto].filter(Boolean).join(". ")) || "No publicado";
}

const tramites = listado.map((t) => {
  const f = fichas.get(t.Clave);
  return {
    clave: t.Clave,
    nombre: oracion(t.Nombre),
    categoria: slugDe.get(t.Clasificacion) ?? "derechos-gobierno",
    dependencia: titulo(t.Dependencia),
    modalidad: oracion(t.ModoPresentacion),
    descripcion: oracion(t.Objetivo),
    aplica: oracion(t.AplicaA),
    requisitos: requisitosDe([...(f?.requisitos ?? []), ...(f?.documentos ?? [])]),
    costo: costoDe(t),
    plazo: oracion((f?.plazo ?? []).join(" ")),
    vigencia: oracion((f?.vigencia ?? []).join(" ")),
    obtienes: oracion((f?.documentoObtenido ?? []).join(" ")),
    horario: oracion((f?.horario ?? []).join(" ")),
    telefono: /\d{3}\s?\d{3}\s?\d{4}/.exec(limpio((f?.telefonos ?? []).join(" ")))?.[0] ?? "",
    domicilio: titulo((f?.domicilio ?? [t.Ubicacion])[0]),
    enLinea: /^https?:\/\//.test(t.UrlRedirect) ? t.UrlRedirect : "",
  };
});

const categorias = CATEGORIAS.map(([slug, nombre, icono]) => ({
  slug,
  nombre,
  icono,
  total: tramites.filter((t) => t.categoria === slug).length,
}));

writeFileSync("data/tramites.json", JSON.stringify({ tramites, categorias }));
const conRequisitos = tramites.filter((t) => t.requisitos.length).length;
console.log(`${tramites.length} trámites, ${fichas.size} fichas, ${conRequisitos} con requisitos`);
console.log(JSON.stringify(tramites.find((t) => t.clave === "HMO-00061"), null, 1));
