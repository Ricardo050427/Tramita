import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { AccionesPase, RequisitosPase } from "@/components/pase";
import { Marca } from "@/components/senal";
import { tramitePorClave, tramites } from "@/lib/datos";
import { FECHA_CATALOGO, LEY, SITIO, fechaLegible } from "@/lib/ley";
import { estimarCosto } from "@/lib/plan";
import type { Tramite } from "@/lib/tipos";

export const instant = false;

export function generateStaticParams() {
  return tramites.map((t) => ({ clave: t.clave }));
}

export async function generateMetadata({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  return { title: tramite ? `Pase: ${tramite.nombre} · Tramita` : "Tramita" };
}

const pesos = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function costoCorto(t: Tramite) {
  const rango = estimarCosto(t);
  if (rango && rango.max === 0) return { valor: "Sin costo", nota: "" };
  if (rango) return { valor: rango.min === rango.max ? pesos(rango.max) : `${pesos(rango.min)} a ${pesos(rango.max)}`, nota: t.costo.split(".")[0] };
  return { valor: "Según tu caso", nota: t.costo.replace(/\s+/g, " ").slice(0, 90) };
}

const plazoCorto = (t: Tramite) => {
  const p = t.plazo.replace(/\s+/g, " ").trim();
  return !p || /^indefinido/i.test(p) ? "No publicado" : p.split(/\s(?=el plazo|a partir|articulo|artículo)/i)[0];
};

export default async function PaginaPase({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  if (!tramite) notFound();

  const url = `${SITIO}/pase/${tramite.clave}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#15120e", light: "#ffffff" } });
  const costo = costoCorto(tramite);
  const lugar = tramite.oficinas ? "Centros de atención de Tesorería Municipal" : tramite.domicilio;
  const horario = tramite.oficinas ? tramite.oficinas[0]?.horario : tramite.horario;

  return (
    <div className="pase min-h-dvh bg-piso">
      <div className="mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-10">
        <div className="no-imprimir flex h-14 items-center justify-between">
          <Link href={`/tramite/${tramite.clave}`} aria-label="Volver a la ficha" className="-ml-1 grid size-11 place-items-center">
            <ArrowLeft className="size-7" strokeWidth={2.5} aria-hidden />
          </Link>
          <AccionesPase titulo={tramite.nombre} url={url} />
        </div>

        <article className="boleto mt-2 overflow-hidden rounded-[16px] bg-panel shadow-[0_14px_32px_-18px_rgb(21_18_14/0.55)]">
          <header className="bg-senal px-5 pt-4 pb-5 text-tinta">
            <div className="flex items-center justify-between">
              <Marca />
              <span className="text-[0.8125rem] font-bold tracking-[0.06em] uppercase">Pase de trámite</span>
            </div>
            <h1 className="mt-4 text-[1.625rem] leading-[1.1] font-bold tracking-[-0.015em] text-balance">{tramite.nombre}</h1>
            <p className="mt-1.5 leading-snug">{tramite.dependencia}</p>
          </header>

          <dl className="grid grid-cols-3 divide-x divide-linea border-b border-linea">
            {[
              ["Costo", costo.valor],
              ["Respuesta", plazoCorto(tramite)],
              ["Clave", tramite.clave],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="px-3 py-3 first:pl-5">
                <dt className="text-[0.75rem] font-bold tracking-[0.06em] text-tinta-suave uppercase">{etiqueta}</dt>
                <dd className="mt-0.5 leading-tight font-bold">{valor}</dd>
              </div>
            ))}
          </dl>
          {costo.nota ? <p className="border-b border-linea px-5 py-2 text-sm leading-snug text-tinta-suave">Costo publicado: {costo.nota}.</p> : null}

          <section className="px-5 py-4">
            {tramite.requisitos.length ? (
              <RequisitosPase clave={tramite.clave} requisitos={tramite.requisitos} />
            ) : (
              <p className="leading-snug font-medium">El catálogo no publica requisitos para este trámite. Pide la lista oficial por escrito.</p>
            )}
          </section>

          <section className="border-t border-linea px-5 py-4">
            <h2 className="text-[0.8125rem] font-bold tracking-[0.06em] text-tinta-suave uppercase">Dónde</h2>
            <p className="mt-1 leading-snug font-medium">{lugar}</p>
            {horario ? <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">{horario}</p> : null}
          </section>

          <div className="perforacion" aria-hidden />

          <footer className="flex gap-4 px-5 pt-3 pb-5">
            <div className="size-28 shrink-0 [&>svg]:size-full" role="img" aria-label="Código QR que abre este pase en Tramita" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="min-w-0 text-[0.8125rem] leading-snug">
              <p className="font-bold">Solo te pueden pedir los requisitos publicados.</p>
              <p className="mt-1 text-tinta-suave">
                {LEY}, artículo 6, fracción II. Datos del catálogo oficial del Ayuntamiento de Hermosillo, consultado el {fechaLegible(FECHA_CATALOGO)}.
              </p>
            </div>
          </footer>
        </article>

        <p className="mt-3 px-1 text-sm leading-snug text-tinta-suave">
          Tramita es un proyecto ciudadano independiente. Este pase reúne información pública y no es un documento oficial.
        </p>

        <Link
          href={`/tramite/${tramite.clave}/verificar`}
          className="no-imprimir mt-5 flex min-h-14 items-center justify-between gap-3 rounded-[14px] bg-tinta px-4 font-bold text-panel transition-transform duration-150 active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-senal" aria-hidden />
            ¿Te pidieron algo distinto? Compáralo
          </span>
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
