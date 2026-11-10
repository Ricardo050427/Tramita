import { buscar, normalizar, palabrasClave } from "./buscar";
import { indice, tramitePorClave } from "./datos";
import { estadoHorario } from "./horario";
import { esLlenable } from "./llenado";
import { estimarCosto } from "./plan";
import type { Bloque, Documento, Tramite } from "./tipos";

type Intencion = "costo" | "lugar" | "horario" | "telefono" | "requisitos" | "plazo" | "vigencia" | "enLinea" | "obtienes" | "formato";

// Preguntas que piden razonar: esas siempre van a la IA.
const REQUIERE_RAZONAR = /por ?qu[eé]|qu[eé] pasa|\bpuedo\b|\bdebo\b|me (pueden|conviene)|\bsi (no|ya|soy|tengo)\b|diferencia|c[oó]mo (lo |se )?(hago|lleno|inicio)/i;

const INTENCIONES: [Intencion, RegExp][] = [
  ["formato", /\b(formato|formulario|machote|solicitud|pdf)\b/i],
  ["plazo", /cu[aá]nto (tiempo )?(tarda|tardan|demora)|\bplazo\b|en cu[aá]nto tiempo|cu[aá]ndo (me )?(responden|contestan|entregan)/i],
  ["vigencia", /\bvigencia\b|cu[aá]nto (tiempo )?(dura|vale|sirve)|cu[aá]ndo (vence|caduca)/i],
  ["costo", /cu[aá]nto (me )?(cuesta|cobran|sale|va a costar|hay que pagar)|\bprecio\b|\bcosto\b|\btarifa\b|tiene costo|es gratis/i],
  ["horario", /\bhorarios?\b|a qu[eé] hora|cu[aá]ndo (abren|cierran)|est[aá] abierto|\babren\b|\bcierran\b/i],
  ["telefono", /tel[eé]fono|\bcelular\b|a qu[eé] n[uú]mero|d[oó]nde (llamo|marco)/i],
  ["lugar", /d[oó]nde (queda|est[aá]|es|se (hace|tramita|saca)|voy|lo hago)|a d[oó]nde voy|\bdirecci[oó]n\b|\bubicaci[oó]n\b|\bdomicilio\b|\boficinas?\b/i],
  ["enLinea", /en l[ií]nea|por internet|desde (mi )?(casa|celular)|\bpor la web\b/i],
  ["obtienes", /qu[eé] (me dan|obtengo|recibo)|al terminar/i],
  ["requisitos", /\brequisitos?\b|qu[eé] (necesito|piden|documentos|papeles|llevo|debo llevar)|qu[eé] tengo que llevar/i],
];

// Palabras de la pregunta que no aportan tema propio.
const GENERICAS = new Set(
  "cuesta costo cobran sale costar precio tarifa pagar gratis cuanto cuanta tiempo tarda tardan demora plazo responden contestan entregan vigencia dura vale sirve vence caduca horario horarios hora abren cierran abierto telefono celular numero llamo marco donde queda oficina oficinas direccion ubicacion domicilio voy linea internet casa web obtengo recibo dan terminar requisitos requisito piden documentos papeles llevo llevar debo formato formulario machote solicitud pdf eso esto esa ese ahi alla va tramite tiene hay que ya entonces bueno oye dame dime pasame ocupo sacar metros m2 das da puede pueden hacer hace tramitar cual cuales es son".split(" "),
);

const SUGERENCIAS: Record<Intencion, string> = {
  costo: "¿Cuánto cuesta?",
  requisitos: "¿Qué requisitos piden?",
  lugar: "¿Dónde se hace?",
  horario: "¿Cuál es el horario?",
  plazo: "¿Cuánto tarda?",
  vigencia: "¿Cuánto dura?",
  telefono: "¿A qué teléfono llamo?",
  enLinea: "¿Se puede hacer en línea?",
  obtienes: "¿Qué me dan al terminar?",
  formato: "¿Me das el formato?",
};

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: n % 1 ? 2 : 0 });
const primeraFrase = (t: string, tope = 170) => (t.length <= tope ? t : `${t.slice(0, tope).replace(/\s+\S*$/, "")}…`);
const resumen = (d: string): Bloque => ({ tipo: "resumen", d });

function detectar(pregunta: string): Intencion | null {
  if (REQUIERE_RAZONAR.test(pregunta)) return null;
  return INTENCIONES.find(([, re]) => re.test(pregunta))?.[0] ?? null;
}

