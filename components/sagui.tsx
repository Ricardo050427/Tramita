"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Sagui: saguaro y guía. Tres trazos gruesos y la misma cara en todas sus versiones.
// Cada parte se mueve con su propio ritmo para que el conjunto nunca se repita igual.
export type EstadoSagui = "reposo" | "saluda" | "piensa" | "feliz";
type Fase = "intro" | "espera" | "vuelve";

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
const BORDE = 6.5;
const SILUETA = { ...BRAZO, stroke: "#fff", strokeWidth: 25 + BORDE * 2 };
const rebote = [0.34, 1.56, 0.64, 1] as const;
const suaveFinal = [0.22, 1, 0.36, 1] as const;
const sinFin = (duration: number, times: number[]) => ({ duration, times, repeat: Infinity, ease: "easeInOut" as const });
const fundido = { duration: 0.22 };

// ---- Saludo inicial: la misma coreografía del video, muestreada cada 50 ms ----
const INTRO = 3.1;
const n = (x: number) => Math.round(x * 100) / 100;
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const salida = (x: number) => 1 - Math.pow(1 - x, 3);
const suave = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const conRebote = (x: number) => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2);
function kf(t: number, claves: [number, number, ((x: number) => number)?][]) {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 1; i < claves.length; i++) {
    const [t1, v1, f = suave] = claves[i];
    const [t0, v0] = claves[i - 1];
    if (t <= t1) return lerp(v0, v1, f(Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))));
  }
  return claves[claves.length - 1][1];
}
const mezcla = (a: number[], b: number[], x: number) => [lerp(a[0], b[0], x), lerp(a[1], b[1], x)];
function gira([x, y]: number[], [cx, cy]: number[], grados: number) {
  const a = (grados * Math.PI) / 180;
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
}
const camino = (h: number[], c: number[], m: number[]) => `M${h[0]} ${h[1]} Q${n(c[0])} ${n(c[1])} ${n(m[0])} ${n(m[1])}`;

const INTRO_KF = (() => {
  const pasos = Math.round(INTRO / 0.05);
  const r = { tiempos: [] as number[], izq: [] as string[], der: [] as string[], giro: [] as number[], escala: [] as number[], boca: [] as number[], ojos: [] as number[] };
  for (let i = 0; i <= pasos; i++) {
    const t = (i / pasos) * INTRO;
    const entrada = kf(t, [[0.1, 0], [0.6, 1, conRebote]]);
    const saludo = kf(t, [[1.0, 0], [1.25, 1, salida], [2.8, 1], [3.05, 0]]);
    const onda = Math.sin(((t - 1.15) / 0.36) * Math.PI) * 26;
    const ci = mezcla([74, 140], [42, 122], entrada);
    const mi = mezcla([70, 150], [42, 88], entrada);
    let cd = mezcla([126, 120], [158, 102], entrada);
    let md = mezcla([130, 130], [158, 60], entrada);
    md = mezcla(md, gira([164, 44], [158, 96], onda), saludo);
    cd = mezcla(cd, [156, 100], saludo);
    const parpadeo = Math.min(...[0.75, 2.75].map((b) => Math.min(1, Math.abs(t - b) / 0.09)));
    r.tiempos.push(i / pasos);
    r.izq.push(camino([100, 122], ci, mi));
    r.der.push(camino([100, 102], cd, md));
    r.giro.push(n(kf(t, [[1.0, 0], [1.25, -3], [2.8, -3], [3.05, 0]])));
    r.escala.push(n(Math.max(0, kf(t, [[0, 0], [0.5, 1, conRebote]]))));
    r.boca.push(n(kf(t, [[1.0, 0], [1.2, 1], [2.8, 1], [3.0, 0]])));
    r.ojos.push(n(Math.max(0.12, parpadeo)));
  }
  return r;
})();
const lineal = (duracion: number) => ({ duration: duracion, times: INTRO_KF.tiempos, ease: "linear" as const });

