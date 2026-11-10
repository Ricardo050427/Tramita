import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Bus,
  Droplets,
  GraduationCap,
  HandHeart,
  HardHat,
  House,
  Landmark,
  Leaf,
  Lightbulb,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { Categoria } from "@/lib/tipos";

// Dos tonos con las mismas líneas: `acento` rellena la pieza del icono que lo identifica.
// `encima` repite los trazos que el relleno taparía.
const PICTOGRAMAS: Record<string, { Icono: LucideIcon; acento: string; encima?: ReactNode }> = {
  agua: { Icono: Droplets, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  impuestos: {
    Icono: ReceiptText,
    acento: "[&>:nth-child(4)]:fill-(--acento)",
    encima: (
      <>
        <path d="M13 16H8" />
        <path d="M14 8H8" />
        <path d="M16 12H8" />
      </>
    ),
  },
  alumbrado: { Icono: Lightbulb, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  apoyos: { Icono: HandHeart, acento: "[&>:nth-child(2)]:fill-(--acento)" },
  salud: { Icono: Stethoscope, acento: "[&>:nth-child(5)]:fill-(--acento) [&>:nth-child(3)]:fill-(--acento)" },
  vivienda: { Icono: House, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  seguridad: { Icono: ShieldCheck, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  gobierno: { Icono: Landmark, acento: "[&>:nth-child(2)]:fill-(--acento)" },
  educacion: { Icono: GraduationCap, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  ambiente: { Icono: Leaf, acento: "[&>:nth-child(1)]:fill-(--acento)" },
  transporte: { Icono: Bus, acento: "[&>:nth-child(5)]:fill-(--acento) [&>:nth-child(7)]:fill-(--acento)" },
  negocios: {
    Icono: BriefcaseBusiness,
    acento: "[&>:nth-child(4)]:fill-(--acento)",
    encima: (
      <>
        <path d="M22 13a18.15 18.15 0 0 1-20 0" />
        <path d="M12 12h.01" />
      </>
    ),
  },
  construccion: { Icono: HardHat, acento: "[&>:nth-child(4)]:fill-(--acento) [&>:nth-child(1)]:fill-(--acento)" },
};

const COLUMNAS = 3;
const filaDe = (i: number) => ({ "--fila": Math.floor(i / COLUMNAS) }) as CSSProperties;

export function Directorio({ categorias }: { categorias: Categoria[] }) {
  return (
    <nav aria-label="Directorio de trámites">
      <ul className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:grid-cols-5 sm:gap-3">
        {categorias.map((c, i) => {
          const { Icono, acento, encima } = PICTOGRAMAS[c.icono] ?? PICTOGRAMAS.gobierno;
          return (
            <li key={c.slug}>
              <Link href={`/categoria/${c.slug}`} style={filaDe(i)} className="mosaico relative flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-[12px] bg-panel px-1.5 py-3 text-center">
                <span className="mosaico-cuenta absolute top-2 right-2.5 text-[0.8125rem] leading-none text-tinta-suave">
                  {c.total}
                  <span className="sr-only"> {c.total === 1 ? "trámite" : "trámites"}</span>
                </span>
                <Icono className={`mosaico-icono size-11 ${acento}`} strokeWidth={1.75} aria-hidden>
                  {encima}
                </Icono>
                <span className="text-[0.9375rem] leading-[1.15] font-bold text-balance">{c.nombre}</span>
              </Link>
            </li>
          );
        })}
        <li className="col-span-2">
          <Link href="/" scroll={false} style={filaDe(categorias.length)} className="mosaico mosaico-pregunta flex h-full items-center gap-2 rounded-[12px] bg-senal px-4 py-3 text-tinta">
            <span className="min-w-0 flex-1 text-[1.0625rem] leading-tight font-bold text-balance">¿No sabes cuál es? Pregúntale a Tramita</span>
            <ArrowRight className="size-6 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
