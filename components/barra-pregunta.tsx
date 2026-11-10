"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUp, FileText, Mic, Paperclip, Square, X } from "lucide-react";
import { buscar } from "@/lib/buscar";
import type { Adjunto, EntradaIndice } from "@/lib/tipos";

const MAX_BYTES = 3 * 1024 * 1024;
const salida = [0.16, 1, 0.3, 1] as const;

function aBase64(blob: Blob) {
  return new Promise<string>((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(",")[1]);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(blob);
  });
}

async function comprimirImagen(archivo: File): Promise<Blob> {
  try {
    const mapa = await createImageBitmap(archivo);
    const escala = Math.min(1, 1600 / Math.max(mapa.width, mapa.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(mapa.width * escala);
    lienzo.height = Math.round(mapa.height * escala);
    lienzo.getContext("2d")!.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
    return await new Promise((resolver) => lienzo.toBlob((b) => resolver(b ?? archivo), "image/jpeg", 0.82));
  } catch {
    return archivo;
  }
}

function usarDictado(alTexto: (t: string) => void, alError: (m: string) => void) {
  const [estado, setEstado] = useState<"libre" | "grabando" | "transcribiendo">("libre");
  const [segundos, setSegundos] = useState(0);
  const barras = useRef<(HTMLSpanElement | null)[]>([]);
  const grabadora = useRef<MediaRecorder | null>(null);
  const cancelado = useRef(false);
  const limpiar = useRef<() => void>(() => {});

  async function iniciar() {
    let flujo: MediaStream;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alError("No tengo permiso para usar el micrófono. Actívalo en tu navegador o escribe tu pregunta.");
      return;
    }

    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const r = new MediaRecorder(flujo, mime ? { mimeType: mime } : undefined);
    const trozos: Blob[] = [];
    r.ondataavailable = (e) => trozos.push(e.data);

    const audio = new AudioContext();
    const analizador = audio.createAnalyser();
    analizador.fftSize = 64;
    audio.createMediaStreamSource(flujo).connect(analizador);
    const niveles = new Uint8Array(analizador.frequencyBinCount);
    let cuadro = 0;
    const pintar = () => {
      analizador.getByteFrequencyData(niveles);
      barras.current.forEach((b, i) => {
        if (b) b.style.transform = `scaleY(${Math.max(0.12, niveles[i + 2] / 255)})`;
      });
      cuadro = requestAnimationFrame(pintar);
    };
    pintar();

    const inicio = Date.now();
    const reloj = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      if (s >= 60) r.stop();
    }, 250);

    limpiar.current = () => {
      cancelAnimationFrame(cuadro);
      clearInterval(reloj);
      flujo.getTracks().forEach((p) => p.stop());
      void audio.close();
    };

    r.onstop = async () => {
      limpiar.current();
      if (cancelado.current) {
        setEstado("libre");
        return;
      }
      setEstado("transcribiendo");
      try {
        const blob = new Blob(trozos, { type: r.mimeType });
        const res = await fetch("/api/transcribir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: r.mimeType, datos: await aBase64(blob) }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (json.texto) alTexto(json.texto);
        else alError("No alcancé a escucharte. Intenta de nuevo, un poco más cerca del micrófono.");
      } catch (e) {
        alError(e instanceof Error && e.message ? e.message : "No pude transcribir el audio. Escribe tu pregunta o intenta de nuevo.");
      }
      setEstado("libre");
    };

    cancelado.current = false;
    grabadora.current = r;
    r.start();
    setSegundos(0);
    setEstado("grabando");
    navigator.vibrate?.(12);
  }

  function detener(cancelar: boolean) {
    cancelado.current = cancelar;
    grabadora.current?.stop();
  }

  useEffect(() => () => limpiar.current(), []);

  return { estado, segundos, barras, iniciar, detener };
}

