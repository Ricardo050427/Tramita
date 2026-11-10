"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { leerMarcados } from "./ficha";
import { avisoVigencia, diasRestantes } from "./plan";
import { Encabezado } from "./senal";
import { dejarDeSeguir, reabrir, restaurar, terminar, useMisTramites, type Seguimiento } from "@/lib/mis-tramites";

const DIA_MS = 86_400_000;
const sinSuscripcion = () => () => undefined;

function haceCuanto(fecha: string) {
  const inicio = new Date(fecha).setHours(0, 0, 0, 0);
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - inicio) / DIA_MS);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function Avance({ s }: { s: Seguimiento }) {
  const marcados = leerMarcados(s.clave);
  const total = s.requisitos.length;
  if (!total) return <p className="mt-2.5 text-[0.9375rem] text-tinta-suave">Abre la ficha para ver lo que necesitas.</p>;

  const listos = marcados.filter((i) => i < total).length;
  const siguiente = s.requisitos.find((_, i) => !marcados.includes(i));
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="font-medium">
          {listos} de {total} requisitos
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-piso" aria-hidden>
        <div className={`avance-barra h-full origin-left rounded-full ${siguiente ? "bg-senal" : "bg-bien"}`} style={{ transform: `scaleX(${listos / total})` }} />
      </div>
      <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-snug text-tinta-suave">
        {siguiente ? (
          <>
            <span className="font-medium text-tinta">Te falta: </span>
            {siguiente}
          </>
        ) : (
          <span className="font-medium text-bien">Ya tienes todo. Puedes ir a hacerlo.</span>
        )}
      </p>
    </div>
  );
}

function Tarjeta({ s, indice, alQuitar }: { s: Seguimiento; indice: number; alQuitar: () => void }) {
  const aviso = s.terminado ? avisoVigencia(diasRestantes({ vigencia: s.vigencia ?? null }, s.terminado)) : null;
  const accion = "flex min-h-12 flex-1 items-center justify-center gap-1.5 text-[0.9375rem] font-medium transition-colors duration-150 active:bg-piso";

  return (
    <motion.li layout="position" style={{ "--fila": Math.min(indice, 8) } as CSSProperties} className="entra-fila overflow-hidden rounded-[14px] bg-panel" transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
      <Link href={`/tramite/${s.clave}`} className="fila-senal block px-4 pt-3.5 pb-3">
        <div className="flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-[1.0625rem] leading-snug font-bold text-balance">{s.nombre}</h2>
          <ChevronRight className="flecha mt-0.5 size-5 shrink-0 text-tinta-suave" aria-hidden />
        </div>
        <p className="mt-0.5 truncate text-sm text-tinta-suave">{s.dependencia}</p>
        {s.terminado ? (
          <div className="mt-2.5 text-[0.9375rem] leading-snug">
            <p className="flex items-center gap-1.5 font-medium text-bien">
              <Check className="size-4" strokeWidth={3} aria-hidden />
              Terminado {haceCuanto(s.terminado)}
            </p>
            {aviso ? <p className={`mt-0.5 font-medium ${aviso.urgente ? "text-error" : "text-tinta-suave"}`}>{aviso.texto}</p> : null}
          </div>
        ) : (
          <Avance s={s} />
        )}
      </Link>
      <div className="flex divide-x divide-linea/70 border-t border-linea/70">
        {s.terminado ? (
          <button type="button" onClick={() => reabrir(s.clave)} className={accion}>
            <RotateCcw className="size-4" aria-hidden />
            Reabrir
          </button>
        ) : (
          <button type="button" onClick={() => terminar(s.clave)} className={accion}>
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
            Ya lo terminé
          </button>
        )}
        <button type="button" onClick={alQuitar} className={accion}>
          <Trash2 className="size-4" aria-hidden />
          Quitar
        </button>
      </div>
    </motion.li>
  );
}

