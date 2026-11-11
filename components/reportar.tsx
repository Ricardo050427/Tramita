"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, Send } from "lucide-react";
import { DENUNCIA } from "@/lib/ley";
import { ES_TIPO, TIPOS_REPORTE, type TipoReporte } from "@/lib/tipos-reporte";

const ALMACEN = "tramita:reportados";
const hoy = () => new Date().toLocaleDateString("en-CA");

function leerReportados(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ALMACEN) ?? "{}");
  } catch {
    return {};
  }
}

const suscribir = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};
const sinCambios = () => () => undefined;
const crudoReportados = () => {
  try {
    return localStorage.getItem(ALMACEN) ?? "{}";
  } catch {
    return "{}";
  }
};

export function Reportar({ clave, sugeridos = [], origen }: { clave: string; sugeridos?: TipoReporte[]; origen: "verificador" | "ficha" | "mis-tramites" }) {
  const [elegido, setTipo] = useState<TipoReporte | null>(null);
  const [detalle, setDetalle] = useState("");
  const [estado, setEstado] = useState<"libre" | "enviando" | "enviado">("libre");
  const [error, setError] = useState("");
  const reportados = JSON.parse(useSyncExternalStore(suscribir, crudoReportados, () => "{}")) as Record<string, string>;
  // Una liga como ?tipo=plazo deja la opción ya elegida.
  const deLiga = useSyncExternalStore(sinCambios, () => new URLSearchParams(location.search).get("tipo") ?? "", () => "");
  const sugerencias = sugeridos.length ? sugeridos : ES_TIPO.has(deLiga) ? [deLiga as TipoReporte] : [];
  const tipo = elegido ?? sugerencias[0] ?? null;
  const yaHoy = tipo ? reportados[`${clave}:${tipo}`] === hoy() : false;
  const orden = [...TIPOS_REPORTE].sort((a, b) => Number(sugerencias.includes(b.id)) - Number(sugerencias.includes(a.id)));

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tipo) {
      setError("Elige qué pasó.");
      return;
    }
    setEstado("enviando");
    setError("");
    try {
      const sitio = new FormData(e.currentTarget).get("sitio");
      const r = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, tipo, detalle, origen, sitio }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error ?? "No pude enviar tu reporte. Inténtalo de nuevo.");
      try {
        localStorage.setItem(ALMACEN, JSON.stringify({ ...leerReportados(), [`${clave}:${tipo}`]: hoy() }));
      } catch {}
      setEstado("enviado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude enviar tu reporte. Inténtalo de nuevo.");
      setEstado("libre");
    }
  }

  if (estado === "enviado") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} role="status">
        <p className="flex items-center gap-2 font-bold text-bien">
          <span className="grid size-7 place-items-center rounded-full bg-bien-fondo">
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </span>
          Gracias. Tu reporte ya cuenta en el observatorio.
        </p>
        <p className="mt-2 leading-snug text-tinta-suave">
          Es anónimo y sirve para ver dónde se repiten los problemas. Para que la Contraloría investigue tu caso, presenta una denuncia formal.
        </p>
        <div className="mt-1 flex flex-wrap gap-x-5">
          <Link href="/vigila#reportes" className="flex min-h-11 items-center gap-1.5 font-bold underline">
            Ver los reportes
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href={`/tramite/${DENUNCIA.clave}`} className="flex min-h-11 items-center underline">
            Presentar denuncia formal
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={enviar}>
      <fieldset>
        <legend className="font-bold">¿Qué pasó?</legend>
        <div className="mt-2 flex flex-col gap-2">
          {orden.map((t) => (
            <label key={t.id} className="relative">
              <input type="radio" name="tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} className="peer absolute inset-0 opacity-0" />
              <span className="flex min-h-12 cursor-pointer items-center rounded-[10px] border-2 border-linea bg-panel px-3.5 py-2 leading-snug font-medium transition-[background-color,border-color,color] duration-150 peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-panel peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta">
                {t.nombre}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`detalle-${origen}`} className="mt-4 block font-bold">
        Cuéntalo en pocas palabras <span className="font-normal text-tinta-suave">(opcional)</span>
      </label>
      <textarea
        id={`detalle-${origen}`}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder="Sin nombres de personas ni datos tuyos"
        className="mt-1.5 w-full resize-none rounded-[10px] border-2 border-linea bg-panel px-3 py-2.5 text-base leading-snug transition-colors duration-150 placeholder:text-tinta-suave focus:border-tinta"
      />
      <input type="text" name="sitio" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      {error ? (
        <p role="alert" className="mt-3 font-bold text-error">
          {error}
        </p>
      ) : null}
      {yaHoy ? <p className="mt-3 text-[0.9375rem] font-medium text-tinta-suave">Ya reportaste esto hoy en este trámite. Puedes reportar otra cosa.</p> : null}
      <button
        type="submit"
        disabled={estado === "enviando" || yaHoy}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-tinta px-4 font-bold text-panel transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-55"
      >
        <Send className="size-[1.125rem]" aria-hidden />
        {estado === "enviando" ? "Enviando…" : "Enviar reporte anónimo"}
      </button>
      <p className="mt-2 text-sm leading-snug text-tinta-suave">No guardamos quién eres. Publicamos solo cuántos reportes hay por trámite, nunca lo que escribes.</p>
    </form>
  );
}
