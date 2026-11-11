"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, Download, ExternalLink, Maximize2, PencilLine, X } from "lucide-react";
import { BarraPregunta } from "./barra-pregunta";
import { Mensajes, useConversacion } from "./conversacion";
import { descripcionDocumento, rutaDocumento } from "./documentos";
import { esLlenable } from "@/lib/llenado";
import type { Documento, EntradaIndice } from "@/lib/tipos";

// Las páginas se dibujan en <canvas> con pdf.js: un PDF dentro de un <iframe> no se ve en Chrome de Android
// y en iPhone solo muestra la primera hoja. pdf.js se descarga hasta que alguien abre una vista previa.
type Pdf = Awaited<ReturnType<typeof import("unpdf").getDocumentProxy>>;

const salida = [0.16, 1, 0.3, 1] as const;
const SIN_INDICE: EntradaIndice[] = [];
const cargados = new Map<string, Promise<Pdf>>();

// El mismo PDF se carga una sola vez aunque se vea en la vista previa y en el visor completo.
function cargarPdf(src: string) {
  let promesa = cargados.get(src);
  if (!promesa) {
    promesa = (async () => {
      const [{ getDocumentProxy }, res] = await Promise.all([import("unpdf"), fetch(src)]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
    })();
    promesa.catch(() => cargados.delete(src));
    cargados.set(src, promesa);
  }
  return promesa;
}

function usePdf(src: string) {
  const [estado, setEstado] = useState<{ src: string; pdf?: Pdf; error?: boolean }>({ src });
  useEffect(() => {
    let vigente = true;
    cargarPdf(src).then(
      (pdf) => vigente && setEstado({ src, pdf }),
      () => vigente && setEstado({ src, error: true }),
    );
    return () => {
      vigente = false;
    };
  }, [src]);
  return estado.src === src ? estado : { src };
}

/** Una hoja del PDF. Se dibuja al acercarse a la pantalla, al ancho de su contenedor y a la densidad del dispositivo. */
function Pagina({ pdf, numero, total }: { pdf: Pdf; numero: number; total: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [proporcion, setProporcion] = useState(11 / 8.5);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    let cancelado = false;
    let tarea: { cancel: () => void; promise: Promise<unknown> } | null = null;

    async function dibujar(c: HTMLCanvasElement) {
      const pagina = await pdf.getPage(numero);
      if (cancelado) return;
      const base = pagina.getViewport({ scale: 1 });
      setProporcion(base.height / base.width);
      const ancho = c.parentElement?.clientWidth || 640;
      const vista = pagina.getViewport({ scale: (ancho / base.width) * Math.min(2, window.devicePixelRatio || 1) });
      c.width = Math.round(vista.width);
      c.height = Math.round(vista.height);
      tarea = pagina.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vista });
      await tarea.promise;
      if (!cancelado) setLista(true);
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        observador.disconnect();
        dibujar(c).catch(() => {});
      },
      { rootMargin: "600px 0px" },
    );
    observador.observe(c);
    return () => {
      cancelado = true;
      observador.disconnect();
      tarea?.cancel();
    };
  }, [pdf, numero]);

  return (
    <div className="relative overflow-hidden rounded-[3px] bg-panel shadow-[0_6px_18px_-10px_rgb(21_18_14/0.45)]" style={{ aspectRatio: `1 / ${proporcion}` }}>
      <canvas ref={lienzo} role="img" aria-label={`Página ${numero} de ${total}`} className={`block size-full transition-opacity duration-300 ${lista ? "opacity-100" : "opacity-0"}`} />
      {lista ? null : <span className="absolute inset-0 animate-pulse bg-piso/70" aria-hidden />}
    </div>
  );
}

function SinVista({ documento: d }: { documento: Documento }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-[10px] bg-panel p-5 text-center">
      <p className="leading-snug">
        <span className="block font-bold">No pude mostrar la vista previa.</span>
        <a href={rutaDocumento(d)} download={d.archivo || undefined} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-bold underline">
          <Download className="size-4" aria-hidden />
          Descargar el formato
        </a>
      </p>
    </div>
  );
}

