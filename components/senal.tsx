"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

// La Señal: el mensaje de la banda cambia palabra por palabra, como un tablero de terminal.
export function Senal({ texto, grande }: { texto: string; grande?: boolean }) {
  const reducir = useReducedMotion();
  const Etiqueta = grande ? "h1" : "p";
  return (
    <Etiqueta
      aria-live="polite"
      style={{ perspective: 600 }}
      className={
        grande
          ? "text-[clamp(2.75rem,12.5vw,5.25rem)] leading-[0.98] font-bold tracking-[-0.025em] text-balance"
          : "text-2xl leading-tight font-bold tracking-[-0.015em] text-balance"
      }
    >
      <span key={texto} className="inline">
        {texto.split(" ").map((palabra, i) => (
          <Fragment key={`${palabra}-${i}`}>
            <motion.span
              className="inline-block origin-bottom"
              initial={reducir ? false : { rotateX: -85, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.34, delay: Math.min(i * 0.035, 0.3), ease: [0.16, 1, 0.3, 1] }}
            >
              {palabra}
            </motion.span>{" "}
          </Fragment>
        ))}
      </span>
    </Etiqueta>
  );
}

export function Marca() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold">
      <span className="grid size-7 place-items-center rounded-[5px] bg-tinta text-senal">
        <ArrowUpRight className="size-5" strokeWidth={2.75} aria-hidden />
      </span>
      Tramita
    </span>
  );
}

export function Encabezado({
  mensaje,
  grande,
  volver,
  accion,
}: {
  mensaje: string;
  grande?: boolean;
  volver?: string;
  accion?: React.ReactNode;
}) {
  return (
    <motion.header
      layout="size"
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-30 bg-senal text-tinta ${grande ? "" : "shadow-[0_6px_16px_-10px_rgb(21_18_14/0.6)]"}`}
    >
      <div className="mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-4">
        <div className="flex h-11 items-center justify-between">
          {volver ? (
            <Link href={volver} aria-label="Volver" className="-ml-2 grid size-11 place-items-center">
              <ArrowLeft className="size-7" strokeWidth={2.5} aria-hidden />
            </Link>
          ) : (
            <Link href="/" aria-label="Tramita, inicio">
              <Marca />
            </Link>
          )}
          {accion}
        </div>
        <div className={grande ? "pt-7 pb-3" : "pt-1"}>
          <Senal texto={mensaje} grande={grande} />
        </div>
      </div>
    </motion.header>
  );
}
