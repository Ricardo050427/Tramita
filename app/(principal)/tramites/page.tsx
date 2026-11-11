import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Directorio } from "@/components/directorio";
import { Encabezado } from "@/components/senal";
import { categorias } from "@/lib/datos";
import { resumenRuta, rutas } from "@/lib/rutas";

export default function PaginaTramites() {
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="¿De qué es tu trámite?" />
      <main className="mx-auto max-w-4xl px-3 py-3 sm:py-5">
        <Directorio categorias={categorias} />

        <section className="mt-8" aria-labelledby="rutas">
          <h2 id="rutas" className="px-1 text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Para un proyecto completo
          </h2>
          <p className="mt-1 px-1 leading-snug text-tinta-suave">Todos los trámites en orden, con costo y tiempo, incluso los que se hacen fuera del Ayuntamiento.</p>
          <ul className="mt-3 overflow-hidden rounded-[14px] bg-panel">
            {rutas.map((r) => {
              const resumen = resumenRuta(r);
              return (
                <li key={r.slug} className="border-t border-linea first:border-t-0">
                  <Link href={`/ruta/${r.slug}`} className="fila-senal flex min-h-16 items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug font-bold">{r.nombre}</span>
                      <span className="mt-0.5 block text-[0.9375rem] leading-snug text-tinta-suave">
                        {resumen.enAyuntamiento} {resumen.enAyuntamiento === 1 ? "trámite" : "trámites"}
                        {resumen.dias ? ` · hasta ${resumen.dias} días hábiles` : ""}
                      </span>
                    </span>
                    <ArrowRight className="flecha size-5 shrink-0" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-6 px-1 text-[0.8125rem] text-tinta-suave">Proyecto independiente de hackathon. No es un sitio oficial del Ayuntamiento de Hermosillo.</p>
      </main>
    </div>
  );
}
