import { getCache, waitUntil } from "@vercel/functions";
import { enviarTexto, eventosATexto, firmaValida, huella, marcarLeido } from "@/lib/whatsapp";
import type { EventoChat } from "@/lib/tipos";

// Webhook de WhatsApp. Meta lo llama al verificar la dirección (GET) y con cada mensaje (POST).
export const maxDuration = 45;

const HORAS_CONVERSACION = 24;
const SALUDO = /^(hola|buen[oa]s?( d[ií]as| tardes| noches)?|qu[eé] tal|hey|ola|holi|inicio|men[uú]|empezar)[\s!.¡?¿]*$/i;
const REINICIAR = /^(reiniciar|reinicia|nuevo|nueva pregunta|borrar|olvida)[\s!.]*$/i;
const BIENVENIDA = `Hola, soy *Sagui* de Tramita 👋
Te ayudo con los trámites del Ayuntamiento de Hermosillo: qué llevar, cuánto cuesta y a dónde ir, con la información oficial.

Escríbeme tu duda como se la dirías a alguien. Por ejemplo:
1. ¿Cómo pago el predial?
2. ¿Qué necesito para abrir un negocio de comida?
3. En ventanilla me pidieron acta de nacimiento para la licencia de funcionamiento

Responde con un número o escribe tu pregunta. Para empezar de nuevo escribe *reiniciar*.
_No es un sitio oficial del Ayuntamiento. No compartas datos personales._`;
const EJEMPLOS = ["¿Cómo pago el predial?", "¿Qué necesito para abrir un negocio de comida?", "En ventanilla me pidieron acta de nacimiento para la licencia de funcionamiento"];

type Turno = { rol: "usuario" | "tramita"; texto: string };
type Estado = { historial: Turno[]; clave?: string; sugerencias: string[] };

type MensajeMeta = { id: string; from: string; type: string; text?: { body?: string } };
type EstadoMeta = { status?: string; errors?: { code?: number; title?: string; message?: string }[] };
type AvisoMeta = { object?: string; entry?: { changes?: { field?: string; value?: { messages?: MensajeMeta[]; statuses?: EstadoMeta[] } }[] }[] };

const cache = () => getCache({ namespace: "tramita-whatsapp" });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (url.searchParams.get("hub.mode") === "subscribe" && token && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get("x-hub-signature-256"))) {
    return new Response("Firma inválida", { status: 401 });
  }

  let aviso: AvisoMeta;
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return new Response("OK", { status: 200 });
  }

  // Solo interesan los mensajes; los avisos de entregado y leído se ignoran.
  const mensajes = (aviso.entry ?? []).flatMap((e) => e.changes ?? []).filter((c) => c.field === "messages").flatMap((c) => c.value?.messages ?? []);
  const origen = new URL(req.url).origin;

  // Los avisos de entrega no se contestan, pero si Meta no pudo entregar una respuesta, queda en el log.
  for (const estado of (aviso.entry ?? []).flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.statuses ?? [])) {
    if (estado.status === "failed") console.error("[whatsapp] Meta no entregó un mensaje", JSON.stringify(estado.errors ?? []));
  }

  // Meta espera un 200 rápido; si tarda, reintenta. La respuesta se arma después.
  waitUntil(Promise.all(mensajes.map((m) => atender(m, origen).catch((e) => console.error("[whatsapp] error al atender", e)))));
  return new Response("OK", { status: 200 });
}

async function atender(mensaje: MensajeMeta, origen: string) {
  // Meta puede entregar el mismo mensaje más de una vez.
  const llaveVisto = `visto:${mensaje.id}`;
  if (await cache().get(llaveVisto).catch(() => null)) return;
  await cache().set(llaveVisto, 1, { ttl: 3600 }).catch(() => undefined);

  const para = mensaje.from;
  void marcarLeido(mensaje.id);

  if (mensaje.type !== "text" || !mensaje.text?.body?.trim()) {
    await enviarTexto(para, "Por ahora solo entiendo mensajes de texto. Escríbeme tu duda sobre un trámite de Hermosillo y te ayudo.");
    return;
  }

  const llaveEstado = `conversacion:${huella(para)}`;
  const estado: Estado = ((await cache().get(llaveEstado).catch(() => null)) as Estado | null) ?? { historial: [], sugerencias: [] };
  let texto = mensaje.text.body.trim().slice(0, 1500);

  if (REINICIAR.test(texto)) {
    await cache().delete(llaveEstado).catch(() => undefined);
    await enviarTexto(para, "Listo, empezamos de nuevo. ¿En qué trámite te ayudo?");
    return;
  }
  if (SALUDO.test(texto) && !estado.historial.length) {
    await cache().set(llaveEstado, { ...estado, sugerencias: EJEMPLOS }, { ttl: HORAS_CONVERSACION * 3600 }).catch(() => undefined);
    await enviarTexto(para, BIENVENIDA);
    return;
  }

  // "1", "2" o "3" eligen una de las preguntas sugeridas en el mensaje anterior.
  const numero = /^\s*([1-3])\s*[.)]?\s*$/.exec(texto);
  if (numero && estado.sugerencias[Number(numero[1]) - 1]) texto = estado.sugerencias[Number(numero[1]) - 1];

  const eventos = await preguntarASagui(origen, para, texto, estado);
  const respuesta = eventosATexto(eventos);
  await enviarTexto(para, respuesta.texto);

  const historial: Turno[] = [...estado.historial, { rol: "usuario" as const, texto }, ...(respuesta.resumen ? [{ rol: "tramita" as const, texto: respuesta.resumen }] : [])].slice(-6);
  await cache()
    // Tras una ruta completa la plática es sobre toda la ruta, no sobre su último trámite.
    .set(llaveEstado, { historial, clave: respuesta.plan ? undefined : (respuesta.claves[0] ?? estado.clave), sugerencias: respuesta.sugerencias }, { ttl: HORAS_CONVERSACION * 3600 })
    .catch(() => undefined);
}

// Le hace a /api/chat la misma pregunta que haría la página web y junta los eventos de la respuesta.
async function preguntarASagui(origen: string, para: string, pregunta: string, estado: Estado): Promise<EventoChat[]> {
  const res = await fetch(`${origen}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Cada número tiene su propio límite de preguntas por minuto, en lugar de compartir la IP del servidor.
      "x-tramita-interno": process.env.WHATSAPP_APP_SECRET ?? "",
      "x-tramita-usuario": `wa:${huella(para)}`,
    },
    body: JSON.stringify({
      pregunta,
      historial: estado.historial,
      contexto: estado.clave ? [{ clave: estado.clave, marcados: [] }] : [],
      preferencias: {},
    }),
    signal: AbortSignal.timeout(25_000),
  }).catch((e: unknown) => {
    console.error("[whatsapp] /api/chat no respondió", e);
    return null;
  });

  if (!res) return [];
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    return [{ t: "texto", d: json?.error ?? "No pude responder ahorita. Intenta de nuevo en un momento." }];
  }

  const eventos: EventoChat[] = [];
  for (const linea of (await res.text()).split("\n")) {
    if (!linea.trim()) continue;
    try {
      eventos.push(JSON.parse(linea) as EventoChat);
    } catch {
      // línea incompleta: se ignora
    }
  }
  return eventos;
}
