"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Accessibility, Check } from "lucide-react";
import { guardarPreferencias, PERFILES, usePreferencias, type Perfil } from "@/lib/preferencias";

const salida = [0.16, 1, 0.3, 1] as const;

// La letra grande se aplica a toda la app desde el elemento raíz.
export function AplicarPreferencias() {
  const { letra } = usePreferencias();
  useEffect(() => {
    document.documentElement.toggleAttribute("data-letra-grande", Boolean(letra));
  }, [letra]);
  return null;
}

function Interruptor({ activo, titulo, detalle, alCambiar }: { activo: boolean; titulo: string; detalle: string; alCambiar: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={alCambiar} className="flex w-full items-center gap-4 border-t border-linea py-3.5 text-left first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{titulo}</span>
        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-tinta-suave">{detalle}</span>
      </span>
      <span className={`relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200 ${activo ? "bg-tinta" : "bg-linea"}`} aria-hidden>
        <motion.span
          className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-panel shadow-[0_1px_3px_rgb(21_18_14/0.3)]"
          animate={{ x: activo ? 20 : 0 }}
          transition={{ duration: 0.22, ease: salida }}
        >
          {activo ? <Check className="size-3.5 text-tinta" strokeWidth={3.5} /> : null}
        </motion.span>
      </span>
    </button>
  );
}

export function BotonPreferencias() {
  const [abierto, setAbierto] = useState(false);
  const prefs = usePreferencias();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTeclear);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Ajustes de lectura y perfil"
        className="grid size-11 place-items-center rounded-full transition-transform duration-150 active:scale-90"
      >
        <Accessibility className="size-6" strokeWidth={2.1} aria-hidden />
      </button>
      <AnimatePresence>
        {abierto ? (
          <div className="fixed inset-0 z-50">
            <motion.div className="absolute inset-0 bg-tinta/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(false)} />
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-preferencias"
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-xl overflow-y-auto rounded-t-[20px] bg-panel px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-left outline-none"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.34, ease: salida }}
            >
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-linea" aria-hidden />
              <h2 id="titulo-preferencias" className="mt-4 text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
                Cómo te ayudo mejor
              </h2>
              <div className="mt-3">
                <Interruptor activo={Boolean(prefs.letra)} titulo="Letra más grande" detalle="Agranda el texto en toda la app." alCambiar={() => guardarPreferencias({ letra: !prefs.letra })} />
                <Interruptor
                  activo={Boolean(prefs.sencillo)}
                  titulo="Palabras sencillas"
                  detalle="Sagui responde con frases cortas y sin palabras técnicas."
                  alCambiar={() => guardarPreferencias({ sencillo: !prefs.sencillo })}
                />
              </div>
              <fieldset className="mt-4 border-t border-linea pt-4">
                <legend className="sr-only">Para quién buscas</legend>
                <p className="font-bold">
                  ¿Para quién buscas? <span className="font-normal text-tinta-suave">(opcional)</span>
                </p>
                <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">Te sugiero preguntas y Sagui te avisa de apoyos o descuentos que te apliquen.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...PERFILES.map((p) => ({ id: p.id as Perfil | undefined, nombre: p.nombre })), { id: undefined, nombre: "Prefiero no decir" }].map((p) => {
                    const activo = prefs.perfil === p.id;
                    return (
                      <button
                        key={p.nombre}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => guardarPreferencias({ perfil: p.id })}
                        className={`min-h-11 rounded-full border-2 px-4 text-[0.9375rem] font-bold transition-colors duration-150 ${activo ? "border-tinta bg-tinta text-panel" : "border-linea bg-panel"}`}
                      >
                        {p.nombre}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <p className="mt-4 text-sm text-tinta-suave">Se guarda solo en este teléfono.</p>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[10px] bg-tinta font-bold text-panel transition-transform duration-150 active:scale-[0.98]"
              >
                Listo
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
