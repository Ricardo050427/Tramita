"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Sagui: saguaro y guía. Tres trazos gruesos y la misma cara en todas sus versiones.
// Cada parte se mueve con su propio ritmo para que el conjunto nunca se repita igual.
export type EstadoSagui = "reposo" | "saluda" | "piensa" | "feliz";

const IZQ = {
  reposo: "M100 122 Q42 122 42 88",
  sube: "M100 122 Q42 117 42 81",
  baja: "M100 122 Q43 125 44 93",
  arriba: "M100 122 Q42 116 42 79",
  abajo: "M100 122 Q42 128 42 97",
  atento: "M100 122 Q44 112 44 72",
  feliz: "M100 122 Q40 110 36 60",
};
const DER = {
  reposo: "M100 102 Q158 102 158 60",
  ola1: "M100 102 Q156 100 186 52",
  ola2: "M100 102 Q156 100 141 47",
  sube: "M100 102 Q158 97 158 53",
  arriba: "M100 102 Q158 96 158 51",
  abajo: "M100 102 Q158 108 158 69",
  atento: "M100 102 Q156 94 158 46",
  feliz: "M100 102 Q160 92 164 42",
};
const TINTA = "var(--tinta)";
const BRAZO = { fill: "none", stroke: "var(--senal)", strokeWidth: 25, strokeLinecap: "round" as const };
const rebote = [0.34, 1.56, 0.64, 1] as const;
const sinFin = (duration: number, times: number[]) => ({ duration, times, repeat: Infinity, ease: "easeInOut" as const });

// Espera: un saludo, brazos que suben y bajan a destiempo, y otra vez el saludo al rato.
const ESPERA_DER = {
  d: [DER.reposo, DER.ola1, DER.ola2, DER.ola1, DER.ola2, DER.reposo, DER.reposo, DER.sube, DER.reposo, DER.reposo, DER.sube, DER.reposo, DER.reposo],
  t: [0, 0.035, 0.075, 0.115, 0.155, 0.2, 0.36, 0.45, 0.54, 0.7, 0.8, 0.9, 1],
};
const ESPERA_IZQ = { d: [IZQ.reposo, IZQ.sube, IZQ.reposo, IZQ.baja, IZQ.reposo], t: [0, 0.28, 0.5, 0.78, 1] };
const MIRADA = {
  x: [0, 0, -3.5, -3.5, 0, 0, 3, 3, 0, 0],
  y: [0, 0, 0, 0, 0, -2.5, -2.5, 0, 0, 0],
  t: [0, 0.12, 0.18, 0.34, 0.4, 0.55, 0.61, 0.76, 0.82, 1],
};

