import { notFound } from "next/navigation";
import Link from "next/link";
import { Reportar } from "@/components/reportar";
import { Encabezado } from "@/components/senal";
import { tramitePorClave, tramites } from "@/lib/datos";
import { DENUNCIA } from "@/lib/ley";

export const instant = false;

export function generateStaticParams() {
  return tramites.map((t) => ({ clave: t.clave }));
}

export async function generateMetadata({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  return { title: tramite ? `Reportar: ${tramite.nombre} · Tramita` : "Tramita" };
}

export default async function PaginaReportar({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  if (!tramite) notFound();
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="¿Algo no cuadra?" volver={`/tramite/${tramite.clave}`} />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        <section className="rounded-[14px] border border-linea bg-panel p-4">
          <h2 className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em] text-balance">Repórtalo sin dar tu nombre</h2>
          <p className="mt-1.5 mb-5 leading-snug text-tinta-suave">
            Sobre «{tramite.nombre}». Tu reporte se suma al observatorio público y ayuda a ver en qué trámites se repiten los problemas.
          </p>
          <Reportar clave={tramite.clave} origen="ficha" />
        </section>
        <p className="mt-4 px-1 text-[0.9375rem] leading-snug text-tinta-suave">
          ¿Te pidieron algo que no viene en la ficha?{" "}
          <Link href={`/tramite/${tramite.clave}/verificar`} className="font-bold text-tinta underline">
            Compáralo primero
          </Link>
          . Si quieres que la Contraloría investigue,{" "}
          <Link href={`/tramite/${DENUNCIA.clave}`} className="font-bold text-tinta underline">
            presenta una denuncia formal
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
