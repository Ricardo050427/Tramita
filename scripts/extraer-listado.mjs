// Descarga el listado público de trámites (páginas GET) con una pausa entre páginas.
import { mkdirSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const BASE = "https://tramites.hermosillo.gob.mx/";
const PAUSA_MS = 1500;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const tramites = new Map();

for (let page = 1; page <= 20; page++) {
  const res = await fetch(`${BASE}?page=${page}`, {
    headers: { "User-Agent": "AsistenteCiudadano-Hackathon/0.1" },
  });
  if (!res.ok) throw new Error(`Página ${page}: HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());

  $("form#frmIniciarTramite").each((_, form) => {
    const campos = {};
    $(form)
      .find("input[type=hidden]")
      .each((_, input) => {
        const nombre = $(input).attr("name");
        if (nombre && !nombre.startsWith("__")) campos[nombre] = ($(input).attr("value") ?? "").trim();
      });
    if (campos.Clave) tramites.set(campos.Clave, campos);
  });
  console.log(`Página ${page}: ${tramites.size} acumulados`);
  await espera(PAUSA_MS);
}

mkdirSync("data", { recursive: true });
writeFileSync("data/listado.json", JSON.stringify([...tramites.values()], null, 2));
console.log(`Listo: ${tramites.size} trámites`);
console.log(Object.keys([...tramites.values()][0]));
