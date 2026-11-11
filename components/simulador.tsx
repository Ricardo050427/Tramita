"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Download, ThumbsUp } from "lucide-react";
import { Encabezado } from "./senal";

export type Medida = "copias" | "municipales" | "formatos";
type Totales = { requisitos: number; copias: number; municipales: number; formatos: number; constanciaExigida: number };
type Prioritario = { clave: string; nombre: string; dependencia: string; razones: string[]; acciones: string[] };
type PasoRuta = { clave: string; nombre: string; pesos: number; quitable: boolean };
type Ruta = { slug: string; nombre: string; pasos: PasoRuta[] };

const salida = [0.16, 1, 0.3, 1] as const;
const n = (x: number) => Math.round(x).toLocaleString("es-MX");
const pesos = (x: number) => x.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const visitas = (x: number) => `${x} ${x === 1 ? "visita" : "visitas"}`;
const VOTOS = "tramita:votos";
const MAX_VOTOS = 3;

const MEDIDAS: { id: Medida; nombre: string; articulo: string; detalle: string }[] = [
  { id: "copias", nombre: "Sin copias simples", articulo: "Art. 19, fr. IV", detalle: "Muestras el original o el documento digital." },
  {
    id: "municipales",
    nombre: "Sin pedir lo que el Ayuntamiento ya tiene",
    articulo: "Art. 19, fr. I",
    detalle: "Constancias, cartas de no adeudo y licencias se consultan por dentro.",
  },
  { id: "formatos", nombre: "Formato único publicado", articulo: "Art. 19, fr. XV", detalle: "Cada trámite con su solicitud lista para descargar." },
];

// Un número que corre hacia su nuevo valor cuando cambia.
function Cifra({ valor, className }: { valor: number; className?: string }) {
  const reducir = useReducedMotion();
  const [visto, setVisto] = useState(valor);
  const previo = useRef(valor);
  useEffect(() => {
    if (reducir) {
      previo.current = valor;
      return;
    }
    const control = animate(previo.current, valor, { duration: 0.7, ease: salida, onUpdate: setVisto });
    previo.current = valor;
    return () => control.stop();
  }, [valor, reducir]);
  return <span className={className}>{n(reducir ? valor : visto)}</span>;
}

const suscribir = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  window.addEventListener("tramita:votos", aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener("tramita:votos", aviso);
  };
};
const crudoVotados = () => {
  try {
    return localStorage.getItem(VOTOS) ?? "[]";
  } catch {
    return "[]";
  }
};