function bloquesDe(intencion: Intencion, t: Tramite, metros?: number): Bloque[] {
  switch (intencion) {
    case "costo": {
      const est = estimarCosto(t, metros);
      if (est?.max === 0) return [resumen("Este trámite no tiene costo.")];
      if (est) {
        const monto = est.min === est.max ? pesos(est.min) : `de ${pesos(est.min)} a ${pesos(est.max)}`;
        return [resumen(`Cuesta aproximadamente ${monto}${metros ? ` para ${metros} m²` : ""}.`), { tipo: "alerta", d: `Tarifa publicada: ${primeraFrase(t.costo)}` }];
      }
      if (/m2|metros/i.test(t.costo) && !metros) return [resumen("El costo depende de los metros cuadrados. Dime cuántos son y lo calculo."), { tipo: "alerta", d: `Tarifa publicada: ${primeraFrase(t.costo)}` }];
      return [resumen(`El costo publicado es: ${primeraFrase(t.costo, 260)}`)];
    }
    case "lugar":
      if (t.oficinas) return [resumen(`Se atiende en los centros de atención de Tesorería, como ${t.oficinas.slice(0, 3).map((o) => o.nombre).join(", ")}. En la ficha los ves con mapa y puedes buscar el más cercano.`)];
      return [resumen(t.domicilio ? `Se atiende en ${t.dependencia}: ${t.domicilio}.` : `La ficha no publica una dirección. Pregunta en ${t.dependencia}.`)];
    case "horario": {
      if (t.oficinas) {
        const lista = t.oficinas.slice(0, 3).map((o) => `${o.nombre}: ${estadoHorario(o.horario)?.texto ?? o.horario}`);
        return [resumen("Depende del centro de atención."), ...lista.map((d): Bloque => ({ tipo: "paso", d }))];
      }
      if (!t.horario) return [resumen(`La ficha no publica el horario. Pregunta en ${t.dependencia}.`)];
      const estado = estadoHorario(t.horario);
      return [resumen(`${t.horario}.${estado ? ` ${estado.texto}.` : ""}`)];
    }
    case "telefono": {
      const tel = t.telefono || t.oficinas?.find((o) => o.telefono)?.telefono;
      return [resumen(tel ? `Llama al ${tel}.` : `La ficha no publica un teléfono. Puedes llamar a Atención Ciudadana al 662 289 3000.`)];
    }
    case "requisitos": {
      if (!t.requisitos.length) return [resumen(`La ficha no publica requisitos para este trámite. Confírmalos en ${t.dependencia}.`)];
      const n = t.requisitos.length;
      return [
        resumen(`Son ${n} ${n === 1 ? "requisito" : "requisitos"}${n > 6 ? "; estos son los primeros" : ""}. La lista completa está en la ficha.`),
        ...t.requisitos.slice(0, 6).map((r): Bloque => ({ tipo: "paso", d: r.titulo })),
      ];
    }
    case "plazo":
      return [resumen(t.plazo && !/^indefinido/i.test(t.plazo) ? `Plazo de respuesta: ${primeraFrase(t.plazo, 200)}` : `La ficha no indica un plazo de respuesta. Pregunta en ${t.dependencia}.`)];
    case "vigencia":
      return [resumen(t.vigencia && !/^indefinido/i.test(t.vigencia) ? `Vigencia: ${primeraFrase(t.vigencia, 200)}` : "La ficha no indica que venza: su vigencia es indefinida.")];
    case "enLinea":
      return [resumen(t.enLinea ? "Sí. En la ficha está el botón para hacerlo en línea." : `No aparece disponible en línea. Se hace en ${t.dependencia}.`)];
    case "obtienes":
      return [resumen(t.obtienes && !/^ninguno/i.test(t.obtienes) ? `Al terminar obtienes: ${primeraFrase(t.obtienes, 200)}` : "La ficha no indica un documento final.")];
    case "formato": {
      const formatos = t.documentos?.filter((d) => d.tipo !== "guia") ?? [];
      if (formatos.some((d) => esLlenable(d.id))) return [resumen("Aquí está el formato oficial. Puedes descargarlo o llenarlo aquí mismo contestando unas preguntas; tus datos no pasan por la IA.")];
      if (formatos.length) return [resumen(`Aquí tienes ${formatos.length === 1 ? "el formato oficial" : "los formatos oficiales"}, listo para descargar.`)];
      return [resumen(`No encontré un formato público para este trámite. Pídelo en ${t.dependencia}.`)];
    }
  }
}

export type RespuestaDirecta = { tramite: Tramite; bloques: Bloque[]; documentos: Documento[]; sugerencias: string[] };

/** Contesta sin IA lo que ya está en la ficha. Devuelve null si la pregunta necesita razonamiento. */
export function responderDirecto(pregunta: string, enPantalla: Tramite[], metros?: number): RespuestaDirecta | null {
  const intencion = detectar(pregunta);
  if (!intencion) return null;

  const tema = palabrasClave(pregunta).filter((p) => !GENERICAS.has(p) && !/^\d+$/.test(p));
  let tramite: Tramite | undefined;

  const actual = enPantalla[0];
  if (actual) {
    const nombre = normalizar(`${actual.nombre} ${actual.dependencia}`);
    if (tema.every((p) => nombre.includes(p))) tramite = actual;
  }
  if (!tramite) {
    // Sin trámite en pantalla: solo si la pregunta lo nombra sin ambigüedad.
    if (tema.length < 2) return null;
    const [uno, dos] = buscar(tema.join(" "), indice, 2);
    const nombre = uno ? normalizar(uno.item.n) : "";
    if (!uno || !tema.every((p) => nombre.includes(p)) || (dos && uno.puntos - dos.puntos < 3)) return null;
    tramite = tramitePorClave(uno.item.c);
  }
  if (!tramite) return null;

  const documentos = intencion === "formato" ? (tramite.documentos ?? []).filter((d) => d.tipo !== "guia").slice(0, 3) : [];
  const sugerencias = (["costo", "requisitos", "lugar", "horario", "plazo", "enLinea"] as Intencion[])
    .filter((i) => i !== intencion && (i !== "enLinea" || tramite.enLinea))
    .slice(0, 3)
    .map((i) => SUGERENCIAS[i]);

  return { tramite, bloques: bloquesDe(intencion, tramite, metros), documentos, sugerencias };
}
