"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { ChevronRight, MessageCircleQuestionMark, X } from "lucide-react";
import { BarraPregunta } from "./barra-pregunta";
import { Mensajes, useConversacion } from "./conversacion";
import { Sagui } from "./sagui";
import { llaveCharla } from "@/lib/charlas";
import { useMisTramites } from "@/lib/mis-tramites";
import type { EntradaIndice, Tramite } from "@/lib/tipos";

const SIN_INDICE: EntradaIndice[] = [];
const salida = [0.16, 1, 0.3, 1] as const;

function preguntasDe(tramite: Tramite) {
  return [
    "¿Cuánto cuesta?",
    "¿Qué requisitos piden?",
    "¿Dónde se hace?",
    "¿Cuánto tarda?",
    ...(tramite.documentos?.some((d) => d.tipo !== "guia") ? ["¿Me das el formato?"] : []),
  ];
}

export function PreguntarTramite({ tramite }: { tramite: Tramite }) {
  const [abierto, setAbierto] = useState(false);
  // Con el trámite en Mis trámites, la conversación se guarda en el dispositivo y se retoma desde ahí.
  const guardado = Boolean(useMisTramites()[tramite.clave]);
  const { mensajes, ocupado, preguntar, reintentar } = useConversacion({ claveFija: tramite.clave, almacen: guardado ? llaveCharla(tramite.clave) : undefined });
  const idUltima = mensajes.findLast((m) => m.rol === "usuario")?.id;
  const controles = useDragControls();
  const reducir = useReducedMotion();
  const disparador = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLElement>(null);

  // Desde Mis trámites («Seguir la conversación») el panel llega abierto.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("charla")) return;
    const espera = setTimeout(() => {
      window.history.replaceState(null, "", window.location.pathname);
      setAbierto(true);
    }, 250);
    return () => clearTimeout(espera);
  }, []);

  // Al abrir con una conversación guardada se muestra la última pregunta, no el principio.
  useEffect(() => {
    if (!abierto || !idUltima) return;
    const espera = setTimeout(() => hoja.current?.querySelector(`[id="m-${idUltima}"]`)?.scrollIntoView({ block: "start" }), 380);
    return () => clearTimeout(espera);
  }, [abierto, idUltima]);

  useEffect(() => {
    if (!abierto) return;
    const raiz = document.documentElement;
    const boton = disparador.current;
    const fondo = [...document.querySelectorAll("header, main, .nav-flotante")].filter((n) => !n.closest(".hoja-chat"));
    fondo.forEach((n) => n.setAttribute("inert", ""));
    raiz.style.overflow = "hidden";
    hoja.current?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      fondo.forEach((n) => n.removeAttribute("inert"));
      raiz.style.overflow = "";
      window.removeEventListener("keydown", alTeclear);
      boton?.focus({ preventScroll: true });
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={disparador}
        type="button"
        hidden={abierto}
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        className="disparador-chat fixed inset-x-0 z-30 mx-auto flex h-12 w-fit items-center gap-2 rounded-full bg-tinta pr-5 pl-4 font-bold text-panel shadow-[0_10px_24px_-10px_rgb(21_18_14/0.6)] transition-transform duration-150 active:scale-[0.96]"
      >
        <MessageCircleQuestionMark className="size-5 text-senal" strokeWidth={2.25} aria-hidden />
        {guardado && mensajes.length ? "Seguir la conversación" : "Preguntar sobre este trámite"}
      </button>

      <AnimatePresence>
        {abierto ? (
          <>
            <motion.div
              key="fondo"
              className="fixed inset-0 z-40 bg-tinta/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setAbierto(false)}
              aria-hidden
            />
            <motion.section
              key="hoja"
              ref={hoja}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-hoja"
              className="hoja-chat fixed inset-x-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-[20px] bg-piso outline-none shadow-[0_-16px_40px_-20px_rgb(21_18_14/0.55)]"
              initial={reducir ? { opacity: 0 } : { y: "100%" }}
              animate={reducir ? { opacity: 1 } : { y: 0 }}
              exit={reducir ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: 0.34, ease: salida }}
              drag={reducir ? false : "y"}
              dragControls={controles}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(_, gesto) => {
                if (gesto.offset.y > 110 || gesto.velocity.y > 600) setAbierto(false);
              }}
            >
              <div className="shrink-0 cursor-grab touch-none border-b border-linea px-4 pt-2 pb-2.5 active:cursor-grabbing" onPointerDown={(e) => controles.start(e)}>
                <span className="mx-auto block h-1 w-10 rounded-full bg-linea" aria-hidden />
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 id="titulo-hoja" className="text-lg leading-tight font-bold">
                      Pregunta sobre este trámite
                    </h2>
                    <p className="truncate text-sm text-tinta-suave">{guardado && mensajes.length ? "Se guarda en Mis trámites" : tramite.nombre}</p>
                  </div>
                  <button type="button" aria-label="Cerrar" onPointerDown={(e) => e.stopPropagation()} onClick={() => setAbierto(false)} className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full">
                    <X className="size-6" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&_.scroll-mt-36]:scroll-mt-3">
                {mensajes.length ? (
                  <Mensajes mensajes={mensajes} ocupado={ocupado} alPreguntar={(t, a) => void preguntar(t, a)} alReintentar={reintentar} ocultarFicha={tramite.clave} />
                ) : (
                  <div className="px-3 py-4">
                    <div className="flex items-center gap-3 px-1">
                      <Sagui estado="saluda" className="size-16 shrink-0" />
                      <p className="leading-snug text-tinta-suave">Te contesto con la ficha oficial de este trámite.</p>
                    </div>
                    <ul className="mt-3 divide-y divide-linea/70 overflow-hidden rounded-[14px] bg-panel">
                      {preguntasDe(tramite).map((p, i) => (
                        <li key={p} style={{ "--fila": i } as CSSProperties} className="entra-fila">
                          <button type="button" onClick={() => void preguntar(p, [])} className="fila-senal flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left font-medium">
                            <span className="flex-1">{p}</span>
                            <ChevronRight className="flecha size-5 shrink-0 text-tinta-suave" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <BarraPregunta embebida indice={SIN_INDICE} ocupado={ocupado} alEnviar={(t, a) => void preguntar(t, a)} />
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
