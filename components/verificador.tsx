"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Camera,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Copy,
  Phone,
  QrCode,
  RotateCcw,
  Share2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { Encabezado } from "./senal";
import { Reportar } from "./reportar";
import { Sagui } from "./sagui";
import { aBase64, comprimirImagen } from "./barra-pregunta";
import { DENUNCIA, FECHA_CATALOGO, LEY, LIGA_LEY, SITIO, fechaLegible, type Fundamento } from "@/lib/ley";
import { ETIQUETAS, type Hallazgo, type ResultadoVerificacion, type Veredicto } from "@/lib/veredictos";
import type { Tramite } from "@/lib/tipos";

const EJEMPLOS = [
  ["Copia de INE", "Copia de la INE"],
  ["No adeudo", "Carta de no adeudo"],
  ["Cobro de $500", "Me cobraron $500 por el formato"],
  ["Regresar en 30 días", "Que regrese en 30 días"],
];
const salida = [0.16, 1, 0.3, 1] as const;

type Grupo = "bien" | "aviso" | "mal";
const TONO: Record<Veredicto, { grupo: Grupo; Icono: LucideIcon }> = {
  oficial: { grupo: "bien", Icono: Check },
  simplificar: { grupo: "aviso", Icono: TriangleAlert },
  revisar: { grupo: "aviso", Icono: CircleHelp },
  no_publicado: { grupo: "mal", Icono: X },
  cobro: { grupo: "mal", Icono: CircleDollarSign },
  plazo: { grupo: "mal", Icono: Clock },
};
const CLASES: Record<Grupo, { texto: string; fondo: string; barra: string }> = {
  bien: { texto: "text-bien", fondo: "bg-bien-fondo", barra: "bg-bien" },
  aviso: { texto: "text-aviso", fondo: "bg-aviso-fondo", barra: "bg-[#c98a1b]" },
  mal: { texto: "text-error", fondo: "bg-error-fondo", barra: "bg-error" },
};

function veredictoGeneral(hallazgos: Hallazgo[]) {
  const mal = hallazgos.filter((h) => TONO[h.veredicto].grupo === "mal").length;
  const aviso = hallazgos.filter((h) => TONO[h.veredicto].grupo === "aviso").length;
  if (mal) return `${mal} ${mal === 1 ? "cosa no cuadra" : "cosas no cuadran"} con la ficha oficial`;
  if (aviso) return "Está en la ficha, con detalles por revisar";
  return "Todo coincide con la ficha oficial";
}

function Ley({ fundamentos }: { fundamentos: Fundamento[] }) {
  return (
    <details className="group mt-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[0.9375rem] font-bold underline [&::-webkit-details-marker]:hidden">
        Qué dice la ley
        <ArrowRight className="size-4 transition-transform duration-200 group-open:rotate-90" aria-hidden />
      </summary>
      <div className="space-y-3 pb-1">
        {fundamentos.map((f) => (
          <figure key={f.articulo}>
            <figcaption className="text-sm font-bold">
              {LEY}, {f.articulo.toLowerCase()}
            </figcaption>
            <blockquote className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave italic">{f.texto}</blockquote>
          </figure>
        ))}
        <a href={LIGA_LEY} target="_blank" rel="noreferrer" className="inline-block text-sm underline">
          Leer la ley completa (Cámara de Diputados)
        </a>
      </div>
    </details>
  );
}

