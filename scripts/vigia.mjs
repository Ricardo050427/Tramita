// Vigía del catálogo: revisa cada día el catálogo oficial y anota en data/bitacora.json lo que cambió
// (costo, plazo, vigencia, horario, requisitos, trámites nuevos o retirados). No toca los datos que usa la app.
// Uso: node scripts/vigia.mjs   (LIMITE=5 para una prueba corta)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const BASE = "https://tramites.hermosillo.gob.mx";
const UA = "Tramita-Vigia/1.0 (proyecto ciudadano; github.com/Ricardo050427/Tramita)";
const PAUSA_MS = 1500;
const LIMITE = Number(process.env.LIMITE ?? Infinity);
const ARCHIVO_BASE = "data/vigia-base.json";
const BITACORA = "data/bitacora.json";
const CAMPOS = { costo: "el costo", plazo: "el plazo de respuesta", vigencia: "la vigencia", horario: "el horario", requisitos: "los requisitos" };
const MAX_ENTRADAS = 300;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const salida = {};
  let actual = null;
  for (const l of lineas.slice(inicio < 0 ? 0 : inicio)) {
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

// Lo que se compara de cada ficha, ya sin espacios de más.
const resumen = (f) => Object.fromEntries(Object.keys(CAMPOS).map((c) => [c, (f[c] ?? []).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean)]));

let cookie = "";
function guardarCookies(res) {
  const nuevas = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  if (!nuevas.length) return;
  const mapa = new Map(cookie.split("; ").filter(Boolean).map((c) => c.split(/=(.*)/s).slice(0, 2)));
  for (const c of nuevas) {
    const [k, v] = c.split(/=(.*)/s);
    mapa.set(k, v);
  }
  cookie = [...mapa].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function revisarCatalogo() {
  const fichas = new Map();
  for (let page = 1; page <= 20 && fichas.size < LIMITE; page++) {
    const lista = await fetch(`${BASE}/?page=${page}`, { headers: { "User-Agent": UA, Cookie: cookie } });
    guardarCookies(lista);
    if (!lista.ok) throw new Error(`Página ${page}: HTTP ${lista.status}`);
    const $l = cheerio.load(await lista.text());
    const forms = $l("form#frmIniciarTramite").toArray();
    if (!forms.length) break;
    for (const form of forms) {
      if (fichas.size >= LIMITE) break;
      const cuerpo = new URLSearchParams();
      $l(form)
        .find("input[type=hidden]")
        .each((_, i) => cuerpo.append($l(i).attr("name"), $l(i).attr("value") ?? ""));
      const clave = cuerpo.get("Clave");
      if (!clave || fichas.has(clave)) continue;
      await espera(PAUSA_MS);
      const res = await fetch(`${BASE}/Home/Tramiteinfo`, {
        method: "POST",
        body: cuerpo,
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie, Referer: `${BASE}/?page=${page}` },
      });
      guardarCookies(res);
      if (!res.ok) continue;
      const $ = cheerio.load(await res.text());
      const nombre = cuerpo.get("Nombre") ?? cuerpo.get("NombreTramite") ?? "";
      fichas.set(clave, { nombre, ...resumen(secciones(textoEnLineas($, $("body")))) });
    }
    console.log(`Página ${page}: ${fichas.size} fichas`);
  }
  return fichas;
}

function baseInicial() {
  const nombres = new Map(JSON.parse(readFileSync("data/tramites.json", "utf8")).tramites.map((t) => [t.clave, t.nombre]));
  const base = {};
  for (const linea of readFileSync("data/fichas.jsonl", "utf8").split("\n").filter(Boolean)) {
    const f = JSON.parse(linea);
    base[f.clave] = { nombre: nombres.get(f.clave) ?? "", ...resumen(f) };
  }
  return base;
}

const corto = (lineas) => {
  const t = lineas.join(" ");
  return t.length > 220 ? `${t.slice(0, 218)}…` : t;
};

function comparar(base, nuevas, fecha) {
  const cambios = [];
  for (const [clave, n] of nuevas) {
    const b = base[clave];
    const nombre = b?.nombre || n.nombre || clave;
    if (!b) {
      cambios.push({ fecha, clave, nombre, campo: "nuevo", texto: "Apareció en el catálogo oficial." });
      continue;
    }
    for (const [campo, nombreCampo] of Object.entries(CAMPOS)) {
      const antes = b[campo] ?? [];
      const ahora = n[campo] ?? [];
      if (antes.join("\n") === ahora.join("\n")) continue;
      if (campo === "requisitos") {
        const agregados = ahora.filter((l) => !antes.includes(l));
        const quitados = antes.filter((l) => !ahora.includes(l));
        cambios.push({ fecha, clave, nombre, campo, texto: `Cambiaron ${nombreCampo}.`, agregados: agregados.slice(0, 4), quitados: quitados.slice(0, 4) });
      } else {
        cambios.push({ fecha, clave, nombre, campo, texto: `Cambió ${nombreCampo}.`, antes: corto(antes), ahora: corto(ahora) });
      }
    }
  }
  if (LIMITE === Infinity) {
    for (const [clave, b] of Object.entries(base)) {
      if (!nuevas.has(clave)) cambios.push({ fecha, clave, nombre: b.nombre || clave, campo: "retirado", texto: "Ya no aparece en el catálogo oficial." });
    }
  }
  return cambios;
}

const base = existsSync(ARCHIVO_BASE) ? JSON.parse(readFileSync(ARCHIVO_BASE, "utf8")) : baseInicial();
const nuevas = await revisarCatalogo();
const totalBase = Object.keys(base).length;

// Si el portal falla y devuelve pocas fichas, no se anota nada: sería un falso "retirado".
if (LIMITE === Infinity && nuevas.size < totalBase * 0.8) {
  console.log(`Solo se leyeron ${nuevas.size} de ${totalBase} fichas. No se actualiza la bitácora.`);
  process.exit(0);
}

const ahora = new Date();
const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(ahora);
const cambios = comparar(base, nuevas, fecha);
const previa = existsSync(BITACORA) ? JSON.parse(readFileSync(BITACORA, "utf8")) : { cambios: [] };
const bitacora = { revisado: ahora.toISOString(), revisados: nuevas.size, desde: previa.desde ?? "2026-11-09", cambios: [...cambios, ...previa.cambios].slice(0, MAX_ENTRADAS) };

if (LIMITE === Infinity) {
  const siguiente = { ...base };
  for (const [clave, n] of nuevas) siguiente[clave] = { ...n, nombre: base[clave]?.nombre || n.nombre };
  for (const c of cambios) if (c.campo === "retirado") delete siguiente[c.clave];
  writeFileSync(ARCHIVO_BASE, JSON.stringify(siguiente));
  writeFileSync(BITACORA, JSON.stringify(bitacora, null, 1) + "\n");
}
console.log(`Revisadas ${nuevas.size} fichas. Cambios nuevos: ${cambios.length}.`);
for (const c of cambios.slice(0, 20)) console.log(`- ${c.clave} ${c.campo}: ${c.texto}`);