function Vacio() {
  return (
    <div className="px-1 pt-3">
      <h2 className="text-xl font-bold">Todavía no sigues ningún trámite</h2>
      <p className="mt-1.5 leading-snug text-pretty text-tinta-suave">Guarda uno desde su ficha o empieza a marcar sus requisitos. Aquí verás lo que llevas y lo que te falta.</p>
      <Link href="/tramites" className="mt-5 flex min-h-12 w-fit items-center gap-2 rounded-full bg-senal px-5 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]">
        Ver trámites
        <ChevronRight className="size-5" aria-hidden />
      </Link>
    </div>
  );
}

function Lista() {
  const mis = useMisTramites();
  const [vista, setVista] = useState<"curso" | "listos">("curso");
  const [quitado, setQuitado] = useState<Seguimiento | null>(null);

  useEffect(() => {
    if (!quitado) return;
    const espera = setTimeout(() => setQuitado(null), 5000);
    return () => clearTimeout(espera);
  }, [quitado]);

  const todos = Object.values(mis).sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  const enCurso = todos.filter((s) => !s.terminado);
  const listos = todos.filter((s) => s.terminado);
  const visibles = vista === "curso" ? enCurso : listos;
  const senal = !todos.length ? "Mis trámites" : enCurso.length ? `Llevas ${enCurso.length} en curso` : "Todo terminado";
  const pestanas = [
    { id: "curso" as const, nombre: "En curso", total: enCurso.length },
    { id: "listos" as const, nombre: "Terminados", total: listos.length },
  ];

  function quitar(s: Seguimiento) {
    dejarDeSeguir(s.clave);
    setQuitado(s);
  }

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={senal} />
      <main className="mx-auto max-w-2xl px-3 py-4">
        {todos.length ? (
          <>
            <div className="mx-auto flex w-fit rounded-full bg-panel p-1">
              {pestanas.map((p) => (
                <button key={p.id} type="button" aria-pressed={vista === p.id} onClick={() => setVista(p.id)} className={`relative flex min-h-11 items-center gap-1.5 rounded-full px-4 font-medium transition-colors duration-200 ${vista === p.id ? "text-panel" : "text-tinta"}`}>
                  {vista === p.id ? <motion.span layoutId="pestana-mis" className="absolute inset-0 rounded-full bg-tinta" transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }} /> : null}
                  <span className="relative">{p.nombre}</span>
                  <span className="relative opacity-70">{p.total}</span>
                </button>
              ))}
            </div>
            {visibles.length ? (
              <ul key={vista} className="mt-4 space-y-3">
                {visibles.map((s, i) => (
                  <Tarjeta key={s.clave} s={s} indice={i} alQuitar={() => quitar(s)} />
                ))}
              </ul>
            ) : (
              <p className="mt-6 px-1 text-center text-tinta-suave">{vista === "curso" ? "No tienes trámites en curso." : "Aún no has terminado ningún trámite."}</p>
            )}
          </>
        ) : (
          <Vacio />
        )}
        <p className="mt-5 px-1 text-[0.8125rem] leading-snug text-tinta-suave">Esta lista se guarda solo en este dispositivo.</p>
      </main>

      {quitado ? (
        <div role="status" className="aviso-flotante fixed inset-x-0 z-30 mx-auto flex h-12 w-fit items-center gap-3 rounded-full bg-tinta pr-2 pl-5 text-panel shadow-[0_10px_24px_-10px_rgb(21_18_14/0.6)]">
          Quitado de tu lista
          <button
            type="button"
            onClick={() => {
              restaurar(quitado);
              setQuitado(null);
            }}
            className="min-h-11 rounded-full px-3 font-bold text-senal"
          >
            Deshacer
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MisTramites() {
  // La lista vive en el dispositivo: se dibuja ya en el navegador para no parpadear como vacía.
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (enNavegador) return <Lista />;
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="Mis trámites" />
    </div>
  );
}
