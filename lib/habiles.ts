// Días hábiles: sin sábados, domingos ni los descansos obligatorios del artículo 74 de la Ley Federal del Trabajo.
// La dependencia puede tener días inhábiles propios (vacaciones), así que el resultado es la fecha más temprana posible.

export type Plazo = { dias: number; habiles: boolean };

/** Lee el plazo publicado ("15 días hábiles", "10 días el plazo de..."). Null si es indefinido. */
export function leerPlazo(texto: string): Plazo | null {
  const t = texto.toLowerCase();
  if (!t.trim() || /^indefinido/.test(t.trim())) return null;
  const m = /(\d+)\s*(d[ií]as?|horas?|minutos?|semanas?|mes(?:es)?)/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (/^(hora|minuto)/.test(m[2])) return { dias: 1, habiles: true };
  if (m[2].startsWith("semana")) return { dias: n * 7, habiles: false };
  if (m[2].startsWith("mes")) return { dias: n * 30, habiles: false };
  return { dias: n, habiles: /h[aá]biles/.test(t) || !/naturales/.test(t) };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fechaLocal = (texto: string) => {
  const [a, m, d] = texto.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
};
export const hoyIso = () => iso(new Date());

function lunes(anio: number, mes: number, n: number) {
  const d = new Date(anio, mes, 1);
  const primero = (8 - d.getDay()) % 7; // días hasta el primer lunes
  return iso(new Date(anio, mes, 1 + primero + (n - 1) * 7));
}

const festivos = new Map<number, Set<string>>();
function festivosDe(anio: number) {
  if (!festivos.has(anio)) {
    const dias = [`${anio}-01-01`, lunes(anio, 1, 1), lunes(anio, 2, 3), `${anio}-05-01`, `${anio}-09-16`, lunes(anio, 10, 3), `${anio}-12-25`];
    if ((anio - 2024) % 6 === 0) dias.push(`${anio}-10-01`); // transmisión del Poder Ejecutivo Federal
    festivos.set(anio, new Set(dias));
  }
  return festivos.get(anio)!;
}

export const esHabil = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !festivosDe(d.getFullYear()).has(iso(d));

/** Fecha límite: cuenta desde el día siguiente a la entrega. */
export function fechaLimite(entregado: string, plazo: Plazo) {
  const d = fechaLocal(entregado);
  if (!plazo.habiles) {
    d.setDate(d.getDate() + plazo.dias);
    return iso(d);
  }
  let contados = 0;
  while (contados < plazo.dias) {
    d.setDate(d.getDate() + 1);
    if (esHabil(d)) contados++;
  }
  return iso(d);
}

/** Días hábiles entre dos fechas (sin contar la primera). Negativo si "hasta" ya pasó. */
export function habilesEntre(desde: string, hasta: string) {
  const a = fechaLocal(desde);
  const b = fechaLocal(hasta);
  const signo = a <= b ? 1 : -1;
  const [inicio, fin] = signo === 1 ? [a, b] : [b, a];
  let n = 0;
  const d = new Date(inicio);
  while (d < fin) {
    d.setDate(d.getDate() + 1);
    if (esHabil(d)) n++;
  }
  return n * signo;
}

export const fechaCorta = (texto: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(fechaLocal(texto));

/** Archivo de calendario con un aviso un día antes de que venza el plazo. */
export function archivoCalendario({ clave, nombre, limite, plazo, sitio }: { clave: string; nombre: string; limite: string; plazo: string; sitio: string }) {
  const escapar = (t: string) => t.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const compacta = (t: string) => t.replace(/-/g, "");
  const siguiente = new Date(fechaLocal(limite));
  siguiente.setDate(siguiente.getDate() + 1);
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tramita//Hermosillo//ES",
    "BEGIN:VEVENT",
    `UID:${clave}-${limite}@tramita`,
    `DTSTAMP:${sello}`,
    `DTSTART;VALUE=DATE:${compacta(limite)}`,
    `DTEND;VALUE=DATE:${compacta(iso(siguiente))}`,
    `SUMMARY:${escapar(`Vence el plazo: ${nombre}`)}`,
    `DESCRIPTION:${escapar(`La dependencia debe responderte a más tardar hoy (plazo publicado: ${plazo}). Si no te respondieron, puedes reportarlo: ${sitio}/tramite/${clave}/reportar?tipo=plazo`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(`Mañana vence el plazo de ${nombre}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