/** Un vistazo a la primera hoja dentro de la tarjeta; tocarla abre el visor completo. */
export function VistaPrevia({ documento: d, alAbrir }: { documento: Documento; alAbrir: () => void }) {
  const { pdf, error } = usePdf(rutaDocumento(d));
  if (error) return <div className="mt-3"><SinVista documento={d} /></div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: salida }}
      className="relative mt-3 overflow-hidden rounded-[10px] bg-[#dcdfe4]"
    >
      <button type="button" onClick={alAbrir} aria-label={`Ver completo: ${d.titulo}`} className="block max-h-[min(26rem,55dvh)] w-full overflow-hidden p-2.5 text-left">
        {pdf ? <Pagina pdf={pdf} numero={1} total={pdf.numPages} /> : <span className="block aspect-[8.5/11] w-full animate-pulse rounded-[3px] bg-panel" aria-hidden />}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#dcdfe4] to-transparent" aria-hidden />
      <button
        type="button"
        onClick={alAbrir}
        className="absolute bottom-3 left-1/2 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-tinta px-4 font-bold whitespace-nowrap text-panel shadow-[0_8px_20px_-8px_rgb(21_18_14/0.6)] transition-transform duration-150 active:scale-[0.96]"
      >
        <Maximize2 className="size-4 text-senal" aria-hidden />
        Ver completo{pdf ? ` · ${pdf.numPages} ${pdf.numPages === 1 ? "página" : "páginas"}` : ""}
      </button>
    </motion.div>
  );
}

function preguntasDe(d: Documento) {
  return d.tipo === "guia"
    ? ["¿Qué explica esta guía?", "¿Qué tengo que hacer según esta guía?"]
    : ["¿Qué datos me piden en este formato?", "¿Qué documentos anexo?", "¿Dónde lo entrego?"];
}

