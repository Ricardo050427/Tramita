import { list, put } from "@vercel/blob";

// Consulta ciudadana de la Agenda de Simplificación: un archivo vacío por voto, votos/<clave>/<fecha>-<azar>.json.
const PREFIJO = "votos/";
const VIGENCIA_MS = 30_000;
const hayAlmacen = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

const enMemoria = new Map<string, number>();
let copia: { conteo: Map<string, number>; hora: number } | null = null;

export async function votar(clave: string) {
  if (!hayAlmacen()) {
    enMemoria.set(clave, (enMemoria.get(clave) ?? 0) + 1);
    return;
  }
  await put(`${PREFIJO}${clave}/${hoy()}.json`, "1", { access: "private", contentType: "application/json", addRandomSuffix: true });
  if (copia) copia.conteo.set(clave, (copia.conteo.get(clave) ?? 0) + 1);
}

export async function leerVotos(): Promise<Map<string, number>> {
  if (!hayAlmacen()) return enMemoria;
  if (copia && Date.now() - copia.hora < VIGENCIA_MS) return copia.conteo;
  const conteo = new Map<string, number>();
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 10; pagina++) {
    const r = await list({ prefix: PREFIJO, limit: 1000, cursor });
    for (const b of r.blobs) {
      const clave = b.pathname.split("/")[1];
      if (clave) conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  copia = { conteo, hora: Date.now() };
  return conteo;
}
