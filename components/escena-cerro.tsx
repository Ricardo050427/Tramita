// El Cerro de la Campana visto desde el centro: la sierra al fondo, el cerro con su camino y sus antenas,
// el sol de Hermosillo y la Catedral al pie. Formas planas que se recortan al ancho de cada pantalla.
const SIERRA = "M0 292 C110 262 190 280 290 258 C380 238 470 262 560 246 C660 228 770 258 870 240 C970 222 1080 252 1200 232 L1200 420 L0 420 Z";
const SIERRA_CERCA = "M0 330 C140 300 240 322 360 304 C470 288 560 314 680 300 C800 286 900 312 1020 298 C1100 290 1150 300 1200 296 L1200 420 L0 420 Z";
const CERRO = "M300 420 C380 404 430 366 474 324 C514 286 540 226 584 196 C612 178 652 172 680 184 C726 204 752 258 792 302 C830 344 884 392 980 420 Z";
const CAMINO = "M486 338 L566 304 L534 288 L618 252 L590 236 L646 210";
// x, base y cima de cada antena.
const ANTENAS = [
  [612, 190, 128],
  [640, 177, 98],
  [668, 182, 140],
  [700, 196, 166],
];

function Antena({ x, base, cima, grande }: { x: number; base: number; cima: number; grande: boolean }) {
  const travesano = (t: number) => {
    const y = base - (base - cima) * t;
    const ancho = 7 - t * 4;
    return <line key={t} x1={x - ancho} y1={y} x2={x + ancho} y2={y} />;
  };
  return (
    <>
      <g stroke="var(--tinta)" strokeWidth={2} strokeLinecap="round">
        <line x1={x - 5} y1={base} x2={x} y2={cima} />
        <line x1={x + 5} y1={base} x2={x} y2={cima} />
        {[0.35, 0.62].map(travesano)}
      </g>
      <circle cx={x} cy={cima - 4} r={grande ? 4.5 : 3.5} fill="var(--tinta)" />
    </>
  );
}

export function EscenaCerro({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <circle cx="868" cy="176" r="62" fill="#FCE3CF" />
      <path d={SIERRA} fill="#F3F0EA" />
      <path d={SIERRA_CERCA} fill="#E9E4DB" />
      <path d={CERRO} fill="var(--senal)" />
      <path d={CAMINO} fill="none" stroke="#F7A86E" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {ANTENAS.map(([x, base, cima], i) => (
        <Antena key={x} x={x} base={base} cima={cima} grande={i === 1} />
      ))}
      <g fill="var(--tinta)">
        <rect x="402" y="356" width="9" height="64" />
        <path d="M402 356 l4.5 -12 l4.5 12z" />
        <rect x="441" y="356" width="9" height="64" />
        <path d="M441 356 l4.5 -12 l4.5 12z" />
        <rect x="411" y="372" width="30" height="48" />
        <path d="M413 372 a13 13 0 0 1 26 0z" />
        <rect x="424" y="352" width="3" height="8" />
        <rect x="340" y="398" width="34" height="22" />
        <rect x="378" y="390" width="20" height="30" />
        <rect x="456" y="396" width="26" height="24" />
      </g>
    </svg>
  );
}
