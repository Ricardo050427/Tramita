"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Download, ExternalLink, Eye, EyeOff, FileText, PencilLine } from "lucide-react";
import { esLlenable } from "@/lib/llenado";
import type { Documento } from "@/lib/tipos";

// El visor y pdf.js se descargan hasta que alguien abre una vista previa.
const VistaPrevia = dynamic(() => import("./visor-pdf").then((m) => m.VistaPrevia), { ssr: false });
const VisorDocumento = dynamic(() => import("./visor-pdf").then((m) => m.VisorDocumento), { ssr: false });

export const rutaDocumento = (d: Documento) => (d.archivo ? `/documentos/${d.archivo}` : d.url);
export const tieneVistaPrevia = (d: Documento) => /\.pdf$/i.test(d.archivo);

export function descripcionDocumento(d: Documento) {
  const peso = d.pesoKB >= 1024 ? `${(d.pesoKB / 1024).toFixed(1)} MB` : `${d.pesoKB} KB`;
  return [d.formato, d.paginas ? `${d.paginas} ${d.paginas === 1 ? "pág." : "págs."}` : "", peso, d.revision].filter(Boolean).join(" · ");
}

function FilaDocumento({ documento: d, clave, previaInicial }: { documento: Documento; clave?: string; previaInicial?: boolean }) {
  const [previa, setPrevia] = useState(Boolean(previaInicial) && tieneVistaPrevia(d));
  const [completo, setCompleto] = useState(false);
  const llenable = esLlenable(d.id);

  return (
    <li className="border-t border-linea py-3 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-tinta text-panel">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-bold">{d.titulo}</p>
          <p className="mt-0.5 text-sm text-tinta-suave">{descripcionDocumento(d)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {llenable ? (
          <Link
            href={`/llenar/${d.id}`}
            className="flex min-h-11 items-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]"
          >
            <PencilLine className="size-5" aria-hidden />
            Llenar conmigo
          </Link>
        ) : null}
        {tieneVistaPrevia(d) ? (
          <button
            type="button"
            aria-expanded={previa}
            onClick={() => setPrevia((v) => !v)}
            className="flex min-h-11 items-center gap-2 rounded-[10px] border-2 border-tinta px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]"
          >
            {previa ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            {previa ? "Cerrar vista previa" : "Vista previa"}
          </button>
        ) : null}
        <a
          href={rutaDocumento(d)}
          download={d.archivo || undefined}
          className={`flex min-h-11 items-center gap-2 rounded-[10px] font-bold text-tinta transition-transform duration-150 active:scale-[0.97] ${
            llenable || tieneVistaPrevia(d) ? "px-2 underline" : "bg-senal px-4"
          }`}
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
      {previa ? <VistaPrevia documento={d} alAbrir={() => setCompleto(true)} /> : null}
      <AnimatePresence>{completo ? <VisorDocumento key="visor" documento={d} clave={clave} alCerrar={() => setCompleto(false)} /> : null}</AnimatePresence>
    </li>
  );
}

export function ListaDocumentos({ documentos, clave, previaInicial }: { documentos: Documento[]; clave?: string; previaInicial?: boolean }) {
  return (
    <ul className="mt-2">
      {documentos.map((d, i) => (
        <FilaDocumento key={d.id} documento={d} clave={clave} previaInicial={previaInicial && i === 0} />
      ))}
    </ul>
  );
}

export function TarjetaDocumentos({ documentos }: { documentos: Documento[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] border-2 border-tinta bg-panel px-4 pt-3.5 pb-2"
    >
      <h2 className="text-lg font-bold">
        {documentos.every((d) => d.tipo === "guia") ? "Guía oficial de consulta" : documentos.length === 1 ? "Tu documento está listo" : "Tus documentos están listos"}
      </h2>
      {/* Quien pidió el formato lo ve de inmediato: la primera vista previa ya viene abierta. */}
      <ListaDocumentos documentos={documentos} previaInicial />
    </motion.section>
  );
}
