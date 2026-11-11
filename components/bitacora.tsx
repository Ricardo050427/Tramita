import Link from "next/link";
import crudo from "@/data/bitacora.json";
import { fechaLegible } from "@/lib/ley";

type Cambio = {
  fecha: string;
  clave: string;
  nombre: string;
  campo: string;
  texto: string;
  antes?: string;
  ahora?: string;
  agregados?: string[];
  quitados?: string[];
};
type Bitacora = { revisado: string; revisados: number; desde: string; cambios: Cambio[] };

const ARCHIVO = "https://github.com/Ricardo050427/Tramita/blob/main/data/bitacora.json";
const VISIBLES = 12;

const momento = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Hermosillo" }).format(new Date(iso));

export function Bitacora() {
  const datos = crudo as Bitacora;
  const cambios = datos.cambios.slice(0, VISIBLES);

  return (
    <>
      <p className="mt-2 leading-relaxed">
        Cada mañana Tramita revisa el catálogo oficial del Ayuntamiento y anota aquí lo que cambió: costos, plazos, vigencias, horarios y requisitos. Así queda registro
        público de cada cambio.
      </p>
      <p className="mt-3 text-[0.9375rem] text-tinta-suave">
        Última revisión: {momento(datos.revisado)}, {datos.revisados} trámites.
      </p>

      {cambios.length ? (
        <ol className="mt-3">
          {cambios.map((c, i) => (
            <li key={`${c.clave}-${c.campo}-${c.fecha}-${i}`} className="border-t border-linea py-3.5">
              <p className="text-sm text-tinta-suave">{fechaLegible(c.fecha)}</p>
              <Link href={`/tramite/${c.clave}`} className="mt-0.5 block leading-snug font-bold underline">
                {c.nombre}
              </Link>
              <p className="mt-0.5 leading-snug">{c.texto}</p>
              {c.antes !== undefined ? (
                <div className="mt-1.5 grid gap-1 text-[0.9375rem] leading-snug">
                  <p>
                    <span className="text-tinta-suave">Antes: </span>
                    <span className="text-tinta-suave line-through decoration-error/60">{c.antes || "(vacío)"}</span>
                  </p>
                  <p>
                    <span className="text-tinta-suave">Ahora: </span>
                    <span className="font-medium">{c.ahora || "(vacío)"}</span>
                  </p>
                </div>
              ) : null}
              {c.agregados?.length || c.quitados?.length ? (
                <ul className="mt-1.5 space-y-0.5 text-[0.9375rem] leading-snug">
                  {c.agregados?.map((l) => (
                    <li key={`+${l}`} className="font-medium text-bien">
                      Se agregó: {l}
                    </li>
                  ))}
                  {c.quitados?.map((l) => (
                    <li key={`-${l}`} className="text-error">
                      Se quitó: {l}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 rounded-[14px] bg-panel p-4 leading-snug">
          <span className="font-bold">Sin cambios desde el {fechaLegible(datos.desde)}.</span> El catálogo oficial dice lo mismo que la copia que usa Tramita.
        </p>
      )}

      <a href={ARCHIVO} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center underline">
        Ver la bitácora completa (datos abiertos)
      </a>
    </>
  );
}
