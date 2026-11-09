"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import { Encabezado } from "./senal";
import type { Tramite } from "@/lib/tipos";

const ALMACEN = "tramita:lista:";

function leerMarcados(clave: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(ALMACEN + clave) ?? "[]");
  } catch {
    return [];
  }
}

function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <span
      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-[6px] border-2 border-tinta transition-colors duration-150 ${
        marcada ? "bg-tinta" : "bg-panel"
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
        <motion.path
          d="M4 10.5 8.2 14.5 16 6"
          fill="none"
          stroke="var(--senal)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: marcada ? 1 : 0, opacity: marcada ? 1 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </span>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!valor) return null;
  const corte = valor.search(/[.,]\s/);
  const largo = valor.length > 48 && corte > 0;
  return (
    <div className="flex gap-4 border-t border-linea py-3">
      <dt className="w-20 shrink-0 text-tinta-suave">{etiqueta}</dt>
      <dd className="min-w-0 flex-1 font-medium">
        {largo && !abierto ? valor.slice(0, corte) : valor}
        {largo && !abierto ? (
          <button type="button" onClick={() => setAbierto(true)} className="ml-1.5 font-normal underline">
            Ver más
          </button>
        ) : null}
      </dd>
    </div>
  );
}

export function mensajeProgreso(tramite: Tramite, faltan: number) {
  const total = tramite.requisitos.length;
  if (!total) return "Confirma los requisitos por teléfono";
  if (faltan === 0) return tramite.enLinea ? "Todo listo. Hazlo en línea" : "Todo listo. Ya puedes ir";
  if (faltan === total) return `Junta ${total} ${total === 1 ? "requisito" : "requisitos"}`;
  return `Te ${faltan === 1 ? "falta 1 requisito" : `faltan ${faltan} requisitos`}`;
}

export function Ficha({
  tramite,
  compacta,
  alProgreso,
}: {
  tramite: Tramite;
  compacta?: boolean;
  alProgreso?: (faltan: number) => void;
}) {
  const [marcados, setMarcados] = useState<number[]>([]);
  const [verTodos, setVerTodos] = useState(!compacta);
  const total = tramite.requisitos.length;

  useEffect(() => {
    const guardados = leerMarcados(tramite.clave);
    setMarcados(guardados);
    alProgreso?.(total - guardados.length);
  }, [tramite.clave, total, alProgreso]);

  function alternar(i: number) {
    navigator.vibrate?.(8);
    const siguiente = marcados.includes(i) ? marcados.filter((m) => m !== i) : [...marcados, i];
    setMarcados(siguiente);
    alProgreso?.(total - siguiente.length);
    try {
      localStorage.setItem(ALMACEN + tramite.clave, JSON.stringify(siguiente));
    } catch {}
  }

  const visibles = verTodos ? tramite.requisitos : tramite.requisitos.slice(0, 5);
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tramite.domicilio}, Hermosillo, Sonora`)}`;

  return (
    <article className="overflow-hidden rounded-[14px] border border-linea bg-panel">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em] text-balance">{tramite.nombre}</h2>
        <p className="mt-1 text-tinta-suave">{tramite.dependencia}</p>
      </div>

      <dl className="px-4">
        <Dato etiqueta="Costo" valor={tramite.costo} />
        <Dato etiqueta="Respuesta" valor={tramite.plazo} />
        <Dato etiqueta="Obtienes" valor={tramite.obtienes === "Ninguno" ? "" : tramite.obtienes} />
      </dl>

      <section className="border-t border-tinta px-4 pt-4 pb-2">
        <h3 className="text-lg font-bold">Qué necesitas</h3>
        {total ? (
          <ul className="mt-2">
            {visibles.map((r, i) => {
              const marcada = marcados.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    onClick={() => alternar(i)}
                    className="flex min-h-11 w-full items-start gap-3 py-2 text-left"
                  >
                    <Casilla marcada={marcada} />
                    <span className={`min-w-0 flex-1 transition-opacity duration-200 ${marcada ? "opacity-55" : ""}`}>
                      <span className="block leading-snug font-medium">{r.titulo}</span>
                      {r.detalle ? <span className="mt-0.5 block text-[0.9375rem] leading-snug text-tinta-suave">{r.detalle}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 pb-2 text-tinta-suave">
            El catálogo no publica requisitos para este trámite. Confírmalos por teléfono antes de ir.
          </p>
        )}
        {!verTodos && total > 5 ? (
          <button type="button" onClick={() => setVerTodos(true)} className="min-h-11 font-bold underline">
            Ver los {total} requisitos
          </button>
        ) : null}
      </section>

      <section className="border-t border-linea px-4 py-2">
        {tramite.domicilio ? (
          <a href={mapa} target="_blank" rel="noreferrer" className="flex min-h-11 items-start gap-3 py-2">
            <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span className="underline">{tramite.domicilio}</span>
          </a>
        ) : null}
        {tramite.horario ? (
          <p className="flex min-h-11 items-start gap-3 py-2">
            <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
            {tramite.horario}
          </p>
        ) : null}
        {tramite.telefono ? (
          <a href={`tel:${tramite.telefono.replace(/\D/g, "")}`} className="flex min-h-11 items-start gap-3 py-2">
            <Phone className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span className="underline">{tramite.telefono}</span>
          </a>
        ) : null}
      </section>

      {tramite.enLinea ? (
        <div className="px-4 pb-4">
          <a
            href={tramite.enLinea}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-13 items-center justify-between rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.98]"
          >
            Hacer este trámite en línea
            <ExternalLink className="size-5" aria-hidden />
          </a>
        </div>
      ) : null}

      <a
        href="https://tramites.hermosillo.gob.mx/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 border-t border-linea bg-piso/60 px-4 py-3 text-sm text-tinta-suave"
      >
        <span>Fuente oficial: catálogo municipal, clave {tramite.clave}</span>
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </a>
    </article>
  );
}

export function VistaTramite({ tramite }: { tramite: Tramite }) {
  const [mensaje, setMensaje] = useState(() => mensajeProgreso(tramite, tramite.requisitos.length));
  const alProgreso = useCallback((faltan: number) => setMensaje(mensajeProgreso(tramite, faltan)), [tramite]);

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={mensaje} volver={`/categoria/${tramite.categoria}`} />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        <Ficha tramite={tramite} alProgreso={alProgreso} />
        {tramite.descripcion ? (
          <section className="mt-6 px-1">
            <h3 className="text-lg font-bold">De qué se trata</h3>
            <p className="mt-1 leading-relaxed">{tramite.descripcion}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