export function Simulador({ totales, prioritarios, rutas }: { totales: Totales; prioritarios: Prioritario[]; rutas: Ruta[] }) {
  const [activas, setActivas] = useState<Medida[]>([]);
  const [votos, setVotos] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const votados = JSON.parse(useSyncExternalStore(suscribir, crudoVotados, () => "[]")) as string[];
  const con = (m: Medida) => activas.includes(m);

  useEffect(() => {
    const control = new AbortController();
    fetch("/api/votos", { signal: control.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setVotos(d.votos))
      .catch(() => undefined);
    return () => control.abort();
  }, []);

  const filas = [
    { nombre: "Requisitos en el catálogo", hoy: totales.requisitos, ahora: totales.requisitos - (con("municipales") ? totales.municipales : 0) },
    { nombre: "Copias simples que hay que sacar", hoy: totales.copias, ahora: con("copias") ? 0 : totales.copias },
    { nombre: "Documentos que el Ayuntamiento ya tiene y aun así te pide", hoy: totales.municipales, ahora: con("municipales") ? 0 : totales.municipales },
    { nombre: "Trámites con formato que no está publicado", hoy: totales.formatos, ahora: con("formatos") ? 0 : totales.formatos },
  ];
  const mensaje = !activas.length
    ? "Así quedaría Hermosillo con la ley"
    : con("municipales")
      ? `${n(totales.constanciaExigida)} trámites dejan de pedirte una constancia`
      : con("copias")
        ? `${n(totales.copias)} copias menos`
        : `${n(totales.formatos)} formatos publicados`;

  async function votar(clave: string) {
    if (votados.includes(clave) || votados.length >= MAX_VOTOS) return;
    setError("");
    const r = await fetch("/api/votos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave }) }).catch(() => null);
    if (!r?.ok) {
      setError("No pude guardar tu voto. Inténtalo de nuevo.");
      return;
    }
    setVotos((v) => ({ ...v, [clave]: (v[clave] ?? 0) + 1 }));
    try {
      localStorage.setItem(VOTOS, JSON.stringify([...votados, clave]));
    } catch {}
    window.dispatchEvent(new Event("tramita:votos"));
  }

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={mensaje} volver="/vigila" />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        <p className="px-1 text-[1.125rem] leading-relaxed">
          La Ley Nacional para Eliminar Trámites Burocráticos obliga al Ayuntamiento a entregar cada enero y julio una <strong>Agenda de Simplificación</strong>{" "}
          (artículo 21). Activa las medidas que la ley ya ordena y mira cuánto se ahorraría la gente.
        </p>

        <section aria-labelledby="medidas" className="mt-5 rounded-[14px] bg-panel px-4 py-1">
          <h2 id="medidas" className="sr-only">
            Medidas de la ley
          </h2>
          {MEDIDAS.map((m) => {
            const activa = con(m.id);
            return (
              <button
                key={m.id}
                type="button"
                role="switch"
                aria-checked={activa}
                onClick={() => setActivas((a) => (activa ? a.filter((x) => x !== m.id) : [...a, m.id]))}
                className="flex w-full items-center gap-4 border-t border-linea py-3.5 text-left first:border-t-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-bold">{m.nombre}</span>
                  <span className="mt-0.5 block text-[0.9375rem] leading-snug text-tinta-suave">
                    {m.articulo}. {m.detalle}
                  </span>
                </span>
                <span className={`relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200 ${activa ? "bg-senal" : "bg-linea"}`} aria-hidden>
                  <motion.span className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-panel shadow-[0_1px_3px_rgb(21_18_14/0.3)]" animate={{ x: activa ? 20 : 0 }} transition={{ duration: 0.22, ease: salida }}>
                    {activa ? <Check className="size-3.5 text-tinta" strokeWidth={3.5} /> : null}
                  </motion.span>
                </span>
              </button>
            );
          })}
        </section>

        <section aria-labelledby="catalogo" className="mt-8 px-1">
          <h2 id="catalogo" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Los 196 trámites, hoy y con la ley
          </h2>
          <ul className="mt-3">
            {filas.map((f) => {
              const cambio = f.ahora !== f.hoy;
              return (
                <li key={f.nombre} className="flex items-end justify-between gap-4 border-t border-linea py-3">
                  <span className="min-w-0 leading-snug">{f.nombre}</span>
                  <span className="shrink-0 text-right">
                    <Cifra valor={f.ahora} className={`block text-[1.75rem] leading-none font-bold tracking-[-0.02em] ${cambio ? "text-bien" : ""}`} />
                    <span className={`mt-1 block text-sm text-tinta-suave ${cambio ? "line-through decoration-error/70" : "invisible"}`}>hoy {n(f.hoy)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[0.9375rem] leading-snug text-tinta-suave">
            La constancia de no adeudo municipal la exigen <strong className="text-tinta">{n(totales.constanciaExigida)} trámites</strong>, y la emite el mismo Ayuntamiento.
          </p>
        </section>

        <section aria-labelledby="rutas-simples" className="mt-10 px-1">
          <h2 id="rutas-simples" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Tu proyecto, antes y después
          </h2>
          {rutas.map((r) => {
            const quedan = r.pasos.filter((p) => !(con("municipales") && p.quitable));
            const total = (lista: PasoRuta[]) => lista.reduce((s, p) => s + p.pesos, 0);
            return (
              <div key={r.slug} className="mt-4 rounded-[14px] bg-panel p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/ruta/${r.slug}`} className="leading-snug font-bold underline">
                    {r.nombre}
                  </Link>
                  <span className="shrink-0 text-[0.9375rem] font-bold">
                    <Cifra valor={quedan.length} /> de {r.pasos.length} trámites
                  </span>
                </div>
                <ol className="mt-2 space-y-1">
                  {r.pasos.map((p) => {
                    const fuera = con("municipales") && p.quitable;
                    return (
                      <li key={p.clave} className={`flex items-start gap-2 text-[0.9375rem] leading-snug transition-opacity duration-300 ${fuera ? "opacity-55" : ""}`}>
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${fuera ? "bg-linea" : "bg-tinta"}`} aria-hidden />
                        <span className={fuera ? "line-through decoration-error/70" : ""}>
                          {p.nombre}
                          {fuera ? <span className="sr-only"> (ya no haría falta)</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {total(r.pasos) !== total(quedan) ? (
                  <p className="mt-2 text-[0.9375rem] font-bold text-bien">
                    {pesos(total(r.pasos) - total(quedan))} menos en trámites previos y {visitas(r.pasos.length - quedan.length)} menos.
                  </p>
                ) : con("municipales") && quedan.length < r.pasos.length ? (
                  <p className="mt-2 text-[0.9375rem] font-bold text-bien">{visitas(r.pasos.length - quedan.length)} menos.</p>
                ) : null}
              </div>
            );
          })}
          {!con("municipales") ? <p className="mt-2 text-[0.9375rem] text-tinta-suave">Activa «Sin pedir lo que el Ayuntamiento ya tiene» para ver qué pasos desaparecen.</p> : null}
        </section>

        <section aria-labelledby="prioridad" className="mt-10 px-1">
          <h2 id="prioridad" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Por dónde empezar
          </h2>
          <p className="mt-1.5 leading-snug text-tinta-suave">
            Ordenados con los criterios del artículo 21: los más exigidos, los de mayor costo para la gente, los presenciales y los que atienden a grupos vulnerables. Vota cuáles
            simplificar primero (hasta {MAX_VOTOS}): es la consulta pública que pide el artículo 22.
          </p>
          {error ? (
            <p role="alert" className="mt-2 font-bold text-error">
              {error}
            </p>
          ) : null}
          <ol className="mt-3">
            {prioritarios.map((p, i) => {
              const votado = votados.includes(p.clave);
              return (
                <li key={p.clave} className="border-t border-linea py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tinta text-[0.875rem] font-bold text-panel">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/tramite/${p.clave}`} className="leading-snug font-bold underline">
                        {p.nombre}
                      </Link>
                      <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">{p.razones.join(" · ")}</p>
                      <details className="group mt-1">
                        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-[0.9375rem] font-bold underline [&::-webkit-details-marker]:hidden">
                          Qué cambiaría
                          <ArrowRight className="size-4 transition-transform duration-200 group-open:rotate-90" aria-hidden />
                        </summary>
                        <ul className="list-disc space-y-1 pb-1 pl-5 text-[0.9375rem] leading-snug marker:text-senal-oscura">
                          {p.acciones.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                    <button
                      type="button"
                      onClick={() => void votar(p.clave)}
                      disabled={votado || votados.length >= MAX_VOTOS}
                      aria-pressed={votado}
                      aria-label={votado ? `Ya votaste por ${p.nombre}` : `Votar por simplificar ${p.nombre}`}
                      className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-[10px] border-2 px-2 transition-[background-color,border-color,transform] duration-150 active:scale-95 disabled:cursor-default ${votado ? "border-senal bg-senal text-tinta" : "border-linea bg-panel disabled:opacity-50"}`}
                    >
                      <ThumbsUp className="size-4" aria-hidden />
                      <span className="text-sm font-bold">{n(votos[p.clave] ?? 0)}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {votados.length ? (
            <p className="mt-2 text-[0.9375rem] font-medium text-bien" role="status">
              Gracias. {votados.length === MAX_VOTOS ? "Ya usaste tus votos." : `Te ${MAX_VOTOS - votados.length === 1 ? "queda 1 voto" : `quedan ${MAX_VOTOS - votados.length} votos`}.`}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="agenda" className="mt-10 rounded-[14px] bg-tinta p-5 text-panel">
          <h2 id="agenda" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            La Agenda, lista para enero
          </h2>
          <p className="mt-1.5 leading-snug text-panel/80">
            Una propuesta con la estructura del artículo 21: diagnóstico, acciones con su fundamento, los 15 trámites prioritarios, el resultado de la consulta y un calendario. Lista
            para que el Enlace de Simplificación la presente del 1 al 15 de enero de 2027.
          </p>
          <a
            href="/api/agenda"
            download
            className="mt-4 flex min-h-13 items-center justify-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.98]"
          >
            <Download className="size-5" aria-hidden />
            Descargar la propuesta de Agenda (PDF)
          </a>
        </section>

        <p className="mt-5 px-1 text-sm leading-snug text-tinta-suave">
          Simulación con los datos públicos del catálogo municipal. Las licencias y permisos siguen siendo necesarios; con la ley solo deja de pedirse el papel que el Ayuntamiento
          ya tiene. Es una propuesta ciudadana, no un documento oficial.
        </p>
      </main>
    </div>
  );
}
