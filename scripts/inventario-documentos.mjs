// Recorre fuentes oficiales y anota cada documento descargable con el texto que lo rodea.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const UA = "AsistenteCiudadano-Hackathon/0.1";
const PAUSA_MS = 2000;
const MAX_PAGINAS = 420;
const DOC = /\.(pdf|docx?|xlsx?)(?:[?#]|$)/i;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const limpio = (t = "") => t.replace(/\s+/g, " ").trim();

const listado = JSON.parse(readFileSync("data/listado.json", "utf8"));
const deCatalogo = listado
  .map((t) => t.UrlRedirect)
  .filter((u) => /^https?:\/\//.test(u) && !/ventanilladigital|plataformadetransparencia/i.test(u));

// Cada semilla indica hasta dónde se permite seguir enlaces.
const ENTIDADES = /^https:\/\/(www\.)?hermosillo\.gob\.mx\/entidades\/[^.]*$/i;
const HMODIGITAL = /^https:\/\/hmodigital\.hermosillo\.gob\.mx\/(public\/categories\/\d+(\?page=\d+)?|soporte_hermosillo_7e887937\/[^/?]+)$/i;
const SEMILLAS_EXTRA = [
  { url: "https://www.hermosillo.gob.mx/entidades/desarrollo-urbano/", ambito: ENTIDADES },
  { url: "https://www.hermosillo.gob.mx/entidades/tesoreria-municipal/", ambito: ENTIDADES },
  { url: "https://www.hermosillo.gob.mx/pages/compromiso.aspx", ambito: null },
  { url: "https://catastro.hermosillo.gob.mx/", ambito: null },
  { url: "https://dif.hermosillo.gob.mx/", ambito: null },
];
// Localizados con búsquedas restringidas a dominios oficiales.
const CONOCIDOS = [
  "https://www.hermosillo.gob.mx/entidades/files/desarrollo-urbano/15.-Licencia-de-anuncios---Solicitud.drawio.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/desarrollo-urbano/16.-Renovacion-licencia-de-anuncios---Solicitud.drawio.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/desarrollo-urbano/17.-Permiso-de-anuncios.drawio.pdf",
  "https://www.hermosillo.gob.mx/descargas/ecologia/F-CIDUE-IME-04.doc",
  "https://www.hermosillo.gob.mx/descargas/ecologia/licencia-ambiental/G-CIDUE-IME-2.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/direccion_de_catastro/pdf/2023/traslado_de_dominio.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/direccion_de_catastro/pdf/2023/expedicion_y_venta_de_cartografias.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/direccion_de_inspeccion_y_vigilancia/pdf/permiso_para_la_venta_en_la_via_publica.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/direccion_de_inspeccion_y_vigilancia/pdf/expedicion_de_tarjeta_sanitaria.pdf",
  "https://www.hermosillo.gob.mx/entidades/files/direccion_de_inspeccion_y_vigilancia/pdf/licencias_de_funcionamiento.pdf",
  "https://www.hermosillo.gob.mx/avisosdeprivacidad/archivos/Solicitud%20Derechos%20ARCO%20Hermosillo20.pdf",
  "https://www.hermosillo.gob.mx/descargas/requisitos-cartilla.pdf",
];

let cola = [
  { url: "https://hdigital.hermosillo.gob.mx/", ambito: null },
  { url: "https://www.hermosillo.gob.mx/Index.aspx", ambito: ENTIDADES },
  ...[1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15].map((n) => ({ url: `https://hmodigital.hermosillo.gob.mx/public/categories/${n}`, ambito: HMODIGITAL })),
  { url: "https://www.hermosillo.gob.mx/entidades/", ambito: /^https:\/\/(www\.)?hermosillo\.gob\.mx\/entidades\/[^.]*$/i },
  { url: "https://www.hermosillo.gob.mx/controltramites/", ambito: /^https:\/\/(www\.)?hermosillo\.gob\.mx\/controltramites\//i },
  { url: "https://aguadehermosillo.gob.mx/aguah/tramites-y-servicios/", ambito: /^https:\/\/aguadehermosillo\.gob\.mx\/aguah\/(tramites|factibilidad|tarifa|inspeccion|contrat|convenio|aclarac)/i },
  ...deCatalogo.map((url) => ({ url, ambito: null })),
];

const vistas = new Set();
const documentos = new Map();
let paginas = 0;

// Con EXTRA=1 solo se suman las fuentes nuevas al inventario existente.
if (process.env.EXTRA) {
  cola = SEMILLAS_EXTRA;
  for (const d of JSON.parse(readFileSync("data/documentos-crudos.json", "utf8"))) documentos.set(d.url.split("?")[0], d);
  for (const url of CONOCIDOS) if (!documentos.has(url)) documentos.set(url, { url, texto: "", contexto: "Búsqueda en dominio oficial", pagina: "" });
}

function contexto($, enlace) {
  let nodo = $(enlace);
  for (let i = 0; i < 6; i++) {
    nodo = nodo.parent();
    const texto = limpio(nodo.text());
    if (texto.length > 60) return texto.slice(0, 400);
  }
  return limpio(nodo.text()).slice(0, 400);
}

while (cola.length && paginas < MAX_PAGINAS) {
  const { url, ambito } = cola.shift();
  const clave = url.split("#")[0];
  if (vistas.has(clave)) continue;
  vistas.add(clave);

  let html;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "")) {
      await espera(PAUSA_MS);
      continue;
    }
    html = await res.text();
  } catch (e) {
    console.log(`Falló ${url.slice(0, 90)}: ${e.message}`);
    await espera(PAUSA_MS);
    continue;
  }
  paginas++;

  const $ = cheerio.load(html);
  const base = res_url(url);
  $("a[href]").each((_, a) => {
    let destino;
    try {
      destino = new URL($(a).attr("href"), base).href;
    } catch {
      return;
    }
    if (DOC.test(destino)) {
      // Los enlaces de S3 cambian de firma en cada visita: se identifican sin ella.
      const llave = destino.split("?")[0];
      const previo = documentos.get(llave);
      const nuevo = { url: destino, texto: limpio($(a).text()).slice(0, 160), contexto: contexto($, a), pagina: url };
      if (!previo || (!previo.texto && nuevo.texto)) documentos.set(llave, nuevo);
    } else if (ambito?.test(destino.split("#")[0]) && !vistas.has(destino.split("#")[0])) {
      cola.push({ url: destino.split("#")[0], ambito });
    }
  });
  if (paginas % 10 === 0) console.log(`${paginas} páginas, ${documentos.size} documentos, ${cola.length} en cola`);
  await espera(PAUSA_MS);
}

function res_url(u) {
  return u;
}

mkdirSync("data", { recursive: true });
writeFileSync("data/documentos-crudos.json", JSON.stringify([...documentos.values()], null, 1));
console.log(`Terminado: ${paginas} páginas, ${documentos.size} documentos únicos`);
