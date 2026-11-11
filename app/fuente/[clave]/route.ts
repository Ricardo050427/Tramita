import type { NextRequest } from "next/server";
import catalogo from "@/data/catalogo-oficial.json";

// El catálogo municipal no tiene una dirección por trámite: su botón «Ver más» envía un formulario con los datos
// de la ficha. Esta página arma ese mismo formulario y lo envía, para abrir la ficha oficial exacta.
const OFICIAL = "https://tramites.hermosillo.gob.mx";
const UA = "Tramita-Hackathon/1.0 (+https://tramita-blond.vercel.app)";

type Campos = Record<string, string>;

const ENTIDADES: Record<string, string> = { amp: "&", quot: '"', lt: "<", gt: ">", apos: "'", nbsp: " " };

function decodificar(texto: string) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTIDADES[e.toLowerCase()] ?? todo;
  });
}

const escapar = (texto: string) => texto.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Las primeras palabras del nombre, con sus espacios tal cual: el buscador oficial no encuentra el nombre completo. */
const fraseDeBusqueda = (nombre: string) => nombre.match(/^\S+(?:\s+\S+){0,4}/)?.[0] ?? "";

/** Los datos que el catálogo publica hoy, leídos del mismo listado donde está su botón «Ver más». */
async function camposVigentes(clave: string, nombre: string): Promise<Campos | null> {
  const frase = fraseDeBusqueda(nombre);
  if (!frase) return null;
  try {
    const res = await fetch(`${OFICIAL}/?search=${encodeURIComponent(frase)}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const html = await res.text();
    for (const [form] of html.matchAll(/<form[^>]*frmIniciarTramite[^>]*>[\s\S]*?<\/form>/g)) {
      const campos: Campos = {};
      for (const [input] of form.matchAll(/<input[^>]*>/g)) {
        const nombreCampo = input.match(/\bname="([^"]*)"/)?.[1];
        if (!nombreCampo || nombreCampo.startsWith("__") || !/type="hidden"/i.test(input)) continue;
        campos[nombreCampo] = decodificar(input.match(/\bvalue="([^"]*)"/)?.[1] ?? "").trim();
      }
      if (campos.Clave === clave) return campos;
    }
  } catch {}
  return null;
}

function pagina(campos: Campos | null, nombre: string) {
  const entradas = Object.entries(campos ?? {})
    .map(([k, v]) => `<input type="hidden" name="${escapar(k)}" value="${escapar(v)}">`)
    .join("");
  const titulo = escapar(nombre || "Catálogo municipal de trámites");
  const accion = campos ? `${OFICIAL}/Home/Tramiteinfo` : `${OFICIAL}/`;
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Abriendo la ficha oficial · Tramita</title>
<style>
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #e9ebee; color: #15120e; font-family: system-ui, sans-serif; }
  main { max-width: 26rem; padding: 1.5rem; text-align: center; }
  p { margin: 0.5rem 0 0; line-height: 1.4; color: #4f555d; }
  button { margin-top: 1.25rem; min-height: 3rem; padding: 0 1.25rem; border: 0; border-radius: 999px; background: #e96000; color: #15120e; font: inherit; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
<main>
  <strong>Abriendo la ficha en el catálogo del Ayuntamiento</strong>
  <p>${titulo}</p>
  <form id="ficha" method="${campos ? "post" : "get"}" action="${accion}">${entradas}<button type="submit">Abrir la ficha oficial</button></form>
</main>
<script>document.getElementById("ficha").submit();</script>
</body>
</html>`;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/fuente/[clave]">) {
  const { clave } = await ctx.params;
  const guardado = (catalogo as Record<string, Campos>)[clave];
  // Si el catálogo no responde, se usa la copia del día en que se consultó; si la clave no existe, se abre el catálogo.
  const campos = guardado ? ((await camposVigentes(clave, guardado.Nombre)) ?? guardado) : null;
  return new Response(pagina(campos, guardado?.Nombre ?? ""), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
