import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Encabezado } from "@/components/senal";
import { categoriaPorSlug, categorias, tramitesDeCategoria } from "@/lib/datos";

export const instant = false;

export function generateStaticParams() {
  return categorias.map((c) => ({ slug: c.slug }));
}

export default async function PaginaCategoria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categoria = categoriaPorSlug(slug);
  if (!categoria) notFound();
  const lista = tramitesDeCategoria(slug);

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={categoria.nombre} volver="/tramites" />
      <main className="mx-auto max-w-3xl">
        <p className="px-4 py-4 text-tinta-suave">
          {lista.length} {lista.length === 1 ? "trámite" : "trámites"} en el catálogo municipal
        </p>
        <ul className="border-t border-linea">
          {lista.map((t, i) => (
            <li key={t.clave} style={{ "--fila": Math.min(i, 12) } as CSSProperties} className="entra-fila border-b border-linea">
              <Link href={`/tramite/${t.clave}`} className="fila-senal flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.0625rem] leading-snug font-medium">{t.nombre}</span>
                  {t.enLinea ? <span className="mt-0.5 block text-sm text-bien">Disponible en línea</span> : null}
                </span>
                <ArrowRight className="flecha size-6 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
