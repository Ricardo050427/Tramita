import { list, put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";

// Indicadores de uso, anónimos y sin contenido: solo cuántas veces pasó cada cosa.
// Cada servidor junta sus conteos y los guarda juntos unos segundos después, en un archivo
// cuyo nombre lleva los números (metricas/<fecha>/p3-v1-n2-x0-d0.json). Así contar cuesta muy poco.
export type Metricas = { preguntas: number; verificaciones: number; noCuadran: number; pases: number; denuncias: number };

const PREFIJO = "metricas/";
const ESPERA_MS = 8_000;
const VIGENCIA_MS = 60_000;
const vacio = (): Metricas => ({ preguntas: 0, verificaciones: 0, noCuadran: 0, pases: 0, denuncias: 0 });
const hayAlmacen = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

let pendiente = vacio();
let programado = false;
const enMemoria = vacio();
let copia: { total: Metricas & { desde: string | null }; hora: number } | null = null;

const sumar = (a: Metricas, b: Partial<Metricas>) => {
  for (const k of Object.keys(b) as (keyof Metricas)[]) a[k] += b[k] ?? 0;
};

async function volcar() {
  const c = pendiente;
  pendiente = vacio();
  programado = false;
  if (!c.preguntas && !c.verificaciones && !c.noCuadran && !c.pases && !c.denuncias) return;
  await put(`${PREFIJO}${hoy()}/p${c.preguntas}-v${c.verificaciones}-n${c.noCuadran}-x${c.pases}-d${c.denuncias}.json`, "1", {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: true,
  }).catch((e) => console.error("No se guardaron las métricas:", e instanceof Error ? e.message : e));
}

export function anotar(cambio: Partial<Metricas>) {
  if (!hayAlmacen()) {
    sumar(enMemoria, cambio);
    return;
  }
  sumar(pendiente, cambio);
  if (copia) sumar(copia.total, cambio);
  if (programado) return;
  programado = true;
  waitUntil(new Promise<void>((listo) => setTimeout(() => void volcar().finally(listo), ESPERA_MS)));
}

export async function leerMetricas(): Promise<Metricas & { desde: string | null }> {
  if (!hayAlmacen()) return { ...enMemoria, desde: null };
  if (copia && Date.now() - copia.hora < VIGENCIA_MS) return copia.total;
  const total = { ...vacio(), desde: null as string | null };
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 10; pagina++) {
    const r = await list({ prefix: PREFIJO, limit: 1000, cursor });
    for (const b of r.blobs) {
      const [, fecha, archivo] = b.pathname.split("/");
      const m = /^p(\d+)-v(\d+)-n(\d+)-x(\d+)(?:-d(\d+))?/.exec(archivo ?? "");
      if (!m) continue;
      sumar(total, { preguntas: +m[1], verificaciones: +m[2], noCuadran: +m[3], pases: +m[4], denuncias: +(m[5] ?? 0) });
      if (!total.desde || fecha < total.desde) total.desde = fecha;
    }
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  sumar(total, pendiente);
  copia = { total, hora: Date.now() };
  return total;
}
