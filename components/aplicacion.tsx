"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { BarraPregunta } from "./barra-pregunta";
import { Mensajes, useConversacion } from "./conversacion";
import { Sagui } from "./sagui";
import { Encabezado, Marca } from "./senal";
import type { EntradaIndice } from "@/lib/tipos";

const POPULARES = [
  "¿Cómo pido la tarifa social del agua?",
  "Se fundió una lámpara de mi calle",
  "Necesito mi constancia de no adeudo",
  "Quiero cambiar de nombre mi recibo de agua",
];
const SENAL_INICIAL = "¿Qué necesitas resolver?";
const salida = [0.16, 1, 0.3, 1] as const;

function Bienvenida({ alPreguntar, atento }: { alPreguntar: (texto: string) => void; atento: boolean }) {
  const [vez, setVez] = useState(0);
  const [contento, setContento] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-5 py-6 text-center">
      <motion.button
        type="button"
        aria-label="Saludar a Sagui"
        onClick={() => {
          setVez((v) => v + 1);
          setContento(true);
          clearTimeout(espera.current);
          espera.current = setTimeout(() => setContento(false), 1300);
        }}
        initial={{ scale: 0, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 320, damping: 15 }}
        className="rounded-full"
      >
        <Sagui estado={contento ? "feliz" : "saluda"} vez={vez} atento={atento && !contento} mirar className="size-32" />
      </motion.button>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12, ease: salida }} className="mt-2 text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
        ¿Qué trámite resolvemos hoy?
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: salida }} className="mt-2 leading-snug text-pretty text-tinta-suave">
        Soy Sagui. Pregúntame como en la ventanilla y te digo qué llevar, cuánto cuesta y a dónde ir.
      </motion.p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {POPULARES.map((s, i) => (
          <motion.li key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.24 + i * 0.05, ease: salida }}>
            <button type="button" onClick={() => alPreguntar(s)} className="min-h-11 rounded-full bg-panel px-4 py-2 text-left text-[0.9375rem] leading-snug font-medium transition-[transform,background-color] duration-150 active:scale-[0.96] active:bg-senal">
              {s}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function Aplicacion({ indice }: { indice: EntradaIndice[] }) {
  const [senal, setSenal] = useState(SENAL_INICIAL);
  const [escribiendo, setEscribiendo] = useState(false);
  const { mensajes, ocupado, preguntar, reintentar, reiniciar } = useConversacion({ almacen: "tramita:historial", alSenal: setSenal });
  const enCharla = mensajes.length > 0;

  const accion = enCharla ? (
    <button
      type="button"
      onClick={() => {
        reiniciar();
        setSenal(SENAL_INICIAL);
      }}
      className="min-h-11 rounded-[8px] px-2 font-bold underline"
    >
      Nueva pregunta
    </button>
  ) : undefined;

  return (
    <div
      className="flex min-h-dvh flex-col"
      onFocus={(e) => setEscribiendo(e.target instanceof HTMLTextAreaElement)}
      onBlur={(e) => {
        if (e.target instanceof HTMLTextAreaElement) setEscribiendo(false);
      }}
    >
      {enCharla ? (
        <Encabezado mensaje={senal} accion={accion} />
      ) : (
        <header className="mx-auto flex w-full max-w-5xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="flex h-11 items-center">
            <Marca />
          </div>
        </header>
      )}

      <div className="flex w-full flex-1 flex-col">
        <main className="flex-1">
          {enCharla ? (
            <Mensajes mensajes={mensajes} ocupado={ocupado} alPreguntar={(t, a) => void preguntar(t, a)} alReintentar={reintentar} alSenal={setSenal} />
          ) : (
            <Bienvenida alPreguntar={(t) => void preguntar(t, [])} atento={escribiendo} />
          )}
        </main>

        <BarraPregunta indice={indice} ocupado={ocupado} alEnviar={(t, a) => void preguntar(t, a)} />
        <div className="h-(--alto-dock)" aria-hidden />
      </div>
    </div>
  );
}
