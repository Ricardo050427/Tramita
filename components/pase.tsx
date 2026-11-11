"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Printer, Share2 } from "lucide-react";
import { nombreRequisito } from "@/lib/observatorio";
import type { Requisito } from "@/lib/tipos";

const suscribir = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};

function leer(clave: string) {
  try {
    return localStorage.getItem(`tramita:lista:${clave}`) ?? "[]";
  } catch {
    return "[]";
  }
}

const cantidad = (r: Requisito) => /^\s*(\d+\s*(?:copias?|originale?s?))\b/i.exec(r.detalle ?? "")?.[1].toLowerCase();

// Los requisitos que la persona ya marcó en su lista aparecen palomeados en el pase.
export function RequisitosPase({ clave, requisitos }: { clave: string; requisitos: Requisito[] }) {
  const crudo = useSyncExternalStore(suscribir, () => leer(clave), () => "[]");
  let marcados: number[] = [];
  try {
    marcados = JSON.parse(crudo);
  } catch {}
  const listos = requisitos.filter((_, i) => marcados.includes(i)).length;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.8125rem] font-bold tracking-[0.06em] text-tinta-suave uppercase">Requisitos publicados</h2>
        {listos ? (
          <span className="text-sm font-bold">
            Llevo {listos} de {requisitos.length}
          </span>
        ) : null}
      </div>
      <ol className="mt-2 space-y-2">
        {requisitos.map((r, i) => {
          const listo = marcados.includes(i);
          return (
            <li key={i} className="flex items-start gap-2.5 leading-snug">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[4px] border-2 border-tinta ${listo ? "bg-tinta" : ""}`} aria-hidden>
                {listo ? <Check className="size-3.5 text-senal" strokeWidth={3.5} /> : null}
              </span>
              <span>
                <span className="font-medium">{nombreRequisito(r)}</span>
                {cantidad(r) ? <span className="text-tinta-suave"> · {cantidad(r)}</span> : null}
                {listo ? <span className="sr-only"> (listo)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export function AccionesPase({ titulo, url }: { titulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: `Requisitos oficiales de ${titulo}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {}
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={compartir} className="flex min-h-11 items-center gap-1.5 rounded-full bg-panel px-4 font-bold transition-transform duration-150 active:scale-[0.96]">
        <Share2 className="size-4" aria-hidden />
        {copiado ? "Liga copiada" : "Compartir"}
      </button>
      <button type="button" onClick={() => window.print()} className="flex min-h-11 items-center gap-1.5 rounded-full bg-panel px-4 font-bold transition-transform duration-150 active:scale-[0.96]">
        <Printer className="size-4" aria-hidden />
        Imprimir
      </button>
    </div>
  );
}
