"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { buscar } from "@/lib/buscar";
import type { EntradaIndice } from "@/lib/tipos";

// Los trámites donde más se piden cosas de más: abrir un negocio, construir y las constancias.
const FRECUENTES = ["HMO-00420", "HMO-00186", "HMO-00227", "HMO-00033"];

export function BuscadorVerificar({ indice }: { indice: EntradaIndice[] }) {
  const [consulta, setConsulta] = useState("");
  const diferida = useDeferredValue(consulta);
  const resultados = useMemo(() => {
    if (diferida.trim().length < 2) return FRECUENTES.flatMap((c) => indice.filter((e) => e.c === c));
    return buscar(diferida, indice, 6).map((r) => r.item);
  }, [diferida, indice]);

  return (
    <div className="mt-3">
      <label htmlFor="buscar-verificar" className="sr-only">
        Busca tu trámite
      </label>
      <div className="flex min-h-13 items-center gap-2 rounded-[10px] border-2 border-linea bg-panel px-3 transition-colors duration-150 focus-within:border-tinta">
        <Search className="size-5 shrink-0 text-tinta-suave" aria-hidden />
        <input
          id="buscar-verificar"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Busca tu trámite: licencia, constancia, predial…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tinta-suave"
        />
      </div>
      <p className="mt-3 text-sm text-tinta-suave" aria-live="polite">
        {diferida.trim().length < 2 ? "Los que más se consultan" : resultados.length ? "Elige el tuyo" : "No encontré ese trámite. Prueba con otra palabra."}
      </p>
      <ul className="mt-1">
        {resultados.map((e) => (
          <li key={e.c} className="border-t border-linea first:border-t-0">
            <Link href={`/tramite/${e.c}/verificar`} className="fila-senal flex min-h-13 items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 leading-snug font-medium">{e.n}</span>
              <ArrowRight className="flecha size-5 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
