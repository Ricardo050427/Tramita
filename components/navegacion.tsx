"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircleQuestionMark, type LucideIcon } from "lucide-react";

const SECCIONES: { ruta: string; nombre: string; Icono: LucideIcon }[] = [
  { ruta: "/", nombre: "Preguntar", Icono: MessageCircleQuestionMark },
  { ruta: "/tramites", nombre: "Trámites", Icono: LayoutGrid },
];

// El círculo de la sección activa florece: halo pálido, punto que crece, rebote y el icono se revela.
function Activa({ Icono, nombre }: { Icono: LucideIcon; nombre: string }) {
  return (
    <span className="relative grid size-[3.375rem] place-items-center">
      <span className="nav-halo absolute inset-0 rounded-full bg-senal/30" aria-hidden />
      <span className="nav-disco absolute inset-0 rounded-full bg-senal" aria-hidden />
      <span className="nav-icono relative text-tinta">
        <Icono className="size-7" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="sr-only">{nombre}</span>
    </span>
  );
}

export function Navegacion() {
  const ruta = usePathname();
  const seccion = ruta === "/" ? "/" : "/tramites";

  return (
    <nav aria-label="Secciones" className="nav-flotante fixed inset-x-0 z-40 mx-auto h-[3.875rem] w-[min(19rem,calc(100%-2.5rem))] rounded-full bg-panel shadow-[0_12px_28px_-10px_rgb(21_18_14/0.45),0_2px_6px_-2px_rgb(21_18_14/0.2)]">
      <ul className="flex h-full items-center px-1.5">
        {SECCIONES.map(({ ruta: destino, nombre, Icono }) => {
          const activa = seccion === destino;
          return (
            <li key={destino} className="flex h-full flex-1 items-center justify-center">
              <Link
                href={destino}
                scroll={destino !== "/"}
                aria-current={activa ? "page" : undefined}
                className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full text-tinta-suave transition-transform duration-150 active:scale-90"
              >
                {activa ? (
                  <Activa key={destino} Icono={Icono} nombre={nombre} />
                ) : (
                  <span className="nav-reposo flex flex-col items-center gap-0.5">
                    <Icono className="size-6" strokeWidth={2} aria-hidden />
                    <span className="text-[0.8125rem] leading-none font-medium">{nombre}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
