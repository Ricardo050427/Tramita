// Abre la ficha pública de cada trámite (equivale a pulsar "Ver más"), una cada 2 segundos.
// Reanudable: lo ya guardado en data/fichas.jsonl no se vuelve a pedir.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import * as cheerio from "cheerio";

const BASE = "https://tramites.hermosillo.gob.mx";
const SALIDA = "data/fichas.jsonl";
const PAUSA_MS = 2000;
const LIMITE = Number(process.env.LIMITE ?? Infinity);
const UA = "AsistenteCiudadano-Hackathon/0.1";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync("data", { recursive: true });
const hechas = new Set(
  existsSync(SALIDA)
    ? readFileSync(SALIDA, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).clave)
    : [],
);

const TITULOS = [
  ["informacion", "INFORMACIÓN GENERAL"],
  ["aplica", "ESTE TRÁMITE APLICA"],
  ["requisitos", "REQUISITOS DEL TRÁMITE"],
  ["costo", "COSTO"],
  ["documentos", "DATOS Y DOCUMENTOS ESPECÍFICOS QUE DEBE CONTENER O SE DEBEN ADJUNTAR AL TRÁMITE"],
  ["fundamento", "FUNDAMENTO JURIDICO"],
  ["fundamentoCobro", "FUNDAMENTO JURIDICO COBRO"],
  ["plazo", "PLAZO DE RESPUESTA"],
  ["sanciones", "¿APLICA SANCIONES?"],
  ["vigencia", "VIGENCIA"],
  ["documentoObtenido", "DOCUMENTO A OBTENER PRODUCTO DEL TRÁMITE"],
  ["horario", "HORARIO ATENCION"],
  ["telefonos", "TELEFONOS"],
  ["correo", "CORREO ELECTRÓNICO"],
  ["domicilio", "DOMICILIO"],
];
const CORTES = new Set([...TITULOS.map(([, t]) => t), "CONTACTO", "RESPONSABLE", "CARGO"]);

function textoEnLineas($, nodo) {
  nodo.find("script,style,nav,footer").remove();
  nodo.find("br").replaceWith("\n");
  nodo.find("p,div,li,h1,h2,h3,h4,h5,h6,tr").each((_, e) => {
    $(e).append("\n");
  });
  return nodo
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function secciones(lineas) {
  const inicio = lineas.findIndex((l) => l === "INFORMACIÓN GENERAL");
  const cuerpo = lineas.slice(inicio < 0 ? 0 : inicio);
  const salida = {};
  let actual = null;
  for (const l of cuerpo) {
    const titulo = TITULOS.find(([, t]) => t === l);
    if (titulo) {
      actual = titulo[0];
      salida[actual] = [];
    } else if (CORTES.has(l) || l.includes("AVISO DE PRIVACIDAD")) {
      actual = null;
    } else if (actual) {
      salida[actual].push(l);
    }
  }
  return salida;
}

let cookie = "";
function guardarCookies(res) {
  const nuevas = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  if (nuevas.length) {
    const mapa = new Map(cookie.split("; ").filter(Boolean).map((c) => c.split(/=(.*)/s).slice(0, 2)));
    nuevas.forEach((c) => {
      const [k, v] = c.split(/=(.*)/s);
      mapa.set(k, v);
    });
    cookie = [...mapa].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

let leidas = 0;
for (let page = 1; page <= 20 && leidas < LIMITE; page++) {
  const lista = await fetch(`${BASE}/?page=${page}`, { headers: { "User-Agent": UA, Cookie: cookie } });
  guardarCookies(lista);
  const $l = cheerio.load(await lista.text());
  const forms = $l("form#frmIniciarTramite").toArray();

  for (const form of forms) {
    if (leidas >= LIMITE) break;
    const cuerpo = new URLSearchParams();
    $l(form)
      .find("input[type=hidden]")
      .each((_, i) => cuerpo.append($l(i).attr("name"), $l(i).attr("value") ?? ""));
    const clave = cuerpo.get("Clave");
    if (hechas.has(clave)) continue;

    await espera(PAUSA_MS);
    const res = await fetch(`${BASE}/Home/Tramiteinfo`, {
      method: "POST",
      body: cuerpo,
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
        Referer: `${BASE}/?page=${page}`,
      },
    });
    guardarCookies(res);
    if (!res.ok) {
      console.log(`${clave}: HTTP ${res.status}, se omite`);
      continue;
    }
    const $ = cheerio.load(await res.text());
    const ficha = { clave, ...secciones(textoEnLineas($, $("body"))) };
    appendFileSync(SALIDA, JSON.stringify(ficha) + "\n");
    leidas++;
    if (leidas % 10 === 0 || LIMITE < 10) console.log(`${leidas}: ${clave}`);
  }
}
console.log(`Terminado: ${leidas} fichas nuevas`);