export function Sagui({
  estado = "saluda",
  vez = 0,
  atento = false,
  mirar = false,
  className = "",
  etiqueta,
}: {
  estado?: EstadoSagui;
  /** Cambia para repetir el saltito, por ejemplo al tocarlo. */
  vez?: number;
  /** Mira hacia el campo de pregunta mientras la persona escribe. */
  atento?: boolean;
  /** Sigue con los ojos el dedo o el cursor. */
  mirar?: boolean;
  className?: string;
  etiqueta?: string;
}) {
  const reducir = useReducedMotion();
  const lienzo = useRef<SVGSVGElement>(null);
  const [mira, setMira] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mirar || reducir) return;
    let olvido: ReturnType<typeof setTimeout>;
    let cuadro = 0;
    const seguir = (e: PointerEvent) => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const caja = lienzo.current?.getBoundingClientRect();
        if (!caja) return;
        const dx = e.clientX - (caja.left + caja.width / 2);
        const dy = e.clientY - (caja.top + caja.height * 0.38);
        const d = Math.max(1, Math.hypot(dx, dy));
        const fuerza = Math.min(1, d / 160);
        setMira({ x: (dx / d) * 4.5 * fuerza, y: (dy / d) * 3.5 * fuerza });
      });
      clearTimeout(olvido);
      olvido = setTimeout(() => setMira(null), 1600);
    };
    window.addEventListener("pointermove", seguir, { passive: true });
    window.addEventListener("pointerdown", seguir, { passive: true });
    return () => {
      window.removeEventListener("pointermove", seguir);
      window.removeEventListener("pointerdown", seguir);
      cancelAnimationFrame(cuadro);
      clearTimeout(olvido);
    };
  }, [mirar, reducir]);

  const feliz = estado === "feliz";
  const piensa = estado === "piensa";

  // Brazos
  let izq, der;
  if (feliz) {
    izq = { animate: { d: IZQ.feliz }, transition: { duration: 0.4, ease: rebote } };
    der = { animate: { d: DER.feliz }, transition: { duration: 0.4, ease: rebote } };
  } else if (piensa) {
    izq = { animate: { d: [IZQ.reposo, IZQ.abajo, IZQ.arriba, IZQ.reposo] }, transition: sinFin(1.2, [0, 0.3, 0.7, 1]) };
    der = { animate: { d: [DER.reposo, DER.arriba, DER.abajo, DER.reposo] }, transition: sinFin(1.2, [0, 0.3, 0.7, 1]) };
  } else if (atento) {
    izq = { animate: { d: [IZQ.atento, IZQ.sube, IZQ.atento] }, transition: sinFin(1.6, [0, 0.5, 1]) };
    der = { animate: { d: [DER.atento, DER.sube, DER.atento] }, transition: sinFin(1.9, [0, 0.5, 1]) };
  } else {
    izq = { animate: { d: ESPERA_IZQ.d }, transition: sinFin(7.3, ESPERA_IZQ.t) };
    der = { animate: { d: ESPERA_DER.d }, transition: sinFin(estado === "reposo" ? 14 : 11, ESPERA_DER.t) };
  }

  // Mirada
  const ojos = mira
    ? { animate: { x: mira.x, y: mira.y }, transition: { type: "spring" as const, stiffness: 260, damping: 22 } }
    : atento
      ? { animate: { x: 0, y: 4 }, transition: { duration: 0.35 } }
      : piensa
        ? { animate: { x: [-4, 4, -4], y: -3 }, transition: { x: sinFin(2.4, [0, 0.5, 1]), y: { duration: 0.3 } } }
        : { animate: { x: MIRADA.x, y: MIRADA.y }, transition: sinFin(9.1, MIRADA.t) };

  // Balanceo desde los pies
  const vaiven = piensa
    ? { animate: { rotate: [-3, 3, -3] }, transition: sinFin(1.8, [0, 0.5, 1]) }
    : atento
      ? { animate: { rotate: 2.5 }, transition: { duration: 0.5, ease: rebote } }
      : { animate: { rotate: [0, -2.4, 0, 2, 0] }, transition: sinFin(6.2, [0, 0.25, 0.5, 0.75, 1]) };

  const quieto = { animate: undefined, transition: undefined };
  const mueve = <T,>(m: T) => (reducir ? quieto : m);
  const base = { originX: "50%", originY: "100%" };

  return (
    <svg ref={lienzo} viewBox="16 12 172 164" className={`sagui ${className}`} role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}>
      <motion.g
        key={vez}
        style={base}
        animate={reducir || piensa ? undefined : { y: [0, 3, -16, 0, 0], scaleY: [1, 0.88, 1.07, 0.93, 1], scaleX: [1, 1.09, 0.95, 1.05, 1] }}
        transition={{ duration: 0.75, times: [0, 0.16, 0.46, 0.76, 1], ease: "easeOut" }}
      >
        <motion.g style={base} {...mueve(vaiven)}>
          <g className="sagui-cuerpo">
            <motion.path {...BRAZO} initial={{ d: IZQ.reposo }} {...mueve(izq)} />
            <motion.path {...BRAZO} initial={{ d: DER.reposo }} {...mueve(der)} />
            <path d="M100 142 L100 60" stroke="var(--senal)" strokeWidth={60} strokeLinecap="round" />
            {feliz ? (
              <path d="M78.5 79 Q85 68 91.5 79 M108.5 79 Q115 68 121.5 79" fill="none" stroke={TINTA} strokeWidth={5.5} strokeLinecap="round" />
            ) : (
              <motion.g {...mueve(ojos)}>
                <g className="sagui-ojos">
                  <ellipse cx="85" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
                  <ellipse cx="115" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
                </g>
              </motion.g>
            )}
            {feliz ? (
              <path d="M89 91 Q100 93 111 91 Q110 106 100 106 Q90 106 89 91Z" fill={TINTA} />
            ) : atento ? (
              <ellipse cx="100" cy="97" rx="5.5" ry="6" fill={TINTA} />
            ) : (
              <path d={piensa ? "M90 93 Q100 97 110 93" : "M90 92 Q100 105 110 92"} fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
            )}
          </g>
        </motion.g>
      </motion.g>
      {piensa ? (
        <g fill={TINTA}>
          {[0, 1, 2].map((i) => (
            <circle key={i} className="sagui-punto" cx={132 + i * 16} cy="28" r="5.5" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
