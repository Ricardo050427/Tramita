"use client";

import { useEffect, useState } from "react";
import { fechaLegible } from "@/lib/ley";

type Numeros = { preguntas: number; verificaciones: number; noCuadran: number; pases: number; reportes: number; desde: string | null };

const n = (x: number) => x.toLocaleString("es-MX");
const plural = (x: number, uno: string, varios: string) => (x === 1 ? uno : varios);

// Lo que Tramita ha hecho por la gente, contado sin guardar quién ni qué preguntó.
export function EnNumeros() {
  const [datos, setDatos] = useState<Numeros | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    fetch("/api/metricas", { signal: control.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDatos)
      .catch(() => {
        if (!control.signal.aborted) setFallo(true);
      });
    return () => control.abort();
  }, []);

  if (fallo) return <p className="mt-2 text-tinta-suave">No pude cargar los indicadores ahora.</p>;
  if (!datos) {
    return (
      <div className="mt-3 space-y-2" aria-busy>
        <div className="h-5 w-full animate-pulse rounded-full bg-linea/60" />
        <div className="h-5 w-4/5 animate-pulse rounded-full bg-linea/60" />
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-linea/60" />
      </div>
    );
  }

  const cifra = "text-[1.625rem] leading-none font-bold tracking-[-0.02em] text-tinta";
  return (
    <>
      <p className="mt-3 text-[1.1875rem] leading-[1.6] text-pretty text-tinta-suave">
        {datos.desde ? `Desde el ${fechaLegible(datos.desde)}, ` : "Hasta ahora, "}
        Sagui respondió <span className={cifra}>{n(datos.preguntas)}</span> {plural(datos.preguntas, "pregunta", "preguntas")}, revisó{" "}
        <span className={cifra}>{n(datos.verificaciones)}</span> {plural(datos.verificaciones, "lista de ventanilla", "listas de ventanilla")} y encontró{" "}
        <span className={`${cifra} text-error`}>{n(datos.noCuadran)}</span> {plural(datos.noCuadran, "cosa que no cuadraba", "cosas que no cuadraban")} con la ficha
        oficial. Se {plural(datos.pases, "abrió", "abrieron")} <span className={cifra}>{n(datos.pases)}</span> {plural(datos.pases, "pase", "pases")} en ventanilla y{" "}
        {plural(datos.reportes, "llegó", "llegaron")} <span className={cifra}>{n(datos.reportes)}</span> {plural(datos.reportes, "reporte anónimo", "reportes anónimos")}.
      </p>
      <p className="mt-2 text-sm text-tinta-suave">Se cuenta cuántas veces pasó cada cosa, nunca quién la hizo ni qué escribió.</p>
    </>
  );
}
