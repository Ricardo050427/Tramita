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

const ICONOS: Record<string, LucideIcon> = {
  agua: Droplets,
  impuestos: ReceiptText,
  alumbrado: Lightbulb,
  apoyos: HandHeart,
  salud: Stethoscope,
  vivienda: House,
  seguridad: ShieldCheck,
  gobierno: Landmark,
  educacion: GraduationCap,
  ambiente: Leaf,
  transporte: Bus,
  negocios: BriefcaseBusiness,
  construccion: HardHat,
};

export function Directorio({ categorias }: { categorias: Categoria[] }) {
  return (
    <nav aria-label="Directorio de trámites">
      <ul className="border-t border-linea">
        {categorias.map((c) => {
          const Icono = ICONOS[c.icono] ?? Landmark;
          return (
            <li key={c.slug} className="border-b border-linea">
              <Link href={`/categoria/${c.slug}`} className="fila-senal flex min-h-16 items-center gap-3.5 px-4 py-2.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-[6px] bg-tinta text-panel">
                  <Icono className="size-6" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-[1.1875rem] leading-tight font-medium">{c.nombre}</span>
                <span className="text-tinta-suave" aria-label={`${c.total} trámites`}>
                  {c.total}
                </span>
                <ArrowRight className="flecha size-6 shrink-0" strokeWidth={2.25} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
