"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUp, Paperclip, RotateCcw, Volume2 } from "lucide-react";
import { Sagui } from "./sagui";
import { Bloques, FuentesCitadas } from "./bloques";
import { TarjetaDocumentos } from "./documentos";
import { diasRestantes, leerCaso, mensajePlan, TarjetaPlan } from "./plan";
import { Ficha, FichaPlegada, leerMarcados, mensajeProgreso } from "./ficha";
import { leerPreferencias } from "@/lib/preferencias";
import type { Adjunto, Bloque, Documento, EventoChat, FuenteCitada, Plan, Tramite } from "@/lib/tipos";

export type Mensaje = {
  id: string;
  rol: "usuario" | "tramita";
  texto: string;
  bloques?: Bloque[];
  documentos?: Documento[];
  fuentes?: FuenteCitada[];
  plan?: Plan;
  archivos?: string[];
  fichas?: Tramite[];
  sugerencias?: string[];
  aviso?: string;
  error?: boolean;
};

const nuevoId = () => Math.random().toString(36).slice(2);

// Lo que la persona ya marcó en su ruta, con la vigencia que le queda.
function resumenCaso(mensajes: Mensaje[]) {
  const pasos = new Map(mensajes.flatMap((m) => m.plan?.pasos ?? []).map((p) => [p.clave, p]));
  return Object.entries(leerCaso()).map(([clave, fecha]) => {
    const paso = pasos.get(clave);
    return {
      clave,
      dias: Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000),
      restan: paso ? diasRestantes(paso, fecha) : null,
    };
  });
}

function escuchar(texto: string) {
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "es-MX";
  speechSynthesis.cancel();
  speechSynthesis.speak(voz);
}

/**
 * Estado y envío de una conversación.
 * `almacen` la guarda en el dispositivo; `claveFija` amarra las preguntas a un trámite abierto.
 */
