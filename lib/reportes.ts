import { list, put } from "@vercel/blob";
import { tramitePorClave } from "./datos";
import { TIPOS_REPORTE, type ResumenReportes, type TipoReporte } from "./tipos-reporte";

// Cada reporte es un archivo privado: reportes/<clave>/<tipo>/<fecha>-<azar>.json.
// El nombre basta para contarlos, así el tablero nunca abre el texto que escribió la persona.
const PREFIJO = "reportes/";
const hayAlmacen = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export type Reporte = { clave: string; tipo: TipoReporte; fecha: string };

// Sin almacén (en la computadora de desarrollo) los reportes viven en memoria.
const enMemoria: Reporte[] = [];
let copia: { reportes: Reporte[]; hora: number } | null = null;
const VIGENCIA_MS = 30_000;

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

export async function guardarReporte(clave: string, tipo: TipoReporte, detalle: string, origen: string) {
  const reporte = { clave, tipo, fecha: hoy() };
  if (!hayAlmacen()) {
    enMemoria.push(reporte);
  } else {
    await put(`${PREFIJO}${clave}/${tipo}/${reporte.fecha}.json`, JSON.stringify({ ...reporte, detalle: detalle.slice(0, 400), origen }), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: true,
    });
  }
  copia = copia ? { reportes: [...copia.reportes, reporte], hora: copia.hora } : null;
}

export async function leerReportes(): Promise<Reporte[]> {
  if (!hayAlmacen()) return enMemoria;
  if (copia && Date.now() - copia.hora < VIGENCIA_MS) return copia.reportes;
  const reportes: Reporte[] = [];
  let cursor: string | undefined;
  for (let pagina = 0; pagina < 10; pagina++) {
    const r = await list({ prefix: PREFIJO, limit: 1000, cursor });
    for (const b of r.blobs) {
      const [, clave, tipo, archivo] = b.pathname.split("/");
      if (clave && tipo && archivo) reportes.push({ clave, tipo: tipo as TipoReporte, fecha: archivo.slice(0, 10) });
    }
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  copia = { reportes, hora: Date.now() };
  return reportes;
}

export function resumirReportes(reportes: Reporte[]): ResumenReportes {
  const porTramite = new Map<string, number>();
  for (const r of reportes) porTramite.set(r.clave, (porTramite.get(r.clave) ?? 0) + 1);
  return {
    total: reportes.length,
    porTipo: TIPOS_REPORTE.map((t) => ({ id: t.id, corto: t.corto, total: reportes.filter((r) => r.tipo === t.id).length })),
    porTramite: [...porTramite]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([clave, total]) => {
        const t = tramitePorClave(clave);
        return { clave, nombre: t?.nombre ?? clave, dependencia: t?.dependencia ?? "", total };
      }),
    ultimo: reportes.reduce<string | null>((m, r) => (!m || r.fecha > m ? r.fecha : m), null),
  };
}
