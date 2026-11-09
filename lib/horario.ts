// Interpreta los horarios del catálogo y calcula si una oficina está abierta en Hermosillo.
type Tramo = { dias: number[]; abre: number; cierra: number };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function diasDe(segmento: string) {
  if (/lun\w*\s*(a|-)\s*dom/.test(segmento)) return [0, 1, 2, 3, 4, 5, 6];
  if (/lun\w*\s*(a|-)\s*vie/.test(segmento)) return [1, 2, 3, 4, 5];
  if (/s[aá]b/.test(segmento)) return [6];
  return null;
}

export function parsearHorario(texto: string): Tramo[] | null {
  const tramos: Tramo[] = [];
  for (const segmento of texto.toLowerCase().split(/(?=s[aá]bados?\b)/)) {
    const dias = diasDe(segmento);
    if (!dias) return null;
    if (/\b24\s*h/.test(segmento)) {
      tramos.push({ dias, abre: 0, cierra: 24 * 60 });
      continue;
    }
    const m = /(\d{1,2})(?::(\d{2}))?\s*(?:a|-|\/|hasta)\s*(\d{1,2})(?::(\d{2}))?/.exec(segmento);
    if (!m) return null;
    const abre = +m[1] * 60 + +(m[2] ?? 0);
    let cierra = +m[3] * 60 + +(m[4] ?? 0);
    if (cierra <= abre) cierra += 12 * 60; // el catálogo a veces escribe "8:00 / 3:00"
    tramos.push({ dias, abre, cierra });
  }
  return tramos.length ? tramos : null;
}

export function ahoraEnHermosillo(fecha = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Hermosillo",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday);
  return { dia, minutos: +partes.hour * 60 + +partes.minute };
}

const hora = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

export function estadoHorario(texto: string, fecha = new Date()) {
  const tramos = parsearHorario(texto);
  if (!tramos) return null;
  const { dia, minutos } = ahoraEnHermosillo(fecha);

  const hoy = tramos.find((t) => t.dias.includes(dia));
  if (hoy && minutos >= hoy.abre && minutos < hoy.cierra) {
    if (hoy.cierra === 24 * 60 && hoy.abre === 0) return { abierto: true, texto: "Abierto las 24 horas" };
    return { abierto: true, texto: `Abierto, cierra a las ${hora(hoy.cierra)}` };
  }
  if (hoy && minutos < hoy.abre) return { abierto: false, texto: `Cerrado, abre hoy a las ${hora(hoy.abre)}` };

  for (let salto = 1; salto <= 7; salto++) {
    const siguiente = (dia + salto) % 7;
    const tramo = tramos.find((t) => t.dias.includes(siguiente));
    if (tramo) {
      const cuando = salto === 1 ? "mañana" : `el ${DIAS[siguiente]}`;
      return { abierto: false, texto: `Cerrado, abre ${cuando} a las ${hora(tramo.abre)}` };
    }
  }
  return null;
}