export function BarraPregunta({
  indice,
  ocupado,
  alEnviar,
  embebida,
}: {
  indice: EntradaIndice[];
  ocupado: boolean;
  alEnviar: (texto: string, adjuntos: Adjunto[]) => void;
  /** Dentro de un panel propio, en lugar de flotar sobre la barra de secciones. */
  embebida?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [enfocada, setEnfocada] = useState(false);
  const [error, setError] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const selector = useRef<HTMLInputElement>(null);

  const dictado = usarDictado((t) => alEnviar(t, []), setError);

  const consulta = useDeferredValue(texto);
  const coincidencias = useMemo(() => (consulta.trim().length >= 2 ? buscar(consulta, indice, 4) : []), [consulta, indice]);
  const verPrediccion = enfocada && coincidencias.length > 0;
  const puedeEnviar = (texto.trim().length > 0 || adjuntos.length > 0) && !ocupado;

  useEffect(() => {
    const c = campo.current;
    if (!c) return;
    c.style.height = "auto";
    c.style.height = `${Math.min(c.scrollHeight, 132)}px`;
  }, [texto]);

  async function agregarArchivos(archivos: File[]) {
    setError("");
    let usados = adjuntos.reduce((s, a) => s + (a.datos.length * 3) / 4, 0);
    const nuevos: Adjunto[] = [];
    for (const archivo of archivos.slice(0, 3 - adjuntos.length)) {
      const esImagen = archivo.type.startsWith("image/");
      if (!esImagen && !["application/pdf", "text/plain"].includes(archivo.type)) {
        setError(`No puedo leer «${archivo.name}». Usa una imagen, PDF o archivo de texto.`);
        continue;
      }
      const blob = esImagen ? await comprimirImagen(archivo) : archivo;
      if (usados + blob.size > MAX_BYTES) {
        setError(`«${archivo.name}» es muy pesado. Entre todos los archivos pueden sumar hasta 3 MB.`);
        continue;
      }
      usados += blob.size;
      nuevos.push({ nombre: archivo.name, mime: blob.type || archivo.type, datos: await aBase64(blob) });
    }
    if (nuevos.length) setAdjuntos((a) => [...a, ...nuevos]);
  }

  function enviar() {
    if (!puedeEnviar) return;
    alEnviar(texto.trim(), adjuntos);
    setTexto("");
    setAdjuntos([]);
    setError("");
    campo.current?.blur();
  }

  return (
    <div
      className={embebida ? "shrink-0 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]" : "dock-pregunta pointer-events-none sticky z-20 bg-linear-to-t from-piso from-55% to-transparent px-3 pt-7 pb-1"}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void agregarArchivos([...e.dataTransfer.files]);
      }}
    >
      <div className="pointer-events-auto relative mx-auto max-w-2xl">
        <AnimatePresence>
          {verPrediccion ? (
            <motion.ul
              key="prediccion"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: salida }}
              className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-[14px] border border-linea bg-panel shadow-[0_12px_32px_-14px_rgb(21_18_14/0.5)]"
            >
              {coincidencias.map(({ item }) => (
                <li key={item.c} className="border-b border-linea last:border-b-0">
                  <Link href={`/tramite/${item.c}`} className="fila-senal flex min-h-13 items-center gap-3 px-4 py-2.5" onPointerDown={(e) => e.preventDefault()}>
                    <span className="min-w-0 flex-1 leading-snug font-medium">{item.n}</span>
                    <ArrowRight className="flecha size-5 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        {error ? (
          <p role="alert" className="mb-2 px-1 text-[0.9375rem] leading-snug text-error">
            {error}
          </p>
        ) : null}

        <div className="rounded-[16px] bg-panel shadow-[0_6px_20px_-10px_rgb(21_18_14/0.3)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1.5px_var(--tinta),0_6px_20px_-10px_rgb(21_18_14/0.3)]">
          {adjuntos.length ? (
            <>
              <ul className="flex flex-wrap gap-2 px-3 pt-3">
                {adjuntos.map((a, i) => (
                  <motion.li
                    key={`${a.nombre}-${i}`}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: salida }}
                    className="flex max-w-full items-center gap-2 rounded-[8px] bg-piso py-1 pr-1 pl-2.5"
                  >
                    <FileText className="size-4 shrink-0" aria-hidden />
                    <span className="max-w-40 truncate text-sm">{a.nombre}</span>
                    <button type="button" aria-label={`Quitar ${a.nombre}`} onClick={() => setAdjuntos((l) => l.filter((_, j) => j !== i))} className="grid size-8 place-items-center">
                      <X className="size-4" aria-hidden />
                    </button>
                  </motion.li>
                ))}
              </ul>
              <p className="px-3.5 pt-1.5 text-sm text-tinta-suave">Evita documentos con datos personales reales.</p>
            </>
          ) : null}

          {dictado.estado === "libre" ? (
            <div className="flex items-end gap-1 p-1.5">
              <button type="button" aria-label="Adjuntar imagen o archivo" onClick={() => selector.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-[10px] text-tinta-suave transition-transform duration-150 active:scale-90">
                <Paperclip className="size-5" aria-hidden />
              </button>
              <input
                ref={selector}
                type="file"
                multiple
                accept="image/*,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => {
                  void agregarArchivos([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
              <textarea
                ref={campo}
                rows={1}
                value={texto}
                placeholder="Escribe o dicta tu pregunta"
                aria-label="Tu pregunta"
                onChange={(e) => setTexto(e.target.value)}
                onFocus={() => setEnfocada(true)}
                onBlur={() => setEnfocada(false)}
                onPaste={(e) => {
                  const archivos = [...e.clipboardData.files];
                  if (archivos.length) {
                    e.preventDefault();
                    void agregarArchivos(archivos);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[1.0625rem] leading-6 outline-none placeholder:text-tinta-suave"
              />
              <AnimatePresence mode="popLayout" initial={false}>
                {texto.trim() || adjuntos.length ? (
                  <motion.button
                    key="enviar"
                    type="button"
                    aria-label="Enviar pregunta"
                    disabled={!puedeEnviar}
                    onClick={enviar}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.16, ease: salida }}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-senal disabled:opacity-50"
                  >
                    <ArrowUp className="size-[1.375rem]" strokeWidth={2.5} aria-hidden />
                  </motion.button>
                ) : (
                  <motion.button
                    key="microfono"
                    type="button"
                    aria-label="Dictar por voz"
                    disabled={ocupado}
                    onClick={() => void dictado.iniciar()}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.16, ease: salida }}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-senal text-tinta disabled:opacity-50"
                  >
                    <Mic className="size-[1.375rem]" aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-1.5" aria-live="polite">
              <button type="button" aria-label="Cancelar dictado" disabled={dictado.estado !== "grabando"} onClick={() => dictado.detener(true)} className="grid size-11 shrink-0 place-items-center disabled:opacity-40">
                <X className="size-6" aria-hidden />
              </button>
              {dictado.estado === "grabando" ? (
                <>
                  <div className="flex h-11 flex-1 items-center justify-center gap-[3px]" aria-label="Grabando">
                    {Array.from({ length: 22 }, (_, i) => (
                      <span
                        key={i}
                        ref={(n) => {
                          dictado.barras.current[i] = n;
                        }}
                        className="h-9 w-[3px] origin-center scale-y-[0.12] rounded-full bg-senal-oscura"
                      />
                    ))}
                  </div>
                  <span className="w-10 text-right">0:{String(dictado.segundos).padStart(2, "0")}</span>
                  <button type="button" aria-label="Terminar y enviar" onClick={() => dictado.detener(false)} className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-senal">
                    <Square className="size-5 fill-tinta" aria-hidden />
                  </button>
                </>
              ) : (
                <p className="min-h-11 flex-1 py-2.5 font-medium">Escribiendo lo que dijiste…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