function Resultado({ tramite, resultado, alEditar, alReiniciar }: { tramite: Tramite; resultado: ResultadoVerificacion; alEditar: () => void; alReiniciar: () => void }) {
  const reducir = useReducedMotion();
  const [copiado, setCopiado] = useState(false);
  const { hallazgos, faltantes } = resultado;
  const hayProblema = hallazgos.some((h) => TONO[h.veredicto].grupo !== "bien");
  const sugeridos = [...new Set(hallazgos.flatMap((h) => (h.reporte ? [h.reporte] : [])))];
  const frase = `¿Me podría indicar en qué norma se basa este requisito? No aparece en la ficha oficial del trámite ${tramite.clave}, «${tramite.nombre}».`;

  // Un resumen en texto para mandarlo por WhatsApp o enseñarlo: sin datos de la persona.
  async function compartir() {
    const marca = { bien: "Bien", aviso: "Revisar", mal: "No cuadra" } as const;
    const texto = [
      `Revisé con Tramita lo que me pidieron para «${tramite.nombre}»:`,
      ...hallazgos.map((h) => `• ${marca[TONO[h.veredicto].grupo]}: ${h.dicho} (${ETIQUETAS[h.veredicto].toLowerCase()})`),
      `Requisitos oficiales: ${SITIO}/pase/${tramite.clave}`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    } catch {}
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(frase);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {}
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[14px] border border-linea bg-panel px-4 pt-4 pb-2" aria-labelledby="hallazgos">
        <h2 id="hallazgos" className="text-lg font-bold">
          Lo que te pidieron, punto por punto
        </h2>
        <div className="mt-3 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden>
          {hallazgos.map((h, i) => (
            <motion.span
              key={i}
              className={`h-full flex-1 origin-left rounded-full ${CLASES[TONO[h.veredicto].grupo].barra}`}
              initial={reducir ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.12, ease: salida }}
            />
          ))}
        </div>
        <ul className="mt-2">
          {hallazgos.map((h, i) => {
            const { grupo, Icono } = TONO[h.veredicto];
            const c = CLASES[grupo];
            return (
              <motion.li
                key={i}
                className="border-t border-linea py-4 first:border-t-0"
                initial={reducir ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.12, ease: salida }}
              >
                <div className="flex items-start gap-3">
                  <motion.span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${c.fondo}`}
                    initial={reducir ? false : { scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.42, delay: 0.32 + i * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <Icono className={`size-5 ${c.texto}`} strokeWidth={2.6} aria-hidden />
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug font-bold">«{h.dicho}»</p>
                    <p className={`mt-0.5 text-[0.9375rem] font-bold ${c.texto}`}>{ETIQUETAS[h.veredicto]}</p>
                    <p className="mt-1 leading-snug">{h.detalle}</p>
                    {h.fundamentos.length ? <Ley fundamentos={h.fundamentos} /> : null}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>

      {hayProblema ? (
        <section className="rounded-[14px] border-2 border-tinta bg-panel p-4" aria-labelledby="que-hacer">
          <h2 id="que-hacer" className="text-lg font-bold">
            Qué puedes hacer
          </h2>
          <ol className="mt-3 space-y-5">
            <li>
              <p className="font-bold">Muestra el pase oficial en la ventanilla</p>
              <p className="mt-0.5 leading-snug text-tinta-suave">Trae los requisitos, el costo y el plazo publicados, con un código que lleva a la fuente.</p>
              <Link
                href={`/pase/${tramite.clave}`}
                className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]"
              >
                <QrCode className="size-5" aria-hidden />
                Abrir el pase de este trámite
              </Link>
            </li>
            <li>
              <p className="font-bold">Pregunta con respeto en qué se basa</p>
              <p className="mt-1 rounded-[10px] bg-piso px-3 py-2.5 leading-snug">{frase}</p>
              <button type="button" onClick={copiar} className="mt-1 flex min-h-11 items-center gap-1.5 font-bold underline">
                {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copiado ? "Copiada" : "Copiar la frase"}
              </button>
            </li>
            {sugeridos.length ? (
              <li>
                <p className="font-bold">Repórtalo sin dar tu nombre</p>
                <p className="mt-0.5 mb-3 leading-snug text-tinta-suave">Tu reporte se suma al observatorio público y muestra dónde se repiten los problemas.</p>
                <Reportar clave={tramite.clave} sugeridos={sugeridos} origen="verificador" />
              </li>
            ) : null}
            <li>
              <p className="font-bold">Si te condicionan el trámite o te piden dinero sin recibo, denúncialo</p>
              <p className="mt-0.5 leading-snug text-tinta-suave">
                La Contraloría Municipal recibe denuncias contra servidores públicos. Por ley, ninguna oficina puede negarse a recibir tu queja.
              </p>
              <div className="mt-1 flex flex-wrap gap-x-5">
                <Link href={`/tramite/${DENUNCIA.clave}`} className="flex min-h-11 items-center gap-1.5 font-bold underline">
                  Cómo presentar la denuncia
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a href={`tel:${DENUNCIA.telefono.replace(/\D/g, "")}`} className="flex min-h-11 items-center gap-1.5 underline">
                  <Phone className="size-4" aria-hidden />
                  {DENUNCIA.telefono}
                </a>
              </div>
            </li>
          </ol>
        </section>
      ) : null}

      {faltantes.length ? (
        <details className="group rounded-[14px] border border-linea bg-panel px-4 py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
            {faltantes.length === 1 ? "1 requisito oficial que no mencionaste" : `${faltantes.length} requisitos oficiales que no mencionaste`}
            <ArrowRight className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-90" aria-hidden />
          </summary>
          <ul className="pb-3">
            {faltantes.map((f, i) => (
              <li key={i} className="border-t border-linea py-2 leading-snug">
                {f}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={compartir}
          className="flex min-h-12 items-center gap-2 rounded-[10px] bg-tinta px-4 font-bold text-panel transition-transform duration-150 active:scale-[0.97]"
        >
          <Share2 className="size-[1.125rem]" aria-hidden />
          Compartir resultado
        </button>
        <button type="button" onClick={alEditar} className="flex min-h-12 items-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold transition-transform duration-150 active:scale-[0.97]">
          Corregir lo que escribí
        </button>
        <button type="button" onClick={alReiniciar} className="flex min-h-12 items-center gap-2 px-2 font-bold underline">
          <RotateCcw className="size-4" aria-hidden />
          Revisar otra cosa
        </button>
      </div>

      <p className="px-1 text-sm leading-snug text-tinta-suave">
        Comparado con la ficha oficial que publica el Ayuntamiento, consultada el {fechaLegible(FECHA_CATALOGO)}.{" "}
        {resultado.porIA
          ? "Sagui separó lo que escribiste con IA; el veredicto sale de reglas fijas con la ficha y la ley."
          : "Esta vez se comparó por palabras, sin IA."}{" "}
        No es una resolución oficial: si algo no aparece, pide que te indiquen la norma que lo respalda.
      </p>
    </div>
  );
}

export function Verificador({ tramite }: { tramite: Tramite }) {
  const [texto, setTexto] = useState("");
  const [cobro, setCobro] = useState("");
  const [foto, setFoto] = useState<{ mime: string; datos: string; vista: string } | null>(null);
  const [estado, setEstado] = useState<"libre" | "revisando" | "listo">("libre");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const total = tramite.requisitos.length;

  const mensaje =
    estado === "revisando" ? "Comparando con la ficha oficial…" : estado === "listo" && resultado ? veredictoGeneral(resultado.hallazgos) : "¿Te pidieron algo de más?";

  function agregar(ejemplo: string) {
    setTexto((t) => (t.trim() ? `${t.trim()}\n${ejemplo}` : ejemplo));
    campo.current?.focus();
  }

  async function alElegirFoto(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido || !elegido.type.startsWith("image/")) return;
    const comprimida = await comprimirImagen(elegido);
    setFoto({ mime: comprimida.type || "image/jpeg", datos: await aBase64(comprimida), vista: URL.createObjectURL(comprimida) });
    setError("");
  }

  async function revisar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() && !foto && !Number(cobro)) {
      setError("Escribe o toma foto de lo que te pidieron.");
      return;
    }
    setEstado("revisando");
    setError("");
    try {
      const r = await fetch("/api/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: tramite.clave, texto, cobro: Number(cobro.replace(/[^\d.]/g, "")) || 0, foto: foto && { mime: foto.mime, datos: foto.datos } }),
      });
      const datos = await r.json().catch(() => ({ error: "No pude revisar ahora. Inténtalo de nuevo." }));
      if (!r.ok || datos.error) throw new Error(datos.error ?? "No pude revisar ahora. Inténtalo de nuevo.");
      setResultado(datos);
      setEstado("listo");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude revisar ahora. Inténtalo de nuevo.");
      setEstado("libre");
    }
  }

  function reiniciar() {
    setTexto("");
    setCobro("");
    setFoto(null);
    setResultado(null);
    setEstado("libre");
  }

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={mensaje} volver={`/tramite/${tramite.clave}`} />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        {estado === "listo" && resultado ? (
          <Resultado tramite={tramite} resultado={resultado} alEditar={() => setEstado("libre")} alReiniciar={reiniciar} />
        ) : (
          <form onSubmit={revisar} className="rounded-[14px] border border-linea bg-panel p-4">
            <h2 className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em] text-balance">Cuéntame qué te pidieron en la ventanilla</h2>
            <p className="mt-1.5 leading-snug text-tinta-suave">
              Lo comparo con {total ? `los ${total} requisitos` : "lo"} y el costo que publica la ficha oficial de «{tramite.nombre}».
            </p>

            <label htmlFor="pedido" className="mt-5 block font-bold">
              Lo que te pidieron o te dijeron
            </label>
            <textarea
              id="pedido"
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={1200}
              placeholder="Por ejemplo: copia de la INE, una carta de no adeudo y $300 por el formato"
              className="mt-1.5 w-full resize-none rounded-[10px] border-2 border-linea bg-panel px-3 py-2.5 text-base leading-snug transition-colors duration-150 placeholder:text-tinta-suave focus:border-tinta"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EJEMPLOS.map(([etiqueta, ejemplo]) => (
                <button
                  key={etiqueta}
                  type="button"
                  onClick={() => agregar(ejemplo)}
                  aria-label={`Agregar: ${ejemplo}`}
                  className="min-h-10 rounded-full bg-piso px-3.5 text-[0.9375rem] font-medium transition-transform duration-150 active:scale-[0.96]"
                >
                  + {etiqueta}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <input ref={archivo} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void alElegirFoto(e.target.files)} />
              {foto ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.vista} alt="Foto de lo que te pidieron" className="size-16 rounded-[10px] border border-linea object-cover" />
                  <button type="button" onClick={() => setFoto(null)} className="flex min-h-11 items-center gap-1.5 font-bold underline">
                    <X className="size-4" aria-hidden />
                    Quitar foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => archivo.current?.click()}
                  className="flex min-h-12 items-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold transition-transform duration-150 active:scale-[0.97]"
                >
                  <Camera className="size-5" aria-hidden />
                  Tomar foto de la lista
                </button>
              )}
            </div>

            <label htmlFor="cobro" className="mt-5 block font-bold">
              ¿Te cobraron algo? <span className="font-normal text-tinta-suave">(opcional)</span>
            </label>
            <div className="mt-1.5 flex min-h-12 w-44 items-center rounded-[10px] border-2 border-linea bg-panel px-3 transition-colors duration-150 focus-within:border-tinta">
              <span className="font-bold text-tinta-suave" aria-hidden>
                $
              </span>
              <input
                id="cobro"
                value={cobro}
                onChange={(e) => setCobro(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent pl-1.5 text-base outline-none placeholder:text-tinta-suave"
              />
            </div>

            {error ? (
              <p role="alert" className="mt-4 font-bold text-error">
                {error}
              </p>
            ) : null}

            {estado === "revisando" ? (
              <div className="mt-5 flex min-h-13 items-center gap-3" aria-live="polite">
                <Sagui estado="piensa" className="size-12 shrink-0" />
                <p className="font-bold">Comparando con {total ? `los ${total} requisitos oficiales` : "la ficha oficial"}…</p>
              </div>
            ) : (
              <button
                type="submit"
                className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-[10px] bg-tinta px-4 font-bold text-panel transition-transform duration-150 active:scale-[0.98]"
              >
                Comparar con la ficha oficial
                <ArrowRight className="size-5" aria-hidden />
              </button>
            )}
            <p className="mt-3 text-sm leading-snug text-tinta-suave">No escribas nombres ni datos personales. La foto solo se usa para leer la lista y no se guarda.</p>
          </form>
        )}
      </main>
    </div>
  );
}