function ChatDocumento({ documento: d, clave }: { documento: Documento; clave: string }) {
  const sobre = `(Pregunta sobre el ${d.tipo === "guia" ? "documento" : "formato"} «${d.titulo}».)`;
  const { mensajes, ocupado, preguntar, reintentar } = useConversacion({ claveFija: clave, sobre });
  return (
    <section aria-labelledby="chat-documento" className="flex flex-col border-t border-linea min-[69rem]:min-h-0 min-[69rem]:flex-1">
      <h3 id="chat-documento" className="px-4 pt-3 font-bold">
        Pregúntale a Sagui sobre {d.tipo === "guia" ? "esta guía" : "este formato"}
      </h3>
      <div className="[&_.scroll-mt-36]:scroll-mt-3 min-[69rem]:min-h-0 min-[69rem]:flex-1 min-[69rem]:overflow-y-auto min-[69rem]:overscroll-contain">
        {mensajes.length ? (
          <Mensajes mensajes={mensajes} ocupado={ocupado} alPreguntar={(t, a) => void preguntar(t, a)} alReintentar={reintentar} ocultarFicha={clave} sinDocumentos />
        ) : (
          <ul className="mx-4 mt-2 mb-3 divide-y divide-linea/70 overflow-hidden rounded-[12px] bg-piso">
            {preguntasDe(d).map((p, i) => (
              <li key={p} style={{ "--fila": i } as CSSProperties} className="entra-fila">
                <button type="button" onClick={() => void preguntar(p, [])} className="fila-senal flex min-h-12 w-full items-center gap-3 px-3.5 py-2 text-left font-medium">
                  <span className="flex-1">{p}</span>
                  <ChevronRight className="flecha size-5 shrink-0 text-tinta-suave" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* En el teléfono todo el panel se desplaza junto y la barra se queda abajo. */}
      <div className="sticky bottom-0 bg-panel">
        <BarraPregunta embebida indice={SIN_INDICE} ocupado={ocupado} alEnviar={(t, a) => void preguntar(t, a)} />
      </div>
    </section>
  );
}

/** El formato a pantalla completa: las hojas a la izquierda y, a la derecha, qué hacer con él y un chat sobre él. */
export function VisorDocumento({ documento: d, clave, alCerrar }: { documento: Documento; clave?: string; alCerrar: () => void }) {
  const { pdf, error } = usePdf(rutaDocumento(d));
  const reducir = useReducedMotion();
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = useRef(alCerrar);
  const delTramite = clave ?? d.claves?.[0];

  useEffect(() => {
    cerrar.current = alCerrar;
  });

  // Mientras está abierto, lo de atrás no se enfoca ni se desplaza; al cerrarlo todo queda como estaba.
  useEffect(() => {
    const dialogo = caja.current;
    if (!dialogo) return;
    const raiz = document.documentElement;
    const desplazamiento = raiz.style.overflow;
    const fondo = [...document.body.children].filter((n) => n !== dialogo && !n.hasAttribute("inert"));
    fondo.forEach((n) => n.setAttribute("inert", ""));
    raiz.style.overflow = "hidden";
    dialogo.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      cerrar.current();
    };
    window.addEventListener("keydown", alTeclear, true);
    return () => {
      fondo.forEach((n) => n.removeAttribute("inert"));
      raiz.style.overflow = desplazamiento;
      window.removeEventListener("keydown", alTeclear, true);
    };
  }, []);

  const total = pdf?.numPages ?? d.paginas ?? 1;

  return createPortal(
    <motion.div
      ref={caja}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-visor"
      initial={reducir ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducir ? { opacity: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: salida }}
      className="visor-documento fixed inset-0 z-[60] flex flex-col bg-panel outline-none min-[69rem]:grid min-[69rem]:grid-cols-[minmax(0,1fr)_26rem]"
    >
      <div className="flex min-h-0 flex-col bg-[#dcdfe4] max-[69rem]:h-[50dvh] max-[69rem]:shrink-0 min-[69rem]:h-dvh">
        <div className="flex shrink-0 items-center gap-2 bg-tinta px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 text-panel">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {d.titulo} · {total} {total === 1 ? "página" : "páginas"}
          </p>
          <button type="button" aria-label="Cerrar" onClick={alCerrar} className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {error ? (
              <SinVista documento={d} />
            ) : pdf ? (
              Array.from({ length: pdf.numPages }, (_, i) => <Pagina key={i} pdf={pdf} numero={i + 1} total={pdf.numPages} />)
            ) : (
              <span className="block aspect-[8.5/11] w-full animate-pulse rounded-[3px] bg-panel" aria-hidden />
            )}
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-1 flex-col max-[69rem]:overflow-y-auto max-[69rem]:overscroll-contain min-[69rem]:h-dvh min-[69rem]:border-l min-[69rem]:border-linea">
        <div className="shrink-0 px-4 pt-4 pb-3 min-[69rem]:pt-[max(env(safe-area-inset-top),1.25rem)]">
          <p className="text-sm font-bold text-senal-oscura">{d.tipo === "guia" ? "Guía oficial de consulta" : "Formato oficial"}</p>
          <h2 id="titulo-visor" className="mt-0.5 text-lg leading-tight font-bold text-balance min-[69rem]:text-xl">
            {d.titulo}
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">{descripcionDocumento(d)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            {esLlenable(d.id) ? (
              <Link href={`/llenar/${d.id}`} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]">
                <PencilLine className="size-5" aria-hidden />
                Llenar conmigo
              </Link>
            ) : null}
            <a
              href={rutaDocumento(d)}
              download={d.archivo || undefined}
              className={`flex min-h-11 items-center gap-2 rounded-[10px] px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97] ${esLlenable(d.id) ? "border-2 border-tinta" : "bg-senal"}`}
            >
              <Download className="size-5" aria-hidden />
              Descargar
            </a>
            {d.url && d.archivo ? (
              <a href={d.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-1.5 text-sm underline">
                Ver en el sitio oficial
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
        {delTramite ? <ChatDocumento documento={d} clave={delTramite} /> : null}
      </aside>
    </motion.div>,
    document.body,
  );
}