export function useConversacion({ almacen, claveFija, alSenal }: { almacen?: string; claveFija?: string; alSenal?: (senal: string) => void }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!almacen) return;
    try {
      const guardado = JSON.parse(localStorage.getItem(almacen) ?? "[]") as Mensaje[];
      if (guardado.length) {
        setMensajes(guardado);
        alSenal?.("Sigue donde te quedaste");
      }
    } catch {}
  }, [almacen, alSenal]);

  useEffect(() => {
    if (ocupado || !almacen) return;
    try {
      localStorage.setItem(almacen, JSON.stringify(mensajes.slice(-20)));
    } catch {}
  }, [mensajes, ocupado, almacen]);

  // Al preguntar, la pregunta sube bajo la banda y la pantalla ya no se mueve: la respuesta se lee de arriba abajo.
  const preguntas = mensajes.filter((m) => m.rol === "usuario");
  const idUltimaPregunta = preguntas.at(-1)?.id;
  const esPrimera = preguntas.length === 1;
  useEffect(() => {
    if (!idUltimaPregunta) return;
    const espera = setTimeout(
      () => document.getElementById(`m-${idUltimaPregunta}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      esPrimera ? 360 : 60, // la primera vez la banda grande termina de encogerse
    );
    return () => clearTimeout(espera);
  }, [idUltimaPregunta, esPrimera]);

  const actualizar = useCallback((id: string, cambio: (m: Mensaje) => Mensaje) => {
    setMensajes((lista) => lista.map((m) => (m.id === id ? cambio(m) : m)));
  }, []);

  const preguntar = useCallback(
    async (texto: string, adjuntos: Adjunto[]) => {
      const idRespuesta = nuevoId();
      const historial = mensajes.filter((m) => !m.error && m.texto).slice(-6).map((m) => ({ rol: m.rol, texto: m.texto }));
      const claves = claveFija ? [claveFija] : (mensajes.findLast((m) => m.fichas?.length)?.fichas ?? []).map((t) => t.clave);
      const contexto = claves.map((clave) => ({ clave, marcados: leerMarcados(clave) }));

      setMensajes((l) => [
        ...l,
        { id: nuevoId(), rol: "usuario", texto: texto || "Revisa mi archivo", archivos: adjuntos.map((a) => a.nombre) },
        { id: idRespuesta, rol: "tramita", texto: "" },
      ]);
      setOcupado(true);
      alSenal?.("Buscando en el catálogo");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto, adjuntos, historial, contexto, caso: resumenCaso(mensajes), preferencias: leerPreferencias() }),
        });
        if (!res.ok || !res.body) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error);
        }

        const lector = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let resto = "";
        let conFicha = false;
        for (;;) {
          const { value, done } = await lector.read();
          if (done) break;
          resto += value;
          const lineas = resto.split("\n");
          resto = lineas.pop() ?? "";
          for (const linea of lineas.filter(Boolean)) {
            const e = JSON.parse(linea) as EventoChat;
            if (e.t === "fichas") {
              conFicha = e.items.length > 0;
              actualizar(idRespuesta, (m) => ({ ...m, fichas: e.items }));
              if (conFicha) alSenal?.(mensajeProgreso(e.items[0], e.items[0].requisitos.length - leerMarcados(e.items[0].clave).length));
            } else if (e.t === "texto") {
              actualizar(idRespuesta, (m) => ({ ...m, texto: m.texto + e.d }));
            } else if (e.t === "plan") {
              actualizar(idRespuesta, (m) => ({ ...m, plan: e.plan }));
              alSenal?.(mensajePlan(e.plan, leerCaso()));
            } else if (e.t === "fuentes") {
              actualizar(idRespuesta, (m) => ({ ...m, fuentes: e.items }));
            } else if (e.t === "documentos") {
              actualizar(idRespuesta, (m) => ({ ...m, documentos: e.items }));
            } else if (e.t === "bloque") {
              actualizar(idRespuesta, (m) => ({ ...m, bloques: [...(m.bloques ?? []), e.bloque], texto: `${m.texto}${e.bloque.d} ` }));
            } else if (e.t === "sugerencias") {
              actualizar(idRespuesta, (m) => ({ ...m, sugerencias: e.items }));
            } else if (e.t === "aviso") {
              actualizar(idRespuesta, (m) => ({ ...m, aviso: e.d }));
            }
          }
        }
        if (!conFicha) alSenal?.("¿Te ayudo con algo más?");
      } catch (e) {
        actualizar(idRespuesta, (m) => ({
          ...m,
          error: true,
          texto: e instanceof Error && e.message ? e.message : "No pude conectarme. Revisa tu internet e inténtalo de nuevo.",
        }));
        alSenal?.("Algo falló. Intenta de nuevo");
      }
      setOcupado(false);
    },
    [mensajes, actualizar, alSenal, claveFija],
  );

  function reintentar() {
    const pregunta = mensajes.findLast((m) => m.rol === "usuario");
    if (!pregunta) return;
    setMensajes((l) => l.slice(0, -2));
    void preguntar(pregunta.texto, []);
  }

  function reiniciar() {
    setMensajes([]);
    speechSynthesis.cancel();
    if (!almacen) return;
    try {
      localStorage.removeItem(almacen);
    } catch {}
  }

  return { mensajes, ocupado, preguntar, reintentar, reiniciar };
}

export function Mensajes({
  mensajes,
  ocupado,
  alPreguntar,
  alReintentar,
  alSenal,
  ocultarFicha,
}: {
  mensajes: Mensaje[];
  ocupado: boolean;
  alPreguntar: (texto: string, adjuntos: Adjunto[]) => void;
  alReintentar: () => void;
  alSenal?: (senal: string) => void;
  /** Trámite que ya está a la vista detrás del panel: su ficha no se repite. */
  ocultarFicha?: string;
}) {
  const ultima = mensajes.at(-1);
  const claveVigente = ultima?.fichas?.[0]?.clave;
  const primeraVista = new Map<string, string>();
  const primeraCompleta = new Map<string, string>();
  const primerPlan = new Map<string, string>();
  for (const m of mensajes) {
    if (m.plan && !primerPlan.has(m.plan.clave)) primerPlan.set(m.plan.clave, m.id);
    m.fichas?.forEach((t, i) => {
      if (!primeraVista.has(t.clave)) primeraVista.set(t.clave, m.id);
      if (i === 0 && !primeraCompleta.has(t.clave)) primeraCompleta.set(t.clave, m.id);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-3 py-5" role="log" aria-label="Conversación">
      {mensajes.map((m) =>
        m.rol === "usuario" ? (
          <motion.div
            key={m.id}
            id={`m-${m.id}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="ml-auto w-fit max-w-[85%] scroll-mt-36 rounded-[12px] bg-tinta px-4 py-2.5 text-panel"
          >
            {m.texto}
            {m.archivos?.map((a) => (
              <span key={a} className="mt-1 flex items-center gap-1.5 text-sm opacity-85">
                <Paperclip className="size-3.5" aria-hidden />
                {a}
              </span>
            ))}
          </motion.div>
        ) : (
          <div key={m.id} className={`space-y-3 ${m.id === ultima?.id ? "min-h-[62dvh]" : ""}`}>
            {m.aviso ? <p className="rounded-[10px] bg-panel px-3.5 py-2.5 text-[0.9375rem]">{m.aviso}</p> : null}

            {!m.texto && !m.fichas && ocupado && m.id === ultima?.id ? (
              <p className="flex items-center gap-2 font-medium" role="status">
                <Sagui estado="piensa" className="size-12 shrink-0" />
                Revisando las fichas oficiales
              </p>
            ) : null}

            {m.documentos?.length ? <TarjetaDocumentos documentos={m.documentos} /> : null}

            {m.plan && primerPlan.get(m.plan.clave) === m.id ? <TarjetaPlan plan={m.plan} alCambiar={m.id === ultima?.id ? alSenal : undefined} /> : null}

            {m.texto ? (
              <div className={`px-1 text-[1.0625rem] leading-relaxed ${m.error ? "text-error" : ""}`}>
                {m.bloques?.length ? <Bloques bloques={m.bloques} /> : m.texto}
                {!m.error && !(ocupado && m.id === ultima?.id) ? (
                  <button type="button" aria-label="Escuchar respuesta" onClick={() => escuchar(m.texto)} className="ml-1 inline-grid size-9 place-items-center align-middle">
                    <Volume2 className="size-5" aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}

            {m.fuentes?.length ? <FuentesCitadas fuentes={m.fuentes} /> : null}

            {m.error && m.id === ultima?.id ? (
              <button type="button" onClick={alReintentar} className="flex min-h-11 items-center gap-2 rounded-[10px] border border-tinta bg-panel px-3.5 font-bold">
                <RotateCcw className="size-4" aria-hidden />
                Reintentar
              </button>
            ) : null}

            {m.fichas?.map((t, i) => {
              if (t.clave === ocultarFicha) return null;
              // Cada trámite se muestra completo una sola vez por conversación.
              if (i > 0 && primeraVista.get(t.clave) !== m.id) return null;
              const repetida = i === 0 && primeraCompleta.get(t.clave) !== m.id;
              return (
                <motion.div
                  key={t.clave}
                  id={i === 0 && !repetida ? `ficha-${t.clave}` : undefined}
                  className="scroll-mt-36"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  {repetida ? (
                    <button
                      type="button"
                      onClick={() => document.getElementById(`ficha-${t.clave}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="flex min-h-11 items-center gap-2 px-1 text-[0.9375rem] underline"
                    >
                      <ArrowUp className="size-4 shrink-0" aria-hidden />
                      Ver la ficha y tu checklist de este trámite
                    </button>
                  ) : i === 0 ? (
                    <Ficha tramite={t} compacta alProgreso={t.clave === claveVigente && alSenal ? (faltan) => alSenal(mensajeProgreso(t, faltan)) : undefined} />
                  ) : (
                    <FichaPlegada tramite={t} />
                  )}
                </motion.div>
              );
            })}

            {m.sugerencias?.length && m.id === ultima?.id && !ocupado ? (
              <ul className="border-t border-linea">
                {m.sugerencias.map((s, i) => (
                  <motion.li
                    key={s}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.24, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-linea"
                  >
                    <button type="button" onClick={() => alPreguntar(s, [])} className="fila-senal flex min-h-12 w-full items-center gap-3 px-1 py-2 text-left font-medium">
                      <span className="flex-1">{s}</span>
                      <ArrowRight className="flecha size-5 shrink-0" aria-hidden />
                    </button>
                  </motion.li>
                ))}
              </ul>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}
