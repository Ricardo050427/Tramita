import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { EventoChat } from "@/lib/tipos";

// Sagui en WhatsApp: la API de WhatsApp Cloud de Meta. La cuenta se prepara con docs/whatsapp-meta.md.
const VERSION_API = process.env.WHATSAPP_API_VERSION ?? "v25.0";
const APP = "https://tramita-blond.vercel.app";
const MAX_MENSAJE = 4000; // WhatsApp acepta hasta 4096 caracteres por mensaje de texto

// Meta firma cada aviso con el App Secret; sin firma válida el aviso se descarta.
export function firmaValida(cuerpo: string, firma: string | null) {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !firma?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", secreto).update(cuerpo).digest("hex"));
  const recibida = Buffer.from(firma.slice(7));
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

// El número nunca se guarda tal cual: solo su huella.
export const huella = (numero: string) => createHash("sha256").update(`tramita:${numero}`).digest("hex").slice(0, 32);

// Los números de México llegan como 521 + 10 dígitos, pero Meta solo acepta responder a 52 + 10 dígitos.
export const destino = (numero: string) => (/^521\d{10}$/.test(numero) ? `52${numero.slice(3)}` : numero);

export async function enviarTexto(para: string, texto: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const numero = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numero) {
    // Sin cuenta de Meta (por ejemplo en local) el mensaje solo se muestra en la consola.
    console.log(`[whatsapp] faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID; mensaje para ${para}:\n${texto}`);
    return;
  }
  for (const parte of partir(texto)) {
    const res = await fetch(`https://graph.facebook.com/${VERSION_API}/${numero}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: destino(para), type: "text", text: { body: parte, preview_url: false } }),
    }).catch((e: unknown) => {
      console.error("[whatsapp] no se pudo enviar", e);
      return null;
    });
    if (res && !res.ok) console.error("[whatsapp] Meta respondió", res.status, await res.text().catch(() => ""));
  }
}

// Marca el mensaje como leído y muestra "escribiendo…" mientras Sagui responde.
export async function marcarLeido(idMensaje: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const numero = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numero) return;
  await fetch(`https://graph.facebook.com/${VERSION_API}/${numero}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: idMensaje, typing_indicator: { type: "text" } }),
  }).catch(() => undefined);
}

function partir(texto: string) {
  const partes: string[] = [];
  let actual = "";
  for (const parrafo of texto.split("\n\n")) {
    if (actual && actual.length + parrafo.length + 2 > MAX_MENSAJE) {
      partes.push(actual);
      actual = "";
    }
    actual = actual ? `${actual}\n\n${parrafo}` : parrafo;
    while (actual.length > MAX_MENSAJE) {
      partes.push(actual.slice(0, MAX_MENSAJE));
      actual = actual.slice(MAX_MENSAJE);
    }
  }
  if (actual) partes.push(actual);
  return partes;
}

const limpiar = (s: string) => s.replace(/\*\*/g, "").trim();
const corto = (s: string, max = 70) => (s.length > max ? `${s.slice(0, max).replace(/[\s.,;:]+\S*$/, "")}…` : s);

export type Respuesta = { texto: string; resumen: string; claves: string[]; sugerencias: string[]; plan: boolean };

// Convierte los eventos de /api/chat en un mensaje de WhatsApp.
export function eventosATexto(eventos: EventoChat[]): Respuesta {
  const principal: string[] = [];
  const caminos: string[] = [];
  const pasos: string[] = [];
  const alertas: string[] = [];
  const extra: string[] = [];
  let aviso = "";
  let claves: string[] = [];
  let sugerencias: string[] = [];
  let ruta = "";

  for (const e of eventos) {
    if (e.t === "texto") principal.push(limpiar(e.d));
    else if (e.t === "aviso") aviso = limpiar(e.d);
    else if (e.t === "bloque") {
      const d = limpiar(e.bloque.d);
      if (e.bloque.tipo === "resumen") principal.push(d);
      else if (e.bloque.tipo === "camino") caminos.push(`• ${d}`);
      else if (e.bloque.tipo === "paso") pasos.push(`${pasos.length + 1}. ${d}`);
      else alertas.push(`⚠️ ${d}`);
    } else if (e.t === "fichas") {
      claves = e.items.map((t) => t.clave);
      const fichas = e.items.slice(0, 2).map((t) => `📄 *${t.nombre}*\n${t.requisitos.length} requisitos · Costo: ${corto(t.costo || "no publicado")}\n${APP}/tramite/${t.clave}`);
      if (fichas.length) extra.push(fichas.join("\n\n"));
    } else if (e.t === "documentos") {
      const docs = e.items.slice(0, 3).map((d) => `📎 ${d.titulo}\n${d.url}`);
      if (docs.length) extra.push(`*Formatos para descargar*\n${docs.join("\n")}`);
    } else if (e.t === "plan") {
      const lineas = e.plan.pasos.map((p, i) => `${i + 1}. ${p.nombre} (${p.dependencia})`);
      const total = e.plan.total.max > 0 ? `\nTotal estimado: ${e.plan.total.min === e.plan.total.max ? e.plan.total.min : `${e.plan.total.min} a ${e.plan.total.max}`} pesos` : "";
      extra.push(`*Ruta completa: ${e.plan.meta}*\n${lineas.join("\n")}${total}`);
      ruta = `Ruta para ${e.plan.meta}: ${e.plan.pasos.map((p) => p.nombre).join(", ")}.${total.replace("\n", " ")}`;
    } else if (e.t === "verificacion") {
      const mal = e.resultado.hallazgos.filter((h) => h.veredicto !== "oficial");
      const lineas = e.resultado.hallazgos.slice(0, 6).map((h) => `${h.veredicto === "oficial" ? "✅" : "❗"} ${h.dicho}: ${h.detalle}`);
      extra.push(
        `*Revisión de lo que te pidieron (${e.nombre})*\n${lineas.join("\n")}\n${mal.length ? `${mal.length} punto(s) no cuadran con la ficha oficial.` : "Todo coincide con la ficha oficial."}\nRevísalo completo: ${APP}/tramite/${e.clave}/verificar`,
      );
    } else if (e.t === "fuentes") {
      const fuentes = e.items.slice(0, 2).map((f) => `🔗 ${f.fuente}${f.url ? `: ${f.url}` : ""}`);
      if (fuentes.length) extra.push(`*Fuentes*\n${fuentes.join("\n")}`);
    } else if (e.t === "sugerencias") sugerencias = e.items.slice(0, 3);
  }

  const resumen = principal.join(" ");
  const secciones = [
    aviso ? `_${aviso}_` : "",
    resumen,
    caminos.join("\n"),
    pasos.join("\n"),
    alertas.join("\n"),
    ...extra,
    sugerencias.length ? `*También puedes preguntarme* (responde con el número):\n${sugerencias.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : "",
  ].filter(Boolean);

  return {
    texto: secciones.join("\n\n") || "No pude responder ahorita. Intenta de nuevo en un momento o llama a Atención Ciudadana al 662 289 3000.",
    resumen: [resumen, ...pasos, ruta].filter(Boolean).join(" ").slice(0, 800),
    claves,
    sugerencias,
    plan: Boolean(ruta),
  };
}
