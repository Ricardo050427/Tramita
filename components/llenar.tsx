"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Download, ExternalLink, LoaderCircle, Lock, PencilLine, Share2, Trash2 } from "lucide-react";
import { borrarPerfil, errorDe, formatoPorId, guardarPerfil, leerPerfil, preguntasVisibles, valorDe, type Formato, type Paso, type Pregunta, type Respuestas } from "@/lib/llenado";
import { Encabezado } from "./senal";

const MAXIMOS: Record<string, number> = { tel: 10, cp: 5, rfc: 13, curp: 18 };
const TECLADO: Record<string, "numeric" | "decimal" | "tel" | "email"> = { tel: "tel", cp: "numeric", numero: "decimal", correo: "email" };

function ajustar(p: Pregunta, valor: string) {
  if (p.tipo === "rfc" || p.tipo === "curp") return valor.toUpperCase().replace(/\s/g, "");
  if (p.tipo === "tel" || p.tipo === "cp") return valor.replace(/\D/g, "");
  return valor;
}

function Campo({ pregunta: p, valor, error, alCambiar }: { pregunta: Pregunta; valor: string; error?: string; alCambiar: (v: string) => void }) {
  const notaId = `${p.id}-nota`;
  const nota = error || p.ayuda;
  const titulo = (
    <>
      {p.etiqueta}
      {p.obligatoria ? null : <span className="ml-1.5 font-normal text-tinta-suave">opcional</span>}
    </>
  );
  const pie = nota ? (
    <p id={notaId} className={`mt-1 text-sm ${error ? "font-bold text-error" : "text-tinta-suave"}`}>
      {nota}
    </p>
  ) : null;

  if (p.opciones) {
    return (
      <fieldset aria-describedby={nota ? notaId : undefined}>
        <legend className="font-bold">{titulo}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.opciones.map((o) => (
            <label key={o.valor} className="relative">
              <input type="radio" name={p.id} value={o.valor} checked={valor === o.valor} onChange={() => alCambiar(o.valor)} className="peer absolute inset-0 opacity-0" />
              <span className="flex min-h-12 cursor-pointer items-center rounded-[10px] border-2 border-linea bg-panel px-4 font-bold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-panel peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta">
                {o.etiqueta}
              </span>
            </label>
          ))}
        </div>
        {pie}
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={p.id} className="block font-bold">
        {titulo}
      </label>
      <input
        id={p.id}
        value={valor}
        onChange={(e) => alCambiar(ajustar(p, e.target.value))}
        type={p.tipo === "correo" ? "email" : "text"}
        inputMode={p.tipo ? TECLADO[p.tipo] : undefined}
        autoComplete={p.autocompletar ?? "off"}
        autoCapitalize={p.tipo === "correo" ? "none" : undefined}
        maxLength={p.max ?? (p.tipo ? MAXIMOS[p.tipo] : undefined) ?? 80}
        placeholder={p.ejemplo ? `Ej. ${p.ejemplo}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={nota ? notaId : undefined}
        className={`mt-1.5 min-h-12 w-full rounded-[10px] border-2 bg-panel px-3 text-base transition-colors duration-150 outline-none placeholder:text-tinta-suave focus:border-tinta ${error ? "border-error" : "border-linea"}`}
      />
      {pie}
    </div>
  );
}

function textoDe(p: Pregunta, r: Respuestas) {
  const valor = valorDe(p.id, r);
  return p.opciones?.find((o) => o.valor === valor)?.etiqueta ?? valor;
}

function Revision({ pasos, r, alCambiar }: { pasos: Paso[]; r: Respuestas; alCambiar: (i: number) => void }) {
  return (
    <div className="divide-y divide-linea">
      {pasos.map((paso, i) => (
        <section key={paso.id} className="py-4 first:pt-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">{paso.titulo}</h3>
            <button type="button" onClick={() => alCambiar(i)} className="flex min-h-11 items-center gap-1.5 text-sm font-bold underline underline-offset-2">
              <PencilLine className="size-4" aria-hidden />
              Cambiar
            </button>
          </div>
          <dl className="mt-1 grid gap-2.5 sm:grid-cols-2">
            {preguntasVisibles(paso, r).map((p) => {
              const texto = textoDe(p, r);
              return (
                <div key={p.id} className="min-w-0">
                  <dt className="text-sm text-tinta-suave">{p.etiqueta}</dt>
                  <dd className={`break-words ${texto ? "font-bold" : "text-tinta-suave"}`}>{texto || "En blanco"}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

type Generado = { url: string; archivo: File; recortados: boolean };

function Resultado({ generado, alCorregir, alBorrar, borrado }: { generado: Generado; alCorregir: () => void; alBorrar: () => void; borrado: boolean }) {
  const compartible = typeof navigator.canShare === "function" && navigator.canShare({ files: [generado.archivo] });

  return (
    <div>
      {generado.recortados ? <p className="mb-4 rounded-[10px] bg-piso p-3 font-bold">Un dato no cupo completo en su casilla. Revísalo en el PDF y corrígelo a mano si hace falta.</p> : null}
      <div className="flex flex-wrap gap-2">
        <a href={generado.url} download={generado.archivo.name} className="flex min-h-12 items-center gap-2 rounded-[10px] bg-senal px-5 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]">
          <Download className="size-5" aria-hidden />
          Descargar PDF
        </a>
        {compartible ? (
          <button
            type="button"
            onClick={() => navigator.share({ files: [generado.archivo], title: generado.archivo.name }).catch(() => undefined)}
            className="flex min-h-12 items-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold transition-transform duration-150 active:scale-[0.97]"
          >
            <Share2 className="size-5" aria-hidden />
            Compartir
          </button>
        ) : null}
        <a href={generado.url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold transition-transform duration-150 active:scale-[0.97]">
          <ExternalLink className="size-5" aria-hidden />
          Ver
        </a>
      </div>
      <h3 className="mt-7 text-lg font-bold">Lo que sigue</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        <li>Revisa que cada dato sea correcto. Al firmar declaras que es verdad.</li>
        <li>Imprímela y fírmala a mano: la solicitud se presenta con firma autógrafa.</li>
        <li>Llévala con los documentos que marca la lista de requisitos del mismo PDF.</li>
      </ol>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        <button type="button" onClick={alCorregir} className="flex min-h-11 items-center gap-1.5 font-bold underline underline-offset-2">
          <PencilLine className="size-4" aria-hidden />
          Corregir un dato
        </button>
        <button type="button" onClick={alBorrar} disabled={borrado} className="flex min-h-11 items-center gap-1.5 font-bold underline underline-offset-2 disabled:no-underline disabled:opacity-70">
          <Trash2 className="size-4" aria-hidden />
          {borrado ? "Datos borrados de este dispositivo" : "Borrar mis datos de este dispositivo"}
        </button>
      </div>
    </div>
  );
}

const sinSuscripcion = () => () => undefined;

export function LlenarFormato({ id }: { id: string }) {
  // El perfil vive en el dispositivo: la entrevista solo se dibuja ya en el navegador.
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (enNavegador) return <Entrevista formato={formatoPorId(id)!} />;
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="Vamos a llenar tu solicitud" volver="/" />
    </div>
  );
}

function Entrevista({ formato }: { formato: Formato }) {
  const { pasos } = formato;
  const [actual, setActual] = useState(0);
  const [direccion, setDireccion] = useState(1);
  const [r, setR] = useState<Respuestas>(() => ({ n_igual: "igual", n_municipio: "Hermosillo", ...leerPerfil() }));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [generado, setGenerado] = useState<Generado | null>(null);
  const [borrado, setBorrado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);
  const reducir = useReducedMotion();

  useEffect(() => {
    void import("@/lib/llenar-pdf");
  }, []);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    titulo.current?.focus({ preventScroll: true });
  }, [actual, generado]);

  useEffect(() => () => {
    if (generado) URL.revokeObjectURL(generado.url);
  }, [generado]);

  const enRevision = actual === pasos.length;
  const paso = pasos[actual];
  const mensaje = generado ? "Tu solicitud está lista" : enRevision ? "Revisa tus datos" : paso.mensaje;
  const encabezadoPaso = generado ? formato.titulo : enRevision ? "Así se va a llenar" : paso.titulo;

  function ir(destino: number) {
    setDireccion(destino > actual ? 1 : -1);
    setErrores({});
    setActual(destino);
  }

  function cambiar(p: Pregunta, valor: string) {
    setBorrado(false);
    setR((previo) => ({ ...previo, [p.id]: valor }));
    if (errores[p.id]) setErrores((previo) => Object.fromEntries(Object.entries(previo).filter(([k]) => k !== p.id)));
  }

  function siguiente() {
    const encontrados = Object.fromEntries(
      preguntasVisibles(paso, r).flatMap((p) => {
        const error = errorDe(p, r[p.id]);
        return error ? [[p.id, error]] : [];
      }),
    );
    setErrores(encontrados);
    const primero = Object.keys(encontrados)[0];
    if (primero) {
      (document.getElementById(primero) ?? document.getElementsByName(primero)[0])?.focus();
      return;
    }
    guardarPerfil(r);
    ir(actual + 1);
  }

  async function generar() {
    setGenerando(true);
    setFallo(false);
    try {
      const [{ rellenarPdf }, respuesta] = await Promise.all([import("@/lib/llenar-pdf"), fetch(`/documentos/${formato.archivo}`)]);
      if (!respuesta.ok) throw new Error("formato");
      const { bytes, recortados } = await rellenarPdf(await respuesta.arrayBuffer(), formato, r);
      const archivo = new File([bytes.slice().buffer as ArrayBuffer], `${formato.titulo}.pdf`, { type: "application/pdf" });
      setGenerado({ url: URL.createObjectURL(archivo), archivo, recortados: recortados.length > 0 });
    } catch {
      setFallo(true);
    } finally {
      setGenerando(false);
    }
  }

  function corregir() {
    setGenerado(null);
  }

  function borrar() {
    borrarPerfil();
    setBorrado(true);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado mensaje={mensaje} volver="/" />
      <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-clip px-4 pt-4 pb-6">
        {generado ? null : (
          <div className="mb-4">
            <p className="text-sm font-bold">{enRevision ? "Último paso" : `Paso ${actual + 1} de ${pasos.length}`}</p>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {[...pasos, null].map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= actual ? "bg-tinta" : "bg-linea"}`} />
              ))}
            </div>
          </div>
        )}
        <motion.section
            key={generado ? "listo" : actual}
            initial={reducir ? false : { opacity: 0.4, x: direccion * 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[14px] border-2 border-tinta bg-panel px-4 py-4"
          >
            <h2 ref={titulo} tabIndex={-1} className="text-xl font-bold outline-none">
              {encabezadoPaso}
            </h2>
            <div className="mt-4">
              {generado ? (
                <Resultado generado={generado} alCorregir={corregir} alBorrar={borrar} borrado={borrado} />
              ) : enRevision ? (
                <Revision pasos={pasos} r={r} alCambiar={ir} />
              ) : (
                <form
                  id="paso"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    siguiente();
                  }}
                  className="space-y-5"
                >
                  {preguntasVisibles(paso, r).map((p) => (
                    <Campo key={p.id} pregunta={p} valor={r[p.id] ?? ""} error={errores[p.id]} alCambiar={(v) => cambiar(p, v)} />
                  ))}
                </form>
              )}
            </div>
        </motion.section>
        {generado ? null : (
          <p className="mt-3 flex items-start gap-2 text-sm text-tinta-suave">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Tus datos se quedan en este dispositivo. No pasan por la IA ni se envían a ningún servidor.
          </p>
        )}
        {fallo ? (
          <p role="alert" className="mt-3 font-bold text-error">
            No pude abrir el formato. Revisa tu conexión e inténtalo de nuevo.
          </p>
        ) : null}
      </main>
      {generado ? null : (
        <div className="sticky bottom-0 z-20 border-t border-linea bg-panel pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-3">
            {actual > 0 ? (
              <button type="button" onClick={() => ir(actual - 1)} aria-label="Paso anterior" className="grid size-12 shrink-0 place-items-center rounded-[10px] border-2 border-tinta transition-transform duration-150 active:scale-[0.97]">
                <ArrowLeft className="size-5" aria-hidden />
              </button>
            ) : null}
            {enRevision ? (
              <button type="button" onClick={generar} disabled={generando} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-senal font-bold text-tinta transition-transform duration-150 active:scale-[0.97] disabled:opacity-70">
                {generando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Download className="size-5" aria-hidden />}
                {generando ? "Preparando tu PDF" : "Generar mi PDF"}
              </button>
            ) : (
              <button type="submit" form="paso" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-senal font-bold text-tinta transition-transform duration-150 active:scale-[0.97]">
                Siguiente
                <ArrowRight className="size-5" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
