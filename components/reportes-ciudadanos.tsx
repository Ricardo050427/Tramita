"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { fechaLegible } from "@/lib/ley";
import type { ResumenReportes } from "@/lib/tipos-reporte";

// Se consulta al abrir la página: los reportes llegan todo el tiempo y la página es estática.
export function ReportesCiudadanos() {
  const [resumen, setResumen] = useState<ResumenReportes | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    fetch("/api/reportes", { signal: control.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResumen)
      .catch(() => {
        if (!control.signal.aborted) setFallo(true);
      });
    return () => control.abort();
  }, []);

  if (fallo) return <p className="mt-3 text-tinta-suave">No pude cargar los reportes ahora. Vuelve a intentarlo en un momento.</p>;
  if (!resumen) {
    return (
      <div className="mt-4 space-y-2" aria-busy>
        <div className="h-12 w-40 animate-pulse rounded-[8px] bg-linea/60" />
        <div className="h-4 w-full animate-pulse rounded-full bg-linea/60" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-linea/60" />
      </div>
    );
  }

  if (!resumen.total) {
    return (
      <p className="mt-3 leading-relaxed">
        Todavía no hay reportes. Cuando alguien reporta algo que no cuadra en un trámite, aparece aquí sin datos de quién lo envió.{" "}
        <Link href="/vigila#verificar" className="font-bold underline">
          Verifica tu trámite
        </Link>
        .
      </p>
    );
  }

  const mayor = Math.max(...resumen.porTipo.map((t) => t.total), 1);
  return (
    <>
      <p className="mt-4 text-[1.375rem] leading-snug font-bold text-balance">
        <span className="text-[2.75rem] leading-none tracking-[-0.03em]">{resumen.total}</span> {resumen.total === 1 ? "reporte anónimo" : "reportes anónimos"}
        {resumen.ultimo ? <span className="block text-base font-normal text-tinta-suave">El último, el {fechaLegible(resumen.ultimo)}.</span> : null}
      </p>

      <ul className="mt-4">
        {resumen.porTipo
          .filter((t) => t.total)
          .sort((a, b) => b.total - a.total)
          .map((t) => (
            <li key={t.id} className="border-t border-linea py-2.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{t.corto}</span>
                <span className="font-bold">{t.total}</span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-linea/70" aria-hidden>
                <span className="block h-full rounded-full bg-senal" style={{ width: `${(t.total / mayor) * 100}%` }} />
              </span>
            </li>
          ))}
      </ul>

      <h3 className="mt-6 font-bold">Trámites con más reportes</h3>
      <ol className="mt-2">
        {resumen.porTramite.map((t) => (
          <li key={t.clave} className="flex items-center gap-3 border-t border-linea py-2.5">
            <Link href={`/tramite/${t.clave}`} className="min-w-0 flex-1 leading-snug underline">
              {t.nombre}
            </Link>
            <span className="shrink-0 font-bold">{t.total}</span>
          </li>
        ))}
      </ol>

      <a href="/api/reportes?formato=csv" download className="mt-3 flex min-h-11 items-center gap-1.5 font-bold underline">
        <Download className="size-4" aria-hidden />
        Descargar los datos abiertos (CSV)
      </a>
    </>
  );
}
