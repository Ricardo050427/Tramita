import { notFound } from "next/navigation";
import { PasosRuta } from "@/components/ruta";
import { Encabezado } from "@/components/senal";
import { resumenRuta, rutaPorSlug, rutas } from "@/lib/rutas";

export const instant = false;

export function generateStaticParams() {
  return rutas.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ruta = rutaPorSlug(slug);
  return { title: ruta ? `${ruta.nombre} · Tramita` : "Tramita" };
}

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default async function PaginaRuta({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ruta = rutaPorSlug(slug);
  if (!ruta) notFound();
  const r = resumenRuta(ruta);
  const costo = r.maximo > 0 ? (r.minimo === r.maximo ? pesos(r.maximo) : `${pesos(r.minimo)} a ${pesos(r.maximo)}`) : "Sin costo";

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje={ruta.nombre} volver="/tramites" />
      <main className="mx-auto max-w-2xl px-3 py-4 pb-16">
        <p className="px-1 text-[1.125rem] leading-relaxed">{ruta.frase}</p>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-linea rounded-[14px] bg-panel py-3">
          <div className="px-3">
            <dt className="text-sm leading-tight text-tinta-suave">Trámites</dt>
            <dd className="mt-1 text-[1.375rem] leading-none font-bold">{r.enAyuntamiento}</dd>
            <dd className="mt-1 text-[0.8125rem] leading-tight text-tinta-suave">
              {[r.opcionales ? `+${r.opcionales} si aplican` : "", r.externos ? `+${r.externos} fuera` : ""].filter(Boolean).join(" · ") || "en el Ayuntamiento"}
            </dd>
          </div>
          <div className="px-3">
            <dt className="text-sm leading-tight text-tinta-suave">Costo conocido</dt>
            <dd className="mt-1 text-[1.125rem] leading-tight font-bold">{costo}</dd>
            {r.sinCosto ? <dd className="mt-1 text-[0.8125rem] leading-tight text-tinta-suave">+{r.sinCosto} según tu caso</dd> : null}
          </div>
          <div className="px-3">
            <dt className="text-sm leading-tight text-tinta-suave">Respuesta</dt>
            <dd className="mt-1 text-[1.125rem] leading-tight font-bold">{r.dias ? `Hasta ${r.dias} días` : "Sin plazo"}</dd>
            <dd className="mt-1 text-[0.8125rem] leading-tight text-tinta-suave">{r.dias ? "hábiles, uno tras otro" : "publicado"}</dd>
          </div>
        </dl>
        <PasosRuta ruta={ruta} />
        <p className="mt-6 px-1 text-sm leading-snug text-tinta-suave">
          Ruta armada por Tramita con las fichas del catálogo municipal. Costos y plazos son los publicados; algunos dependen de los metros o del giro, así que confírmalos en
          cada dependencia.
        </p>
      </main>
    </div>
  );
}
