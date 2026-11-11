"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ExternalLink, FolderOpen, Plus } from "lucide-react";
import { alternarPaso, seguir, useMisTramites } from "@/lib/mis-tramites";
import type { PasoRuta, Ruta } from "@/lib/rutas";

const salida = [0.16, 1, 0.3, 1] as const;

const comoPaso = (p: PasoRuta) => ({
  clave: p.clave!,
  nombre: p.nombre,
  dependencia: p.dependencia,
  costo: p.costo ?? "",
  plazo: p.plazo ?? "",
  estimado: p.minimo === null || p.maximo === null ? null : { min: p.minimo, max: p.maximo },
  vigencia: null,
});

export function PasosRuta({ ruta }: { ruta: Ruta }) {
  const mis = useMisTramites();
  const reducir = useReducedMotion();
  const [seguida, setSeguida] = useState(false);
  const pasos = ruta.fases.flatMap((f) => f.pasos);
  const obligatorios = pasos.filter((p) => p.clave && !p.opcional);
  const hechos = obligatorios.filter((p) => mis[p.clave!]?.terminado).length;
  const enLista = obligatorios.every((p) => mis[p.clave!]);
  // Los pasos obligatorios del Ayuntamiento llevan número; los opcionales y externos, un símbolo.
  const numeroDe = new Map<PasoRuta, number>();
  for (const p of pasos) if (!p.externo && !p.opcional) numeroDe.set(p, numeroDe.size + 1);

  function seguirRuta() {
    for (const p of obligatorios) if (!mis[p.clave!]) seguir({ clave: p.clave!, nombre: p.nombre, dependencia: p.dependencia, requisitos: p.requisitos });
    setSeguida(true);
  }

  return (
    <>
      <div className="mt-4 rounded-[14px] bg-panel p-4">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-bold">Tu avance</span>
          <span className="text-[0.9375rem] text-tinta-suave">
            {hechos} de {obligatorios.length} trámites listos
          </span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-piso" aria-hidden>
          <div className="avance-barra h-full origin-left rounded-full bg-senal" style={{ transform: `scaleX(${obligatorios.length ? hechos / obligatorios.length : 0})` }} />
        </div>
        {enLista || seguida ? (
          <Link href="/mis-tramites" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold">
            <FolderOpen className="size-5" aria-hidden />
            Ver la ruta en Mis trámites
          </Link>
        ) : (
          <button
            type="button"
            onClick={seguirRuta}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.98]"
          >
            <FolderOpen className="size-5" aria-hidden />
            Seguir esta ruta en Mis trámites
          </button>
        )}
      </div>

      {ruta.fases.map((fase, f) => (
        <section key={fase.nombre} className="mt-7" aria-labelledby={`fase-${f}`}>
          <h2 id={`fase-${f}`} className="px-1 text-lg font-bold">
            {fase.nombre}
          </h2>
          <ol className="mt-2 rounded-[14px] bg-panel px-4 pt-4 pb-1">
            {fase.pasos.map((p, i) => {
              const hecho = Boolean(p.clave && mis[p.clave]?.terminado);
              const ultimo = i === fase.pasos.length - 1;
              return (
                <motion.li
                  key={p.clave ?? p.nombre}
                  className="relative flex gap-3 pb-4"
                  initial={reducir ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.36, delay: i * 0.05, ease: salida }}
                >
                  {!ultimo ? <span aria-hidden className="absolute top-10 bottom-1 left-[17px] w-0.5 bg-linea" /> : null}
                  <span
                    className={`z-[1] grid size-9 shrink-0 place-items-center rounded-[8px] text-[0.9375rem] font-bold transition-colors duration-150 ${
                      hecho ? "bg-bien text-panel" : p.externo ? "border-2 border-dashed border-tinta-suave bg-panel text-tinta-suave" : p.opcional ? "border-2 border-tinta bg-panel" : "bg-tinta text-panel"
                    }`}
                    aria-hidden
                  >
                    {hecho ? <Check className="size-5" strokeWidth={3} /> : p.externo ? <ExternalLink className="size-4" /> : p.opcional ? <Plus className="size-4" strokeWidth={2.75} /> : numeroDe.get(p)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {p.clave ? (
                      <Link href={`/tramite/${p.clave}`} className="leading-snug font-bold underline">
                        {p.nombre}
                      </Link>
                    ) : (
                      <p className="leading-snug font-bold">{p.nombre}</p>
                    )}
                    <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">{p.externo ? `Con ${p.dependencia}, fuera del Ayuntamiento` : p.dependencia}</p>
                    {p.opcional ? <p className="mt-1 text-[0.9375rem] leading-snug font-bold text-aviso">{p.opcional}</p> : null}
                    <p className="mt-1 leading-snug">{p.nota}</p>
                    {p.clave ? (
                      <p className="mt-1 text-[0.9375rem] leading-snug">
                        <span className="font-medium">{p.costo}</span>
                        <span className="text-tinta-suave"> · Respuesta: {p.plazo}</span>
                      </p>
                    ) : null}
                    {p.clave ? (
                      <button
                        type="button"
                        aria-pressed={hecho}
                        onClick={() => {
                          navigator.vibrate?.(8);
                          alternarPaso(comoPaso(p), hecho ? null : new Date().toISOString());
                        }}
                        className="mt-0.5 min-h-11 font-bold underline"
                      >
                        {hecho ? "Desmarcar" : "Ya lo tengo"}
                      </button>
                    ) : p.externo?.url ? (
                      <a href={p.externo.url} target="_blank" rel="noreferrer" className="mt-0.5 flex min-h-11 items-center gap-1.5 font-bold underline">
                        Ir al sitio oficial
                        <ArrowRight className="size-4" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
