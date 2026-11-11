"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarCheck, CalendarPlus, Check, ChevronRight, MessageCircle, RotateCcw, Trash2 } from "lucide-react";
import { leerMarcados } from "./ficha";
import { avisoVigencia, diasRestantes } from "./plan";
import { Sagui } from "./sagui";
import { Encabezado } from "./senal";
import { archivoCalendario, fechaCorta, fechaLimite, habilesEntre, hoyIso, leerPlazo } from "@/lib/habiles";
import { leerCharla } from "@/lib/charlas";
import { SITIO } from "@/lib/ley";
import { dejarDeSeguir, marcarEntregado, reabrir, restaurar, terminar, useMisTramites, type Seguimiento } from "@/lib/mis-tramites";

type Plazos = Record<string, string>;

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

// La conversación con Sagui sobre este trámite, guardada al seguirlo: se retoma con todo su contexto.
function Conversacion({ clave }: { clave: string }) {
  const ultima = leerCharla(clave).findLast((m) => m.rol === "usuario");
  if (!ultima) return null;
  return (
    <Link href={`/tramite/${clave}?charla`} className="fila-senal flex min-h-14 items-center gap-3 border-t border-linea/70 px-4 py-2.5">
      <MessageCircle className="size-5 shrink-0 text-senal-oscura" aria-hidden />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block font-bold">Seguir la conversación con Sagui</span>
        <span className="block truncate text-sm text-tinta-suave">
          {ultima.fecha ? `${haceCuanto(ultima.fecha).replace(/^h/, "H")} · ` : ""}«{ultima.texto}»
        </span>
      </span>
      <ChevronRight className="flecha size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}

function estadoPlazo(s: Seguimiento, texto?: string) {
  const plazo = texto ? leerPlazo(texto) : null;
  if (!s.entregado || !plazo) return null;
  const limite = fechaLimite(s.entregado, plazo);
  const hoy = hoyIso();
  const faltan = plazo.habiles ? habilesEntre(hoy, limite) : Math.round((new Date(limite).getTime() - new Date(hoy).getTime()) / DIA_MS);
  return { plazo, limite, faltan, vencido: faltan < 0 };
}

function CuentaPlazo({ s, texto }: { s: Seguimiento; texto?: string }) {
  const [cambiando, setCambiando] = useState(false);
  const plazo = texto ? leerPlazo(texto) : null;
  const estado = estadoPlazo(s, texto);
  const corto = plazo ? `${plazo.dias} ${plazo.dias === 1 ? "día" : "días"}${plazo.habiles ? " hábiles" : " naturales"}` : "";

  if (!s.entregado) {
    return (
      <div className="border-t border-linea/70 px-4 py-2">
        <button type="button" onClick={() => marcarEntregado(s.clave, hoyIso())} className="flex min-h-11 items-center gap-2 font-bold">
          <CalendarCheck className="size-[1.125rem]" aria-hidden />
          Ya entregué la solicitud
        </button>
        <p className="pb-1 text-sm leading-snug text-tinta-suave">
          {plazo ? `Contaré los ${plazo.dias} días ${plazo.habiles ? "hábiles " : ""}que tienen para responderte.` : "Llevaré la cuenta de los días que esperas respuesta."}
        </p>
      </div>
    );
  }

  function agendar() {
    if (!estado) return;
    const archivo = new Blob([archivoCalendario({ clave: s.clave, nombre: s.nombre, limite: estado.limite, plazo: corto, sitio: SITIO })], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `plazo-${s.clave}.ics`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const esperando = habilesEntre(s.entregado, hoyIso());
  const parte = estado ? Math.min(1, Math.max(0, (estado.plazo.dias - estado.faltan) / estado.plazo.dias)) : 0;
  const color = !estado ? "" : estado.vencido ? "text-error" : estado.faltan <= 2 ? "text-aviso" : "text-tinta";
  const habiles = estado?.plazo.habiles ? " hábiles" : "";

  return (
    <div className="border-t border-linea/70 px-4 py-3 text-[0.9375rem] leading-snug">
      <p className="text-tinta-suave">Entregaste la solicitud el {fechaCorta(s.entregado)}.</p>
      {estado ? (
        <>
          <p className={`mt-1 font-bold ${color}`}>
            {estado.vencido
              ? `El plazo venció el ${fechaCorta(estado.limite)}`
              : estado.faltan === 0
                ? "Hoy vence el plazo para responderte"
                : `Te deben responder a más tardar el ${fechaCorta(estado.limite)}`}
          </p>
          <p className="mt-0.5 text-tinta-suave">
            {estado.vencido
              ? `Van ${-estado.faltan} ${-estado.faltan === 1 ? "día" : "días"}${habiles} de retraso. Plazo publicado: ${corto}.`
              : estado.faltan > 0
                ? `${estado.faltan === 1 ? "Falta 1 día" : `Faltan ${estado.faltan} días`}${habiles} de ${estado.plazo.dias}.`
                : `Plazo publicado: ${corto}.`}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-piso" aria-hidden>
            <div className={`h-full rounded-full ${estado.vencido ? "bg-error" : "bg-tinta"}`} style={{ width: `${parte * 100}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-1">
          <span className="font-bold">Esta ficha no publica un plazo de respuesta.</span> Llevas {esperando} {esperando === 1 ? "día hábil" : "días hábiles"} esperando.
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-5">
        {estado?.vencido ? (
          <Link href={`/tramite/${s.clave}/reportar?tipo=plazo`} className="flex min-h-11 items-center gap-1.5 font-bold text-error underline">
            Reportar el plazo vencido
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : estado ? (
          <button type="button" onClick={agendar} className="flex min-h-11 items-center gap-1.5 font-bold underline">
            <CalendarPlus className="size-4" aria-hidden />
            Agregar al calendario
          </button>
        ) : null}
        {cambiando ? (
          <label className="flex min-h-11 items-center gap-2">
            <span className="sr-only">Fecha en que entregaste la solicitud</span>
            <input
              type="date"
              value={s.entregado}
              max={hoyIso()}
              onChange={(e) => {
                if (e.target.value) marcarEntregado(s.clave, e.target.value);
                setCambiando(false);
              }}
              className="rounded-[8px] border-2 border-linea bg-panel px-2 py-1 text-base"
            />
          </label>
        ) : (
          <button type="button" onClick={() => setCambiando(true)} className="flex min-h-11 items-center underline">
            Cambiar fecha
          </button>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ s, plazo, indice, alQuitar }: { s: Seguimiento; plazo?: string; indice: number; alQuitar: () => void }) {
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
      {s.terminado ? null : <CuentaPlazo s={s} texto={plazo} />}
      <Conversacion clave={s.clave} />
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
      <Sagui estado="saluda" className="-ml-2 size-24" />
      <h2 className="mt-1 text-xl font-bold">Todavía no sigues ningún trámite</h2>
      <p className="mt-1.5 leading-snug text-pretty text-tinta-suave">Guarda uno desde su ficha o empieza a marcar sus requisitos. Aquí verás lo que llevas y lo que te falta.</p>
      <Link href="/tramites" className="mt-5 flex min-h-12 w-fit items-center gap-2 rounded-full bg-senal px-5 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]">
        Ver trámites
        <ChevronRight className="size-5" aria-hidden />
      </Link>
    </div>
  );
}

function Lista({ plazos }: { plazos: Plazos }) {
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
  const vencidos = enCurso.filter((s) => estadoPlazo(s, plazos[s.clave])?.vencido).length;
  const senal = !todos.length
    ? "Mis trámites"
    : vencidos
      ? vencidos === 1
        ? "Tienes 1 plazo vencido"
        : `Tienes ${vencidos} plazos vencidos`
      : enCurso.length
        ? `Llevas ${enCurso.length} en curso`
        : "Todo terminado";
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
                  <Tarjeta key={s.clave} s={s} plazo={plazos[s.clave]} indice={i} alQuitar={() => quitar(s)} />
                ))}
              </ul>
            ) : (
              <p className="mt-6 px-1 text-center text-tinta-suave">{vista === "curso" ? "No tienes trámites en curso." : "Aún no has terminado ningún trámite."}</p>
            )}
          </>
        ) : (
          <Vacio />
        )}
        <p className="mt-5 px-1 text-[0.8125rem] leading-snug text-tinta-suave">Esta lista y tus conversaciones se guardan solo en este dispositivo.</p>
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

export function MisTramites({ plazos }: { plazos: Plazos }) {
  // La lista vive en el dispositivo: se dibuja ya en el navegador para no parpadear como vacía.
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (enNavegador) return <Lista plazos={plazos} />;
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="Mis trámites" />
    </div>
  );
}
