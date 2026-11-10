"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUp, Paperclip, RotateCcw, Volume2 } from "lucide-react";
import { BarraPregunta } from "./barra-pregunta";
import { Directorio } from "./directorio";
import { Bloques } from "./bloques";
import { TarjetaDocumentos } from "./documentos";
import { Ficha, FichaPlegada, leerMarcados, mensajeProgreso } from "./ficha";
import { Encabezado } from "./senal";
import type { Adjunto, Bloque, Categoria, Documento, EntradaIndice, EventoChat, Tramite } from "@/lib/tipos";

type Mensaje = {
  id: string;
  rol: "usuario" | "tramita";
  texto: string;
  bloques?: Bloque[];
  documentos?: Documento[];
  archivos?: string[];
  fichas?: Tramite[];
  sugerencias?: string[];
  aviso?: string;
  error?: boolean;
};

const HISTORIAL = "tramita:historial";
const POPULARES = [
  "¿Cómo pido la tarifa social del agua?",
  "Se fundió una lámpara de mi calle",
  "Necesito mi constancia de no adeudo",
  "Quiero cambiar de nombre mi recibo de agua",
];
const nuevoId = () => Math.random().toString(36).slice(2);

function escuchar(texto: string) {
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "es-MX";
  speechSynthesis.cancel();
  speechSynthesis.speak(voz);
}

export function Aplicacion({ categorias, indice }: { categorias: Categoria[]; indice: EntradaIndice[] }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [senal, setSenal] = useState("¿Qué necesitas resolver?");
  const ultimaPregunta = useRef<{ texto: string; adjuntos: Adjunto[] } | null>(null);

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(HISTORIAL) ?? "[]") as Mensaje[];
      if (guardado.length) {
        setMensajes(guardado);
        setSenal("Sigue donde te quedaste");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (ocupado) return;
    try {
      localStorage.setItem(HISTORIAL, JSON.stringify(mensajes.slice(-20)));
    } catch {}
  }, [mensajes, ocupado]);

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
      ultimaPregunta.current = { texto, adjuntos };
      const idRespuesta = nuevoId();
      const historial = mensajes.filter((m) => !m.error && m.texto).slice(-6).map((m) => ({ rol: m.rol, texto: m.texto }));
      const contexto = (mensajes.findLast((m) => m.fichas?.length)?.fichas ?? []).map((t) => ({ clave: t.clave, marcados: leerMarcados(t.clave) }));

      setMensajes((l) => [
        ...l,
        { id: nuevoId(), rol: "usuario", texto: texto || "Revisa mi archivo", archivos: adjuntos.map((a) => a.nombre) },
        { id: idRespuesta, rol: "tramita", texto: "" },
      ]);
      setOcupado(true);
      setSenal("Buscando en el catálogo");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto, adjuntos, historial, contexto }),
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
              conFicha = true;
              actualizar(idRespuesta, (m) => ({ ...m, fichas: e.items }));
              setSenal(mensajeProgreso(e.items[0], e.items[0].requisitos.length - leerMarcados(e.items[0].clave).length));
            } else if (e.t === "texto") {
              actualizar(idRespuesta, (m) => ({ ...m, texto: m.texto + e.d }));
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
        if (!conFicha) setSenal("¿Te ayudo con algo más?");
      } catch (e) {
        actualizar(idRespuesta, (m) => ({
          ...m,
          error: true,
          texto: e instanceof Error && e.message ? e.message : "No pude conectarme. Revisa tu internet e inténtalo de nuevo.",
        }));
        setSenal("Algo falló. Intenta de nuevo");
      }
      setOcupado(false);
    },
    [mensajes, actualizar],
  );

  function reiniciar() {
    setMensajes([]);
    setSenal("¿Qué necesitas resolver?");
    speechSynthesis.cancel();
    try {
      localStorage.removeItem(HISTORIAL);
    } catch {}
  }

  const enCharla = mensajes.length > 0;
  const ultima = mensajes.at(-1);
  const claveVigente = ultima?.fichas?.[0]?.clave;
  const primeraVista = new Map<string, string>();
  const primeraCompleta = new Map<string, string>();
  for (const m of mensajes) {
    m.fichas?.forEach((t, i) => {
      if (!primeraVista.has(t.clave)) primeraVista.set(t.clave, m.id);
      if (i === 0 && !primeraCompleta.has(t.clave)) primeraCompleta.set(t.clave, m.id);
    });
  }
  const accion = enCharla ? (
    <button type="button" onClick={reiniciar} className="min-h-11 rounded-[8px] px-2 font-bold underline">
      Nueva pregunta
    </button>
  ) : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado mensaje={senal} grande={!enCharla} accion={accion} />

      <div className="mx-auto flex w-full max-w-6xl flex-1 lg:grid lg:grid-cols-[23rem_minmax(0,1fr)] lg:gap-8 lg:px-4">
        <aside className="hidden self-start py-6 lg:sticky lg:top-32 lg:block">
          <Directorio categorias={categorias} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">
            {enCharla ? (
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
                        <p className="flex items-center gap-2 px-1 font-medium">
                          <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}>
                            <ArrowRight className="size-5" aria-hidden />
                          </motion.span>
                          Revisando las fichas oficiales
                        </p>
                      ) : null}

                      {m.documentos?.length ? <TarjetaDocumentos documentos={m.documentos} /> : null}

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

                      {m.error && ultimaPregunta.current && m.id === ultima?.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            const p = ultimaPregunta.current!;
                            setMensajes((l) => l.slice(0, -2));
                            void preguntar(p.texto, p.adjuntos);
                          }}
                          className="flex min-h-11 items-center gap-2 rounded-[10px] border border-tinta bg-panel px-3.5 font-bold"
                        >
                          <RotateCcw className="size-4" aria-hidden />
                          Reintentar
                        </button>
                      ) : null}

                      {m.fichas?.map((t, i) => {
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
                              <Ficha
                                tramite={t}
                                compacta
                                alProgreso={t.clave === claveVigente ? (faltan) => setSenal(mensajeProgreso(t, faltan)) : undefined}
                              />
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
                              <button type="button" onClick={() => void preguntar(s, [])} className="fila-senal flex min-h-12 w-full items-center gap-3 px-1 py-2 text-left font-medium">
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
            ) : (
              <div className="lg:hidden">
                <Directorio categorias={categorias} />
              </div>
            )}
            {!enCharla ? (
              <div className="hidden px-3 py-10 lg:block">
                <p className="mx-auto max-w-2xl text-xl leading-relaxed">
                  Pregunta como le preguntarías a alguien en la ventanilla. Te digo qué llevar, cuánto cuesta y a dónde ir, con la ficha oficial del Ayuntamiento a la vista.
                </p>
              </div>
            ) : null}
          </main>

          <BarraPregunta indice={indice} ocupado={ocupado} alEnviar={(t, a) => void preguntar(t, a)} sugerenciasIniciales={enCharla ? undefined : POPULARES} />
          <p className="px-4 pb-3 text-center text-[0.8125rem] text-tinta-suave">
            Proyecto independiente de hackathon. No es un sitio oficial del Ayuntamiento de Hermosillo.
          </p>
        </div>
      </div>
    </div>
  );
}
