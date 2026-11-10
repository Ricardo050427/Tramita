// Reúne el texto completo de fuentes oficiales: leyes, reglamentos, páginas de trámites y PDF ya descargados.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";

const UA = "AsistenteCiudadano-Hackathon/0.1";
const PAUSA_MS = 2000;
const MAX_PAGINAS = 420;
const SALIDA = "data/conocimiento-crudo.json";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const limpio = (t = "") => t.replace(/\s+/g, " ").trim();
const obtener = (url) => fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });

const u = (ruta) => `https://pmt.hermosillo.gob.mx/uploads/${ruta}`;
const LEYES = [
  { titulo: "Ley de Ingresos de Hermosillo 2026", url: "https://gestion.api.congresoson.gob.mx/assets/archivos/2025/12/3b0Kq8PxVylskTQ__I61MnU1Iark7Wk.pdf" },
  { titulo: "Ley de Hacienda Municipal de Sonora", url: "https://www.hermosillo.gob.mx/pages/archivos/8%20ley%20de%20hacienda%20municipal%20en%20pdf.pdf" },
  { titulo: "Reglamento de Construcción de Hermosillo", url: u("REGLAMENTO%20CONSTRUCCION.pdf") },
  { titulo: "Reglamento de Protección Civil de Hermosillo", url: u("REGLAMENTO%20DE%20PROTECCI%C3%93N%20CIVIL%20DEL%20MUNICIPIO%20DE%20HERMOSILLO.pdf") },
  { titulo: "Reglamento de Ecología y Protección al Ambiente de Hermosillo", url: u("REGLAMENTO%20DE%20ECOLOGiA%20Y%20PROTECCION%20AL%20AMBIENTE%20DEL%20MUNICIPIO%20DE%20HERMOSILLO.pdf") },
  { titulo: "Reglamento de Estacionamientos Públicos de Hermosillo", url: u("REGLAMENTO%20ESTACIONAMIENTOS%20PUBLICOS.pdf") },
  { titulo: "Reglamento de Mercados y Centrales de Abasto", url: u("REGLAMENTO%20DE%20MERCADOS%20Y%20CENTRALES%20DE%20ABASTO.pdf") },
  { titulo: "Bando de Policía y Gobierno de Hermosillo", url: u("Bando%20de%20Policia%20y%20Gobierno.pdf") },
  { titulo: "Reglamento de Catastro de Hermosillo", url: "https://catastro.hermosillo.gob.mx/PDFS/REGLAMENTO%20DE%20CATASTRO%20PARA%20EL%20MUNICIPIO%20DE%20HERMOSILLO%20(1).pdf" },
  { titulo: "Ley Catastral y Registral de Sonora", url: "https://catastro.hermosillo.gob.mx/PDFS/LEY%20CATASTRAL%20Y%20REGISTRAL%20DEL%20ESTADO%20DE%20SONORA.PDF" },
];

const previo = existsSync(SALIDA) ? JSON.parse(readFileSync(SALIDA, "utf8")) : { leyes: [], paginas: [], documentos: [] };
const resultado = { leyes: [], paginas: previo.paginas ?? [], documentos: [] };
const guardar = () => writeFileSync(SALIDA, JSON.stringify(resultado));
mkdirSync("data", { recursive: true });

async function textoDePdf(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { paginas: totalPages, textos: text.map((p) => limpio(p)) };
}

// 1. Leyes y reglamentos, más los que publica Agua de Hermosillo en su sustento legal.
try {
  const r = await obtener("https://aguadehermosillo.gob.mx/aguah/sustento-legal/");
  const $ = cheerio.load(await r.text());
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    const texto = limpio($(a).text());
    if (/\.pdf/i.test(href) && /reglamento|ley /i.test(`${texto} ${href}`)) {
      LEYES.push({ titulo: texto.length > 8 ? texto.slice(0, 90) : decodeURIComponent(href.split("/").pop()), url: new URL(href, r.url).href });
    }
  });
} catch (e) {
  console.log("Sin sustento legal de Agua:", e.message);
}

