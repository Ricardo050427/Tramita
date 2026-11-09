// Descarga cada documento oficial del inventario, comprueba que sea real y extrae sus datos.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const UA = "AsistenteCiudadano-Hackathon/0.1";
const PAUSA_MS = 2000;
const MAX_BYTES = 12 * 1024 * 1024;
// El portal de trámites del municipio guarda sus adjuntos en este bucket.
const OFICIAL = /^https?:\/\/(([a-z0-9-]+\.)*(hermosillo\.gob\.mx|aguadehermosillo\.gob\.mx|implanhermosillo\.gob\.mx)\/|s3\.amazonaws\.com\/urbem-api-production\/)/i;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const crudos = JSON.parse(readFileSync("data/documentos-crudos.json", "utf8"));
const salidaPath = "data/documentos-analizados.json";
const previos = existsSync(salidaPath) ? JSON.parse(readFileSync(salidaPath, "utf8")) : [];
const hechos = new Map(previos.map((d) => [d.url, d]));
mkdirSync("data/originales", { recursive: true });

function tipoDe(b) {
  if (b.subarray(0, 4).toString() === "%PDF") return "pdf";
  if (b.subarray(0, 2).toString() === "PK") return "zip";
  if (b.subarray(0, 4).toString("hex") === "d0cf11e0") return "doc";
  return null;
}

function nombreArchivo(url, ext) {
  const base = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop())
    .replace(/\.drawio/i, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70);
  return `${base}-${createHash("sha1").update(url).digest("hex").slice(0, 6)}.${ext}`;
}

for (const c of crudos) {
  if (hechos.has(c.url) || !OFICIAL.test(c.url)) continue;
  try {
    const res = await fetch(c.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      hechos.set(c.url, { ...c, error: `HTTP ${res.status}` });
      await espera(PAUSA_MS);
      continue;
    }
    const b = Buffer.from(await res.arrayBuffer());
    const tipo = tipoDe(b);
    if (!tipo) {
      hechos.set(c.url, { ...c, error: "no es un documento válido" });
    } else {
      const ext = tipo === "zip" ? (/\.xlsx/i.test(c.url) ? "xlsx" : "docx") : tipo;
      const registro = { ...c, ext, bytes: b.length, sha: createHash("sha256").update(b).digest("hex") };
      if (b.length <= MAX_BYTES) {
        registro.archivo = nombreArchivo(c.url, ext);
        writeFileSync(`data/originales/${registro.archivo}`, b);
      }
      if (ext === "pdf") {
        try {
          const pdf = await getDocumentProxy(new Uint8Array(b));
          const { totalPages, text } = await extractText(pdf, { mergePages: true });
          registro.paginas = totalPages;
          registro.textoPdf = String(text).replace(/\s+/g, " ").trim().slice(0, 2500);
        } catch (e) {
          registro.errorTexto = e.message;
        }
      }
      hechos.set(c.url, registro);
    }
  } catch (e) {
    hechos.set(c.url, { ...c, error: e.message });
  }
  if (hechos.size % 15 === 0) {
    writeFileSync(salidaPath, JSON.stringify([...hechos.values()], null, 1));
    console.log(`${hechos.size} procesados`);
  }
  await espera(PAUSA_MS);
}

const todos = [...hechos.values()];
writeFileSync(salidaPath, JSON.stringify(todos, null, 1));
const ok = todos.filter((d) => !d.error);
console.log(`Terminado: ${ok.length} válidos, ${todos.length - ok.length} con error, ${(ok.reduce((s, d) => s + (d.bytes ?? 0), 0) / 1048576).toFixed(1)} MB`);
