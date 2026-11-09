"use client";

import { motion } from "motion/react";
import { Info, Signpost } from "lucide-react";
import type { Bloque } from "@/lib/tipos";

const entrada = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const },
};

export function Bloques({ bloques }: { bloques: Bloque[] }) {
  let numeroPaso = 0;
  return (
    <div className="space-y-2.5">
      {bloques.map((b, i) => {
        if (b.tipo === "resumen") {
          return (
            <motion.p key={i} {...entrada} className="leading-relaxed">
              {b.d}
            </motion.p>
          );
        }
        if (b.tipo === "camino") {
          const corte = b.d.indexOf(":");
          return (
            <motion.div key={i} {...entrada} className="flex items-start gap-3 rounded-[10px] bg-panel px-3.5 py-3">
              <Signpost className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="min-w-0 leading-snug">
                {corte > 0 ? (
                  <>
                    <span className="font-bold">{b.d.slice(0, corte)}.</span> {b.d.slice(corte + 1).trim()}
                  </>
                ) : (
                  b.d
                )}
              </p>
            </motion.div>
          );
        }
        if (b.tipo === "paso") {
          numeroPaso += 1;
          return (
            <motion.div key={i} {...entrada} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-[6px] bg-tinta text-[0.9375rem] font-bold text-panel">{numeroPaso}</span>
              <p className="min-w-0 pt-0.5 leading-snug">{b.d}</p>
            </motion.div>
          );
        }
        return (
          <motion.div key={i} {...entrada} className="flex items-start gap-3 rounded-[10px] bg-senal/20 px-3.5 py-3">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="min-w-0 leading-snug font-medium">{b.d}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
