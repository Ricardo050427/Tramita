// Publica los documentos revisados a mano: copia cada archivo y arma el índice de la app.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const VERIFICADO = "2026-11-09";
const analizados = JSON.parse(readFileSync("data/documentos-analizados.json", "utf8"));
const mapa = JSON.parse(readFileSync("data/mapa-documentos.json", "utf8"));
const nombreDe = (u) => decodeURIComponent(u.split("?")[0].split("/").pop());
const validos = analizados.filter((d) => !d.error && d.archivo);
const FORMATOS = { pdf: "PDF", docx: "Word", doc: "Word", xlsx: "Excel" };

mkdirSync("public/documentos", { recursive: true });
const documentos = [];
const contenido = {};

for (const m of mapa) {
  const d = validos.find((x) => nombreDe(x.url).includes(m.nombre));
  if (!d) {
    console.log(`Omitido, sin archivo válido: ${m.titulo}`);
    continue;
  }
  copyFileSync(`data/originales/${d.archivo}`, `public/documentos/${d.archivo}`);
  const id = d.archivo.replace(/\.\w+$/, "");
  const revision = /\bRev\.?\s*\d+/i.exec(d.textoPdf ?? "")?.[0];
  documentos.push({
    id,
    titulo: m.titulo,
    tipo: m.tipo,
    claves: m.claves,
    archivo: d.archivo,
    url: /amazonaws/.test(d.url) ? "" : d.url, // los enlaces firmados caducan
    formato: FORMATOS[d.ext] ?? d.ext.toUpperCase(),
    pesoKB: Math.max(1, Math.round(d.bytes / 1024)),
    ...(d.paginas ? { paginas: d.paginas } : {}),
    ...(revision ? { revision } : {}),
    verificado: VERIFICADO,
  });
  if (d.textoPdf && d.textoPdf.length > 80) contenido[id] = d.textoPdf.slice(0, 1800);
}

writeFileSync("data/documentos.json", JSON.stringify(documentos, null, 1));
writeFileSync("data/documentos-contenido.json", JSON.stringify(contenido));
console.log(`${documentos.length} documentos publicados, ${(documentos.reduce((s, d) => s + d.pesoKB, 0) / 1024).toFixed(1)} MB, ${new Set(documentos.flatMap((d) => d.claves)).size} trámites cubiertos`);