// ---- Espera: brazos que suben y bajan a destiempo, y un saludo al final del ciclo ----
const ESPERA_DER = {
  d: [DER.reposo, DER.sube, DER.reposo, DER.reposo, DER.sube, DER.reposo, DER.reposo, DER.ola1, DER.ola2, DER.ola1, DER.ola2, DER.reposo, DER.reposo],
  t: [0, 0.09, 0.18, 0.34, 0.43, 0.52, 0.7, 0.735, 0.775, 0.815, 0.855, 0.9, 1],
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
  contorno = false,
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
  /** Borde blanco alrededor de la silueta, para fondos de color. */
  contorno?: boolean;
}) {
  const reducir = useReducedMotion();
  const lienzo = useRef<SVGSVGElement>(null);
  const [mira, setMira] = useState<{ x: number; y: number } | null>(null);
  const [fase, setFase] = useState<Fase>(() => (estado === "saluda" ? "intro" : "espera"));
  const [previo, setPrevio] = useState(estado);

  // Al dejar de estar feliz regresa con calma antes de retomar su ciclo.
  if (estado !== previo) {
    setPrevio(estado);
    if (previo === "feliz") setFase("vuelve");
  }

  useEffect(() => {
    if (fase === "espera") return;
    const espera = setTimeout(() => setFase("espera"), fase === "intro" ? INTRO * 1000 : 600);
    return () => clearTimeout(espera);
  }, [fase]);

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
        // En cuartos de unidad: con mouse o trackpad llegan movimientos en cada cuadro y casi nunca cambian la mirada.
        const x = Math.round((dx / d) * 4.5 * fuerza * 4) / 4;
        const y = Math.round((dy / d) * 3.5 * fuerza * 4) / 4;
        setMira((m) => (m?.x === x && m.y === y ? m : { x, y }));
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
  const intro = !reducir && fase === "intro" && !feliz;
  const vuelve = !reducir && fase === "vuelve" && !feliz;

  // Brazos
  let izq, der;
  if (intro) {
    izq = { animate: { d: INTRO_KF.izq }, transition: lineal(INTRO) };
    der = { animate: { d: INTRO_KF.der }, transition: lineal(INTRO) };
  } else if (feliz) {
    izq = { animate: { d: IZQ.feliz }, transition: { duration: 0.4, ease: rebote } };
    der = { animate: { d: DER.feliz }, transition: { duration: 0.4, ease: rebote } };
  } else if (vuelve) {
    izq = { animate: { d: IZQ.reposo }, transition: { duration: 0.55, ease: suaveFinal } };
    der = { animate: { d: DER.reposo }, transition: { duration: 0.55, ease: suaveFinal } };
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
  const ojos =
    intro || vuelve || feliz
      ? { animate: { x: 0, y: 0 }, transition: { duration: 0.4, ease: suaveFinal } }
      : mira
        ? { animate: { x: mira.x, y: mira.y }, transition: { type: "spring" as const, stiffness: 260, damping: 22 } }
        : atento
          ? { animate: { x: 0, y: 4 }, transition: { duration: 0.35 } }
          : piensa
            ? { animate: { x: [-4, 4, -4], y: -3 }, transition: { x: sinFin(2.4, [0, 0.5, 1]), y: { duration: 0.3 } } }
            : { animate: { x: MIRADA.x, y: MIRADA.y }, transition: sinFin(9.1, MIRADA.t) };

  // Balanceo desde los pies
  const vaiven = intro
    ? { animate: { rotate: INTRO_KF.giro }, transition: lineal(INTRO) }
    : vuelve || feliz
      ? { animate: { rotate: 0 }, transition: { duration: 0.5, ease: suaveFinal } }
      : piensa
        ? { animate: { rotate: [-3, 3, -3] }, transition: sinFin(1.8, [0, 0.5, 1]) }
        : atento
          ? { animate: { rotate: 2.5 }, transition: { duration: 0.5, ease: rebote } }
          : { animate: { rotate: [0, -2.4, 0, 2, 0] }, transition: sinFin(6.2, [0, 0.25, 0.5, 0.75, 1]) };

  // Cara: los gestos se funden en lugar de cambiar de golpe.
  const bocaAbierta = intro ? { animate: { opacity: INTRO_KF.boca }, transition: lineal(INTRO) } : { animate: { opacity: feliz ? 1 : 0 }, transition: fundido };
  const sonrisa = intro
    ? { animate: { opacity: INTRO_KF.boca.map((b) => n(1 - b)) }, transition: lineal(INTRO) }
    : { animate: { opacity: feliz || atento || piensa ? 0 : 1 }, transition: fundido };
  const parpadeo = intro ? { animate: { scaleY: INTRO_KF.ojos }, transition: lineal(INTRO) } : { animate: { scaleY: 1 }, transition: fundido };

  const quieto = { animate: undefined, transition: undefined };
  const mueve = <T,>(m: T) => (reducir ? quieto : m);
  const base = { originX: "50%", originY: "100%" };
  const salto = { y: [0, 3, -16, 0, 0], scaleY: [1, 0.88, 1.07, 0.93, 1], scaleX: [1, 1.09, 0.95, 1.05, 1], scale: 1, transition: { duration: 0.75, times: [0, 0.16, 0.46, 0.76, 1], ease: "easeOut" as const } };
  const aparece = { scale: INTRO_KF.escala, transition: lineal(INTRO) };
  const variantes = { [`v${vez}`]: vez === 0 ? (intro ? aparece : { scale: 1 }) : salto };

  return (
    <svg ref={lienzo} viewBox="16 12 172 164" className={`sagui ${className}`} role={etiqueta ? "img" : undefined} aria-label={etiqueta} aria-hidden={etiqueta ? undefined : true}>
      <motion.g
        style={base}
        variants={reducir ? undefined : variantes}
        initial={intro ? { scale: 0 } : false}
        animate={reducir ? undefined : `v${vez}`}
      >
        <motion.g style={base} {...mueve(vaiven)}>
          {contorno ? (
            // Sombra plana y borde blanco hechos con la misma silueta más gruesa: siguen sus movimientos sin filtros,
            // que en pantallas de alta densidad se recalculan en cada cuadro y traban la animación.
            <>
              <g transform="translate(0 7)" opacity={0.2}>
                <motion.path {...SILUETA} stroke={TINTA} initial={{ d: intro ? INTRO_KF.izq[0] : IZQ.reposo }} {...mueve(izq)} />
                <motion.path {...SILUETA} stroke={TINTA} initial={{ d: intro ? INTRO_KF.der[0] : DER.reposo }} {...mueve(der)} />
                <path d="M100 142 L100 60" stroke={TINTA} strokeWidth={60 + BORDE * 2} strokeLinecap="round" />
              </g>
              <motion.path {...SILUETA} initial={{ d: intro ? INTRO_KF.izq[0] : IZQ.reposo }} {...mueve(izq)} />
              <motion.path {...SILUETA} initial={{ d: intro ? INTRO_KF.der[0] : DER.reposo }} {...mueve(der)} />
              <path d="M100 142 L100 60" stroke="#fff" strokeWidth={60 + BORDE * 2} strokeLinecap="round" />
            </>
          ) : null}
          <g className="sagui-cuerpo">
            <motion.path {...BRAZO} initial={{ d: intro ? INTRO_KF.izq[0] : IZQ.reposo }} {...mueve(izq)} />
            <motion.path {...BRAZO} initial={{ d: intro ? INTRO_KF.der[0] : DER.reposo }} {...mueve(der)} />
            <path d="M100 142 L100 60" stroke="var(--senal)" strokeWidth={60} strokeLinecap="round" />

            <motion.g {...mueve(ojos)}>
              <motion.g initial={false} animate={{ opacity: feliz ? 0 : 1 }} transition={fundido}>
                <g className={intro ? undefined : "sagui-ojos"}>
                  <motion.g style={{ originX: "50%", originY: "50%" }} {...mueve(parpadeo)}>
                    <ellipse cx="85" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
                    <ellipse cx="115" cy="76" rx="6.5" ry="8.7" fill={TINTA} />
                  </motion.g>
                </g>
              </motion.g>
            </motion.g>
            <motion.path
              d="M78.5 79 Q85 68 91.5 79 M108.5 79 Q115 68 121.5 79"
              fill="none"
              stroke={TINTA}
              strokeWidth={5.5}
              strokeLinecap="round"
              initial={false}
              animate={{ opacity: feliz ? 1 : 0 }}
              transition={fundido}
            />

            <motion.path d="M90 92 Q100 105 110 92" fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" initial={false} {...mueve(sonrisa)} />
            <motion.path d="M89 91 Q100 93 111 91 Q110 106 100 106 Q90 106 89 91Z" fill={TINTA} initial={{ opacity: 0 }} {...mueve(bocaAbierta)} />
            <motion.ellipse cx="100" cy="97" rx="5.5" ry="6" fill={TINTA} initial={false} animate={{ opacity: atento && !feliz && !intro ? 1 : 0 }} transition={fundido} />
            <motion.path d="M90 93 Q100 97 110 93" fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" initial={false} animate={{ opacity: piensa ? 1 : 0 }} transition={fundido} />
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
