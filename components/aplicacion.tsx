"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { BarraPregunta } from "./barra-pregunta";
import { Mensajes, useConversacion } from "./conversacion";
import { EscenaCerro } from "./escena-cerro";
import { BotonPreferencias } from "./preferencias";
import { Sagui } from "./sagui";
import { Encabezado, Marca } from "./senal";
import { clavesDe, copiarACharlas } from "@/lib/charlas";
import { useMisTramites } from "@/lib/mis-tramites";
import { PERFILES, usePreferencias } from "@/lib/preferencias";
import type { EntradaIndice } from "@/lib/tipos";

// Etiqueta corta en el botón y la pregunta completa que recibe Sagui.
const POPULARES = [
  { etiqueta: "Tarifa social del agua", pregunta: "¿Cómo pido la tarifa social del agua?" },
  { etiqueta: "Constancia de no adeudo", pregunta: "Necesito mi constancia de no adeudo" },
  { etiqueta: "Me pidieron $500 para agilizar", pregunta: "Me pidieron $500 para agilizar mi licencia de negocio" },
];
const SENAL_INICIAL = "¿Qué necesitas resolver?";
const salida = [0.16, 1, 0.3, 1] as const;

function Bienvenida({ alPreguntar, atento }: { alPreguntar: (texto: string) => void; atento: boolean }) {
  const [vez, setVez] = useState(0);
  const [contento, setContento] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { perfil } = usePreferencias();
  const delPerfil = PERFILES.find((p) => p.id === perfil)?.sugerencias.slice(0, 3).map((s) => ({ etiqueta: s, pregunta: s }));
  const sugerencias = delPerfil ?? POPULARES;
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        // Al 90 %: el cerro se asienta como fondo y deja el protagonismo a Sagui y a la barra.
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05, ease: salida }}
        className="escena-inicio pointer-events-none fixed inset-x-0 z-0 will-change-transform"
        aria-hidden
      >
        <EscenaCerro className="block size-full" />
      </motion.div>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-4 pt-[clamp(1.25rem,4dvh,2rem)] text-center min-[70rem]:max-w-3xl min-[70rem]:pt-[11vh]">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: salida }}
          className="max-w-[13ch] text-[1.875rem] leading-[1.08] font-bold tracking-[-0.02em] text-balance min-[70rem]:max-w-none min-[70rem]:text-[2.75rem]"
        >
          ¿Qué trámite resolvemos hoy?
        </motion.h1>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {sugerencias.map((s, i) => (
            <motion.li key={s.pregunta} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, delay: 0.16 + i * 0.05, ease: salida }}>
              <button
                type="button"
                onClick={() => alPreguntar(s.pregunta)}
                className="min-h-11 rounded-full border border-calido-linea bg-calido px-4 py-2 text-left text-[0.9375rem] leading-snug font-medium transition-[transform,background-color,border-color] duration-150 active:scale-[0.96] active:border-senal active:bg-senal"
              >
                {s.etiqueta}
              </button>
            </motion.li>
          ))}
        </ul>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4, ease: salida }}>
          <Link href="/vigila#verificar" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.9375rem] font-bold text-tinta underline underline-offset-3">
            <ShieldCheck className="size-[1.125rem] text-senal-oscura" aria-hidden />
            ¿Te pidieron algo de más en ventanilla?
          </Link>
        </motion.div>
      </div>

      {/* Sagui se para en el cerro; el contorno blanco y la sombra lo separan del naranja. */}
      <motion.button
        type="button"
        aria-label="Saludar a Sagui"
        onClick={() => {
          setVez((v) => v + 1);
          setContento(true);
          clearTimeout(espera.current);
          espera.current = setTimeout(() => setContento(false), 1300);
        }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.15 }}
        className="sagui-inicio fixed z-10 rounded-full will-change-transform"
      >
        <Sagui estado={contento ? "feliz" : "saluda"} vez={vez} atento={atento && !contento} mirar contorno className="block h-auto w-full" />
      </motion.button>
    </>
  );
}

export function Aplicacion({ indice }: { indice: EntradaIndice[] }) {
  const [senal, setSenal] = useState(SENAL_INICIAL);
  const [escribiendo, setEscribiendo] = useState(false);
  const { mensajes, ocupado, preguntar, reintentar, reiniciar } = useConversacion({ almacen: "tramita:historial", alSenal: setSenal });
  const enCharla = mensajes.length > 0;
  const mis = useMisTramites();

  // Si en la charla aparece un trámite guardado en Mis trámites, la conversación se queda con él para retomarla otro día.
  useEffect(() => {
    if (ocupado || !mensajes.length) return;
    const guardados = clavesDe(mensajes).filter((clave) => mis[clave]);
    if (guardados.length) copiarACharlas(mensajes, guardados);
  }, [mensajes, ocupado, mis]);

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
      className={enCharla ? "flex min-h-dvh flex-col" : "inicio-blanco flex min-h-dvh flex-col bg-panel"}
      onFocus={(e) => setEscribiendo(e.target instanceof HTMLTextAreaElement)}
      onBlur={(e) => {
        if (e.target instanceof HTMLTextAreaElement) setEscribiendo(false);
      }}
    >
      {enCharla ? (
        <Encabezado mensaje={senal} accion={accion} />
      ) : (
        <header className="relative z-10 mx-auto flex w-full max-w-5xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="flex h-11 w-full items-center justify-between">
            <Marca />
            <BotonPreferencias />
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
