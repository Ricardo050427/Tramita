import crudo from "@/data/examen.json";

type Resultado = { pregunta: string; esperadas: string[]; obtenidas: string[]; primero: boolean; enLista: boolean; ms: number; primeraMs: number | null };
type Examen = { fecha: string; total: number; primero: number; enLista: number; medianaMs: number; p90Ms: number; resultados: Resultado[] };

const ARCHIVO = "https://github.com/Ricardo050427/Tramita/blob/main/data/examen.json";
const segundos = (ms: number) => `${(ms / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} s`;

// El examen se publica completo, también lo que falló.
export function ResultadoExamen() {
  const e = crudo as Examen;
  const fallas = e.resultados.filter((r) => !r.enLista);
  const fecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Hermosillo" }).format(new Date(e.fecha));

  return (
    <>
      <p className="mt-2 leading-relaxed">
        Le hicimos {e.total} preguntas como las haría la gente, cada una con el trámite correcto anotado de antemano. Incluye casos que no son del Ayuntamiento, como el
        pasaporte. Examen del {fecha}.
      </p>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-linea rounded-[14px] bg-panel py-3">
        <div className="px-3">
          <dt className="text-sm leading-tight text-tinta-suave">Trámite correcto primero</dt>
          <dd className="mt-1 text-[1.5rem] leading-none font-bold">
            {e.primero}
            <span className="text-base font-normal text-tinta-suave"> de {e.total}</span>
          </dd>
        </div>
        <div className="px-3">
          <dt className="text-sm leading-tight text-tinta-suave">Entre lo que muestra</dt>
          <dd className="mt-1 text-[1.5rem] leading-none font-bold">
            {e.enLista}
            <span className="text-base font-normal text-tinta-suave"> de {e.total}</span>
          </dd>
        </div>
        <div className="px-3">
          <dt className="text-sm leading-tight text-tinta-suave">Primera respuesta</dt>
          <dd className="mt-1 text-[1.5rem] leading-none font-bold">{segundos(e.medianaMs)}</dd>
          <dd className="mt-1 text-[0.8125rem] leading-tight text-tinta-suave">a la mitad de las preguntas</dd>
        </div>
      </dl>
      {fallas.length ? (
        <details className="group mt-3 rounded-[14px] bg-panel px-4 py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
            {fallas.length === 1 ? "La pregunta que falló" : `Las ${fallas.length} preguntas que fallaron`}
          </summary>
          <ul className="pb-3">
            {fallas.map((r) => (
              <li key={r.pregunta} className="border-t border-linea py-2 text-[0.9375rem] leading-snug">
                «{r.pregunta}»
                <span className="block text-tinta-suave">
                  Esperado {r.esperadas.join(" o ") || "ningún trámite del Ayuntamiento"}; mostró {r.obtenidas.join(", ") || "ninguno"}.
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <a href={ARCHIVO} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center underline">
        Ver las {e.total} preguntas y respuestas
      </a>
    </>
  );
}
