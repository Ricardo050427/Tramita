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

const centros = JSON.parse(readFileSync("data/centros-tesoreria.json", "utf8"));
const esTesoreriaEnKino = (t, f) => /TESORER/i.test(t.Dependencia) && /PUERTO VALLARTA/i.test((f?.domicilio ?? []).join(" "));

// Solo acepta teléfonos completos: lada de 3 dígitos y número de 7.
function telefonoDe(lineas = []) {
  for (const m of limpio(lineas.join(" ")).matchAll(/\b(\d{3}) (\d+)\b/g)) {
    if (m[2].length === 7) return `${m[1]} ${m[2].slice(0, 3)} ${m[2].slice(3)}`;
  }
  return "";
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
    sanciones: oracion((f?.sanciones ?? []).join(" ")).slice(0, 400),
    fundamento: oracion(t.FundamentoJuridico).slice(0, 300),
    horario: oracion((f?.horario ?? []).join(" ")),
    telefono: telefonoDe(f?.telefonos),
    domicilio: titulo((f?.domicilio ?? [t.Ubicacion])[0]),
    enLinea: /^https?:\/\//.test(t.UrlRedirect) ? t.UrlRedirect : "",
    // El catálogo da solo el centro de Bahía Kino a estos trámites; el portal lista los demás.
    ...(esTesoreriaEnKino(t, f) ? { domicilio: "", horario: "", oficinas: centros } : {}),
  };
});

// El catálogo manda varios trámites a páginas generales; estos enlaces van al servicio exacto.
const enlacesDirectos = JSON.parse(readFileSync("data/enlaces-directos.json", "utf8"));
for (const t of tramites) if (t.clave in enlacesDirectos) t.enLinea = enlacesDirectos[t.clave];
const usosDeEnlace = new Map();
for (const t of tramites) if (t.enLinea) usosDeEnlace.set(t.enLinea, (usosDeEnlace.get(t.enLinea) ?? 0) + 1);
for (const t of tramites) {
  // La ventanilla digital abre un solo formulario por enlace; las demás páginas compartidas reúnen varios trámites.
  if (t.enLinea && !/ventanilladigital/.test(t.enLinea) && usosDeEnlace.get(t.enLinea) > 1) t.enLineaGeneral = true;
}

// Documentos revisados y requisitos que se consiguen con otro trámite del catálogo.
const documentosRevisados = JSON.parse(readFileSync("data/documentos.json", "utf8"));
const COMO_OBTENER = [
  [/no adeudo.{0,40}predial|predial.{0,40}no adeudo/i, "HMO-00035"],
  [/no adeudo.{0,40}agua|agua.{0,40}no adeudo/i, "HMO-00018"],
  [/no adeudo/i, "HMO-00033"],
  [/licencia de uso de suelo/i, "HMO-00227"],
  [/n[uú]mero oficial/i, "HMO-00211"],
];
for (const t of tramites) {
  const docs = documentosRevisados.filter((d) => d.claves.includes(t.clave)).map(({ claves, ...d }) => d);
  if (docs.length) t.documentos = docs;
  const solicitud = docs.find((d) => d.tipo === "solicitud");
  for (const r of t.requisitos) {
    if (solicitud && /formato|solicitud/i.test(r.titulo) && !/no adeudo/i.test(r.titulo)) r.documento = solicitud.id;
    // El comprobante de pago suele mencionar otros trámites sin que se obtenga con ellos.
    const texto = /comprobante|pago|recibo/i.test(r.titulo) ? "" : `${r.titulo} ${(r.detalle ?? "").slice(0, 120)}`;
    const clave = COMO_OBTENER.find(([re]) => re.test(texto))?.[1];
    if (clave && clave !== t.clave) {
      const destino = tramites.find((x) => x.clave === clave);
      if (destino) r.obtener = { clave, nombre: destino.nombre };
    }
  }
}

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
