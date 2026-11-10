"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Download, ExternalLink, FileText, PencilLine } from "lucide-react";
import { esLlenable } from "@/lib/llenado";
import type { Documento } from "@/lib/tipos";

export const rutaDocumento = (d: Documento) => (d.archivo ? `/documentos/${d.archivo}` : d.url);

function descripcion(d: Documento) {
  const peso = d.pesoKB >= 1024 ? `${(d.pesoKB / 1024).toFixed(1)} MB` : `${d.pesoKB} KB`;
  return [d.formato, d.paginas ? `${d.paginas} ${d.paginas === 1 ? "pág." : "págs."}` : "", peso, d.revision].filter(Boolean).join(" · ");
}

function FilaDocumento({ documento: d }: { documento: Documento }) {
  return (
    <li className="border-t border-linea py-3 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-tinta text-panel">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-bold">{d.titulo}</p>
          <p className="mt-0.5 text-sm text-tinta-suave">{descripcion(d)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {esLlenable(d.id) ? (
          <Link
            href={`/llenar/${d.id}`}
            className="flex min-h-11 items-center gap-2 rounded-[10px] bg-senal px-4 font-bold text-tinta transition-transform duration-150 active:scale-[0.97]"
          >
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
    </li>
  );
}

export function ListaDocumentos({ documentos }: { documentos: Documento[] }) {
  return (
    <ul className="mt-2">
      {documentos.map((d) => (
        <FilaDocumento key={d.id} documento={d} />
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
      <ListaDocumentos documentos={documentos} />
    </motion.section>
  );
}
