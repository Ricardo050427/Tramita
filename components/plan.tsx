"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { alternarPaso } from "@/lib/mis-tramites";
import type { PasoPlan, Plan } from "@/lib/tipos";

const CASO = "tramita:caso";
const DIA_MS = 86_400_000;

export function leerCaso(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CASO) ?? "{}");
  } catch {
    return {};
  }
}

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: n % 1 ? 2 : 0 });

function costoVisible(p: PasoPlan) {
  if (!p.estimado) return "Costo por confirmar";
  if (p.estimado.max === 0) return "Sin costo";
  return p.estimado.min === p.estimado.max ? `Aprox. ${pesos(p.estimado.min)}` : `Aprox. ${pesos(p.estimado.min)} a ${pesos(p.estimado.max)}`;
}

/** Días que le quedan a un documento marcado; null si no caduca o no se sabe. */
export function diasRestantes(p: Pick<PasoPlan, "vigencia">, fecha: string) {
  const inicio = new Date(fecha);
  if (p.vigencia === "mes") {
    const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59);
    return Math.ceil((fin.getTime() - Date.now()) / DIA_MS);
  }
  if (typeof p.vigencia !== "number") return null;
  return Math.ceil((inicio.getTime() + p.vigencia * DIA_MS - Date.now()) / DIA_MS);
}

export function avisoVigencia(dias: number | null) {
  if (dias === null) return null;
  if (dias < 0) return { texto: "Ya venció, tendrás que renovarlo", urgente: true };
  if (dias === 0) return { texto: "Vence hoy", urgente: true };
  return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, urgente: dias <= 7 };
}

export function mensajePlan(plan: Plan, caso: Record<string, string>) {
  const siguiente = plan.pasos.findIndex((p) => !caso[p.clave]);
  if (siguiente < 0) return "Plan completo";
  return `Paso ${siguiente + 1} de ${plan.pasos.length}`;
}

export function TarjetaPlan({ plan, alCambiar }: { plan: Plan; alCambiar?: (mensaje: string) => void }) {
  const [caso, setCaso] = useState<Record<string, string>>({});

  useEffect(() => {
    const guardado = leerCaso();
    setCaso(guardado);
    alCambiar?.(mensajePlan(plan, guardado));
  }, [plan, alCambiar]);

  function alternar(paso: PasoPlan) {
    navigator.vibrate?.(8);
    const { clave } = paso;
    const siguiente = { ...caso };
    if (siguiente[clave]) delete siguiente[clave];
    else siguiente[clave] = new Date().toISOString();
    setCaso(siguiente);
    alCambiar?.(mensajePlan(plan, siguiente));
    try {
      localStorage.setItem(CASO, JSON.stringify(siguiente));
    } catch {}
    alternarPaso(paso, siguiente[clave] ?? null);
  }

  const hechos = plan.pasos.filter((p) => caso[p.clave]).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] border-2 border-tinta bg-panel px-4 pt-3.5 pb-3"
    >
      <h2 className="text-lg leading-snug font-bold text-balance">Tu ruta para {(plan.meta.charAt(0).toLowerCase() + plan.meta.slice(1)).replace(/s*(.*)s*$/, "")}</h2>
      <p className="mt-0.5 text-[0.9375rem] text-tinta-suave">
        {hechos} de {plan.pasos.length} pasos listos
      </p>

      <ol className="mt-3">
        {plan.pasos.map((p, i) => {
          const fecha = caso[p.clave];
          const aviso = fecha ? avisoVigencia(diasRestantes(p, fecha)) : null;
          const ultimo = i === plan.pasos.length - 1;
          return (
            <li key={p.clave} className="relative flex gap-3 pb-4 last:pb-0">
              {!ultimo ? <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-linea" /> : null}
              <span
                className={`z-[1] grid size-9 shrink-0 place-items-center rounded-[8px] text-[0.9375rem] font-bold transition-colors duration-150 ${
                  fecha ? "bg-bien text-panel" : "bg-tinta text-panel"
                }`}
              >
                {fecha ? <Check className="size-5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/tramite/${p.clave}`} className="leading-snug font-bold underline">
                  {p.nombre}
                </Link>
                <p className="mt-0.5 text-[0.9375rem] leading-snug text-tinta-suave">{p.dependencia}</p>
                <p className="text-[0.9375rem] leading-snug">{costoVisible(p)}</p>
                {!fecha && p.vigencia ? (
                  <p className="text-[0.9375rem] leading-snug text-tinta-suave">
                    {p.vigencia === "mes" ? "Solo sirve durante el mes en que la sacas" : `Dura ${p.vigencia} días: sácalo cuando vayas a usarlo`}
                  </p>
                ) : null}
                {aviso ? <p className={`text-[0.9375rem] leading-snug font-medium ${aviso.urgente ? "text-error" : "text-bien"}`}>{aviso.texto}</p> : null}
                <button type="button" aria-pressed={Boolean(fecha)} onClick={() => alternar(p)} className="mt-0.5 min-h-11 font-bold underline">
                  {fecha ? "Desmarcar" : "Ya lo tengo"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 border-t border-linea pt-2.5 text-[0.9375rem] leading-snug">
        {plan.total.max > 0 ? (
          <p className="font-bold">
            {plan.sinCalcular ? "Suma de lo que se puede calcular" : "Total estimado"}: {plan.total.min === plan.total.max ? pesos(plan.total.min) : `${pesos(plan.total.min)} a ${pesos(plan.total.max)}`}
          </p>
        ) : null}
        {plan.sinCalcular ? (
          <p className="text-tinta-suave">
            {plan.sinCalcular === 1 ? "Falta 1 costo" : `Faltan ${plan.sinCalcular} costos`} por confirmar{plan.metros ? "" : "; varios dependen de los metros de tu proyecto"}.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-tinta-suave">Cálculo orientativo con las tarifas publicadas. Confírmalo en la dependencia.</p>
      </div>
    </motion.section>
  );
}