for (const ley of LEYES) {
  await espera(PAUSA_MS);
  try {
    const r = await obtener(ley.url);
    const b = Buffer.from(await r.arrayBuffer());
    if (!r.ok || b.subarray(0, 4).toString() !== "%PDF") {
      console.log(`No válido (${r.status}): ${ley.titulo}`);
      continue;
    }
    const { paginas, textos } = await textoDePdf(b);
    const total = textos.join(" ").length;
    resultado.leyes.push({ ...ley, paginas, textos, escaneado: total / paginas < 150 });
    console.log(`Ley: ${ley.titulo} | ${paginas} págs | ${Math.round(total / 1000)}k`);
  } catch (e) {
    console.log(`Falló ${ley.titulo}: ${e.message}`);
  }
}
guardar();

// 2. Texto completo de los documentos ya publicados.
const analizados = JSON.parse(readFileSync("data/documentos-analizados.json", "utf8"));
const mapa = JSON.parse(readFileSync("data/mapa-documentos.json", "utf8"));
const nombreDe = (x) => decodeURIComponent(x.split("?")[0].split("/").pop());
for (const m of mapa) {
  const d = analizados.find((x) => !x.error && x.archivo && x.ext === "pdf" && nombreDe(x.url).includes(m.nombre));
  if (!d) continue;
  try {
    const { paginas, textos } = await textoDePdf(readFileSync(`data/originales/${d.archivo}`));
    resultado.documentos.push({ titulo: m.titulo, claves: m.claves, tipo: m.tipo, url: /amazonaws/.test(d.url) ? "" : d.url, archivo: d.archivo, paginas, textos });
  } catch (e) {
    console.log(`Sin texto ${m.titulo}: ${e.message}`);
  }
}
guardar();
console.log(`Documentos con texto: ${resultado.documentos.filter((d) => d.textos.join("").length > 200).length} de ${resultado.documentos.length}`);

// 3. Páginas HTML de trámites.
const listado = JSON.parse(readFileSync("data/listado.json", "utf8"));
const HMODIGITAL = /^https:\/\/hmodigital\.hermosillo\.gob\.mx\/(public\/categories\/\d+(\?page=\d+)?|soporte_hermosillo_7e887937\/[^/?]+)$/i;
const AGUA = /^https:\/\/aguadehermosillo\.gob\.mx\/aguah\/(tramites|factibilidad|tarifa|inspeccion|contrat|convenio|aclarac|preguntas)/i;
const cola = [
  ...[1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15].map((n) => ({ url: `https://hmodigital.hermosillo.gob.mx/public/categories/${n}`, ambito: HMODIGITAL })),
  { url: "https://aguadehermosillo.gob.mx/aguah/tramites-y-servicios/", ambito: AGUA },
  { url: "https://aguadehermosillo.gob.mx/aguah/tarifas/", ambito: null },
  ...listado.map((t) => t.UrlRedirect).filter((x) => /urbem\.digital|hmodigital/.test(x)).map((url) => ({ url, ambito: null })),
];
const vistas = new Set(resultado.paginas.map((p) => p.url));
let leidas = 0;

while (cola.length && leidas < MAX_PAGINAS) {
  const { url, ambito } = cola.shift();
  const clave = url.split("#")[0];
  if (vistas.has(clave)) continue;
  vistas.add(clave);
  try {
    const r = await obtener(clave);
    if (r.ok && /html/i.test(r.headers.get("content-type") ?? "")) {
      const $ = cheerio.load(await r.text());
      if (ambito) {
        $("a[href]").each((_, a) => {
          try {
            const d = new URL($(a).attr("href"), clave).href.split("#")[0];
            if (ambito.test(d) && !vistas.has(d)) cola.push({ url: d, ambito });
          } catch {}
        });
      }
      $("script,style,noscript,nav,header,footer,svg").remove();
      const titulo = limpio($("h1").first().text() || $("h2").first().text() || $("title").text()).slice(0, 110);
      const texto = limpio($("main").text() || $("body").text()).slice(0, 9000);
      if (!/\/public\/categories\//.test(clave) && texto.length > 200) resultado.paginas.push({ titulo, url: clave, texto });
      leidas++;
      if (leidas % 25 === 0) {
        guardar();
        console.log(`${leidas} páginas, ${resultado.paginas.length} con texto, ${cola.length} en cola`);
      }
    }
  } catch (e) {
    console.log(`Falló ${clave.slice(0, 80)}: ${e.message}`);
  }
  await espera(PAUSA_MS);
}
guardar();
console.log(`Terminado: ${resultado.leyes.length} leyes, ${resultado.documentos.length} documentos, ${resultado.paginas.length} páginas`);
