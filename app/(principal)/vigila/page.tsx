import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bitacora } from "@/components/bitacora";
import { BuscadorVerificar } from "@/components/buscador-verificar";
import { EnNumeros } from "@/components/en-numeros";
import { ReportesCiudadanos } from "@/components/reportes-ciudadanos";
import { Encabezado } from "@/components/senal";
import { indice, tramites } from "@/lib/datos";
import { FECHA_CATALOGO, LEY, LIGA_LEY, fechaLegible } from "@/lib/ley";
import { resumir } from "@/lib/observatorio";
import { totalesAgenda } from "@/lib/agenda-pdf";
import { fichasSimples } from "@/lib/simplificacion";

export const metadata = { title: "Vigila · Tramita" };

const REPO = "https://github.com/Ricardo050427/Tramita/blob/main/lib/observatorio.ts";

export default function PaginaVigila() {
  const r = resumir(tramites);
  const resumen = totalesAgenda(fichasSimples());
  const incompletos = r.total - r.completos;
  const simplificar = [
    { cifra: r.copias, texto: "trámites piden copias simples", cita: "Artículo 19, fracción IV: «No solicitar copias simples para la gestión de trámites o servicios»." },
    {
      cifra: r.delMunicipio,
      texto: "trámites piden un documento que expide el mismo Ayuntamiento, como la constancia de no adeudo",
      cita: "Artículo 19, fracción I: «No solicitar documentos que los mismos Sujetos Obligados expidan»." },
    {
      cifra: r.formatoSinPublicar,
      texto: `de los ${r.pidenFormato} trámites que piden llenar un formato no lo publican para descargar`,
      cita: "Artículo 19, fracción XV: implementar formatos únicos para la solicitud de trámites y servicios.",
    },
  ];

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="Que te pidan solo lo que marca la ley" />
      <main className="mx-auto max-w-2xl px-3 py-4">
        <section aria-labelledby="verificar" className="rounded-[14px] bg-panel p-4">
          <h2 id="verificar" className="scroll-mt-40 text-[1.375rem] leading-tight font-bold tracking-[-0.01em] text-balance">
            ¿Te pidieron algo de más en la ventanilla?
          </h2>
          <p className="mt-1.5 leading-snug text-tinta-suave">
            Elige tu trámite, escribe o toma foto de lo que te pidieron, y Sagui lo compara con la ficha oficial y con la ley.
          </p>
          <BuscadorVerificar indice={indice} />
        </section>

        <Link
          href="/simplifica"
          className="mt-4 flex items-center gap-4 rounded-[14px] bg-tinta p-4 text-panel transition-transform duration-150 active:scale-[0.98]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-snug font-bold">Así quedaría Hermosillo con la ley</span>
            <span className="mt-1 block leading-snug text-panel/80">
              {resumen.constanciaExigida} trámites te piden una constancia que el Ayuntamiento ya tiene. Simula la Agenda de Simplificación y vota qué cambiar primero.
            </span>
          </span>
          <ArrowRight className="size-6 shrink-0 text-senal" aria-hidden />
        </Link>

        <section aria-labelledby="numeros" className="mt-10 px-1">
          <h2 id="numeros" className="text-[1.625rem] leading-[1.1] font-bold tracking-[-0.015em] text-balance">
            Tramita en números
          </h2>
          <EnNumeros />
        </section>

        <section id="reportes" aria-labelledby="reportes-titulo" className="mt-10 scroll-mt-36 px-1">
          <h2 id="reportes-titulo" className="text-[1.625rem] leading-[1.1] font-bold tracking-[-0.015em] text-balance">
            Lo que reporta la gente
          </h2>
          <p className="mt-2 leading-relaxed">
            Reportes anónimos de personas que encontraron algo que no cuadra en un trámite: requisitos que no están publicados, cobros distintos o plazos vencidos.
          </p>
          <ReportesCiudadanos />
        </section>

        <section aria-labelledby="observatorio" className="mt-12 px-1">
          <h2 id="observatorio" className="text-[1.625rem] leading-[1.1] font-bold tracking-[-0.015em] text-balance">
            ¿Qué tan completo publica el Ayuntamiento sus trámites?
          </h2>
          <p className="mt-2 leading-relaxed">
            La {LEY} pide registrar, de cada trámite, sus requisitos, costo, plazo, vigencia, oficinas y fundamento legal (artículo 54). Revisamos los {r.total} trámites
            del catálogo municipal.
          </p>

          <p className="mt-6 text-[1.375rem] leading-snug font-bold text-balance">
            <span className="text-[2.75rem] leading-none tracking-[-0.03em]">{r.completos}</span> de {r.total} trámites publican los 8 datos que se pueden comprobar.{" "}
            <span className="text-senal-oscura">A {incompletos} les falta al menos uno.</span>
          </p>

          <div className="panal mt-4" role="img" aria-label={`${r.completos} trámites completos y ${incompletos} con datos faltantes, de ${r.total}`}>
            {Array.from({ length: r.total }, (_, i) => (
              <span key={i} style={{ "--i": i } as CSSProperties} className={i < r.completos ? "bg-tinta" : "bg-senal"} />
            ))}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[2px] bg-tinta" aria-hidden />
              Publica todo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[2px] bg-senal" aria-hidden />
              Le falta algún dato
            </span>
          </p>

          <h3 className="mt-10 text-lg font-bold">Qué dato falta más</h3>
          <p className="mt-1 text-[0.9375rem] leading-snug text-tinta-suave">Toca un dato para ver qué trámites no lo publican.</p>
          <ul className="mt-3">
            {r.porFraccion.map((f) => {
              const parte = f.cumplen / r.total;
              return (
                <li key={f.id} className="border-t border-linea">
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none flex-col justify-center gap-1.5 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-bold">
                          {f.corto} <span className="font-normal text-tinta-suave">· fr. {f.id}</span>
                        </span>
                        <span className="shrink-0 font-bold">
                          {f.cumplen}
                          <span className="font-normal text-tinta-suave"> de {r.total}</span>
                        </span>
                      </span>
                      <span className="block h-2 overflow-hidden rounded-full bg-linea/70" aria-hidden>
                        <span className={`block h-full rounded-full ${parte < 0.9 ? "bg-senal" : "bg-tinta"}`} style={{ width: `${parte * 100}%` }} />
                      </span>
                    </summary>
                    <div className="pb-3">
                      <p className="text-[0.9375rem] leading-snug text-tinta-suave italic">«{f.texto}»</p>
                      {f.faltan.length ? (
                        <ul className="mt-2">
                          {f.faltan.map((t) => (
                            <li key={t.clave}>
                              <Link href={`/tramite/${t.clave}`} className="flex min-h-11 items-center gap-2 py-1 leading-snug underline">
                                {t.nombre}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 font-medium">Todos los trámites lo publican.</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>

          <h3 className="mt-10 text-lg font-bold">Lo que la ley ya pide simplificar</h3>
          <ul className="mt-3">
            {simplificar.map((s) => (
              <li key={s.texto} className="flex gap-4 border-t border-linea py-4">
                <span className="w-16 shrink-0 text-[2rem] leading-none font-bold tracking-[-0.03em]">{s.cifra}</span>
                <span className="min-w-0">
                  <span className="block leading-snug font-bold">{s.texto}</span>
                  <span className="mt-1 block text-[0.9375rem] leading-snug text-tinta-suave">{s.cita}</span>
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mt-10 text-lg font-bold">Por dependencia</h3>
          <ul className="mt-3">
            {r.dependencias.map((d) => (
              <li key={d.nombre} className="flex items-center gap-3 border-t border-linea py-3">
                <span className="min-w-0 flex-1 leading-snug">{d.nombre}</span>
                <span className="shrink-0 text-right text-[0.9375rem]">
                  <span className="font-bold">
                    {d.completos} de {d.total}
                  </span>
                  <span className="block text-sm text-tinta-suave">completos</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-[14px] bg-panel p-4 text-[0.9375rem] leading-relaxed">
            <h3 className="font-bold">Cómo lo medimos</h3>
            <p className="mt-1">
              Revisamos 8 de las 15 fracciones del artículo 54 que se pueden comprobar con lo que publica el catálogo. Una vigencia «indefinida» cuenta como publicada; un
              plazo «indefinido» no, porque la ley pide el plazo para resolver. Datos consultados el {fechaLegible(FECHA_CATALOGO)}.
            </p>
            <p className="mt-2 flex flex-wrap gap-x-5">
              <a href={REPO} target="_blank" rel="noreferrer" className="flex min-h-11 items-center underline">
                Ver el cálculo (código abierto)
              </a>
              <a href={LIGA_LEY} target="_blank" rel="noreferrer" className="flex min-h-11 items-center underline">
                Leer la ley
              </a>
            </p>
          </div>
        </section>

        <section id="bitacora" aria-labelledby="bitacora-titulo" className="mt-12 scroll-mt-36 px-1">
          <h2 id="bitacora-titulo" className="text-[1.625rem] leading-[1.1] font-bold tracking-[-0.015em] text-balance">
            Bitácora del catálogo
          </h2>
          <Bitacora />
        </section>

        <Link
          href="/como-funciona"
          className="mt-8 flex min-h-16 items-center justify-between gap-3 rounded-[14px] bg-tinta px-4 py-3 text-panel transition-transform duration-150 active:scale-[0.98]"
        >
          <span>
            <span className="block font-bold">Cómo responde Sagui</span>
            <span className="block text-[0.9375rem] text-panel/80">De dónde salen sus datos, qué hace la IA y qué no</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
        <p className="mt-4 px-1 text-[0.8125rem] text-tinta-suave">Proyecto independiente de hackathon. No es un sitio oficial del Ayuntamiento de Hermosillo.</p>
      </main>
    </div>
  );
}
