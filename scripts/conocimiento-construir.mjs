// Parte las fuentes oficiales en fragmentos citables para la búsqueda.
import { readFileSync, writeFileSync } from "node:fs";

const crudo = JSON.parse(readFileSync("data/conocimiento-crudo.json", "utf8"));
const TAMANO = 1100;
const fragmentos = [];
const limpio = (t) => t.replace(/\s+/g, " ").trim();

function agregar(fuente, tipo, url, cita, texto) {
  const t = limpio(texto);
  if (t.length > 60) fragmentos.push({ fuente, tipo, url, cita, texto: t });
}

function ventanas(texto) {
  const salida = [];
  let resto = limpio(texto);
  while (resto.length > TAMANO) {
    const corte = Math.max(resto.lastIndexOf(". ", TAMANO), TAMANO * 0.6);
    salida.push(resto.slice(0, corte + 1));
    resto = resto.slice(corte + 1).trim();
  }
  if (resto) salida.push(resto);
  return salida;
}

// Encabezado de artículo: "ARTÍCULO 13.-" o "Artículo 13.", no una mención dentro de una frase.
const ARTICULO = /(?=\b(?:ART[IÍ]CULO|Art[ií]culo)\s+\d+\s*[º°o]?\s*(?:Bis\s*[A-Z]?\s*)?[.\-–])/g;

// Quita lo que todas las páginas del portal repiten antes del contenido.
const sinPlantilla = (t) => t.replace(/^.*?Entendido, continuar\s*/, "").replace(/arrow_circle_(up|down)\s*/g, "").replace(/\binfo\s+/g, "");

// Solo normas que rigen trámites municipales; la página de Agua también enlaza leyes federales ajenas.
const APLICA = /hermosillo|hacienda municipal|catastral|agua (potable|del estado)|prestaci[oó]n .*agua/i;

for (const ley of crudo.leyes) {
  // De la Ley de Ingresos solo vale la del ejercicio vigente.
  if (!APLICA.test(ley.titulo) || (/ingresos/i.test(ley.titulo) && !/2026/.test(ley.titulo))) {
    console.log(`Omitida por no ser municipal: ${ley.titulo}`);
    continue;
  }
  if (ley.escaneado) {
    console.log(`Omitida por escaneada: ${ley.titulo}`);
    continue;
  }
  const completo = ley.textos.join(" ");
  const partes = completo.split(ARTICULO).filter((p) => /^art[ií]culo/i.test(p));
  if (partes.length >= 5) {
    for (const parte of partes) {
      const n = /^art[ií]culo\s+(\d+)/i.exec(parte)?.[1];
      ventanas(parte).forEach((v) => agregar(ley.titulo, "ley", ley.url, `artículo ${n}`, v));
    }
  } else {
    ley.textos.forEach((t, i) => ventanas(t).forEach((v) => agregar(ley.titulo, "ley", ley.url, `página ${i + 1}`, v)));
  }
}

for (const d of crudo.documentos) {
  const texto = d.textos.join(" ");
  if (texto.length < 200) continue;
  ventanas(texto).forEach((v, i) => agregar(d.titulo, d.tipo === "guia" ? "guia" : "formato", d.url || `/documentos/${d.archivo}`, i ? `parte ${i + 1}` : "", v));
}

const vistos = new Set();
for (const p of crudo.paginas) {
  const texto = sinPlantilla(p.texto);
  const huella = texto.slice(0, 400);
  if (texto.length < 120 || vistos.has(huella)) continue;
  vistos.add(huella);
  ventanas(texto).slice(0, 8).forEach((v, i) => agregar(p.titulo || "Portal de trámites de Hermosillo", "pagina", p.url, i ? `parte ${i + 1}` : "", v));
}

writeFileSync("data/conocimiento.json", JSON.stringify(fragmentos));
const c = {};
fragmentos.forEach((f) => (c[f.tipo] = (c[f.tipo] ?? 0) + 1));
console.log(`${fragmentos.length} fragmentos, ${(JSON.stringify(fragmentos).length / 1048576).toFixed(1)} MB`, c);
