"use client";

import { motion, useReducedMotion } from "motion/react";

// Sagui: saguaro y guía. Tres trazos gruesos y la misma cara en todas sus versiones.
export type EstadoSagui = "reposo" | "saluda" | "piensa" | "feliz";

const IZQ = {
  reposo: "M100 122 Q42 122 42 88",
  arriba: "M100 122 Q42 116 42 79",
  abajo: "M100 122 Q42 128 42 97",
  feliz: "M100 122 Q40 110 36 60",
};
const DER = {
  reposo: "M100 102 Q158 102 158 60",
  ola1: "M100 102 Q156 100 186 52",
  ola2: "M100 102 Q156 100 141 47",
  arriba: "M100 102 Q158 96 158 51",
  abajo: "M100 102 Q158 108 158 69",
  feliz: "M100 102 Q160 92 164 42",
};
const TINTA = "var(--tinta)";
const BRAZO = { fill: "none", stroke: "var(--senal)", strokeWidth: 25, strokeLinecap: "round" as const };

export function Sagui({ estado = "reposo", vez = 0, className = "", etiqueta }: { estado?: EstadoSagui; vez?: number; className?: string; etiqueta?: string }) {
  const reducir = useReducedMotion();

  const izq = estado === "piensa" ? [IZQ.reposo, IZQ.abajo, IZQ.arriba, IZQ.reposo] : estado === "feliz" ? IZQ.feliz : IZQ.reposo;
  const der =
    estado === "saluda"
      ? [DER.reposo, DER.ola1, DER.ola2, DER.ola1, DER.ola2, DER.reposo]
      : estado === "piensa"
        ? [DER.reposo, DER.arriba, DER.abajo, DER.reposo]
        : estado === "feliz"
          ? DER.feliz
          : DER.reposo;
  const transicion =
    estado === "piensa"
      ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const }
      : estado === "saluda"
        ? { duration: 1.6, ease: "easeInOut" as const, times: [0, 0.18, 0.4, 0.62, 0.82, 1] }
        : { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const };
  const brazo = (d: string | string[]) => (reducir ? { d: Array.isArray(d) ? d[0] : d } : { d });
  const feliz = estado === "feliz" || estado === "saluda";

  return (
    <svg viewBox="16 12 172 164" className={`sagui ${className}`} role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}>
      <g className="sagui-cuerpo" key={vez}>
        <motion.path {...BRAZO} initial={{ d: IZQ.reposo }} animate={brazo(izq)} transition={transicion} />
        <motion.path {...BRAZO} initial={{ d: DER.reposo }} animate={brazo(der)} transition={transicion} />
        <path d="M100 142 L100 60" stroke="var(--senal)" strokeWidth={60} strokeLinecap="round" />
        {estado === "feliz" ? (
          <path d="M78.5 79 Q85 68 91.5 79 M108.5 79 Q115 68 121.5 79" fill="none" stroke={TINTA} strokeWidth={5.5} strokeLinecap="round" />
        ) : (
          <g className="sagui-ojos">
            <ellipse cx="85" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
            <ellipse cx="115" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
          </g>
        )}
        {feliz ? (
          <path d="M89 91 Q100 93 111 91 Q110 106 100 106 Q90 106 89 91Z" fill={TINTA} />
        ) : (
          <path d={estado === "piensa" ? "M90 93 Q100 97 110 93" : "M90 92 Q100 105 110 92"} fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
        )}
      </g>
      {estado === "piensa" ? (
        <g fill={TINTA}>
          {[0, 1, 2].map((i) => (
            <circle key={i} className="sagui-punto" cx={132 + i * 16} cy="28" r="5.5" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
