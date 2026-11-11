"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LayoutGrid, MessageCircleQuestionMark, ShieldCheck, type LucideIcon } from "lucide-react";
import { useMisTramites } from "@/lib/mis-tramites";

const ALTO_MINIMO_TECLADO = 120;

const SECCIONES: { ruta: string; nombre: string; Icono: LucideIcon }[] = [
  { ruta: "/", nombre: "Preguntar", Icono: MessageCircleQuestionMark },
  { ruta: "/tramites", nombre: "Trámites", Icono: LayoutGrid },
  { ruta: "/vigila", nombre: "Vigila", Icono: ShieldCheck },
  { ruta: "/mis-tramites", nombre: "Mis trámites", Icono: FolderOpen },
];

// Se guía por el teclado real, no por el foco: en Android el teclado se puede cerrar con el campo aún activo.
function useTeclado() {
  useEffect(() => {
    const vista = window.visualViewport;
    if (!vista) return;
    const raiz = document.documentElement;
    let abierto = false;

    function medir() {
      const ahora = window.innerHeight - vista!.height * vista!.scale > ALTO_MINIMO_TECLADO;
      raiz.style.setProperty("--alto-teclado", ahora ? `${Math.max(0, window.innerHeight - vista!.height - vista!.offsetTop)}px` : "0px");
      raiz.toggleAttribute("data-teclado", ahora);
      if (abierto && !ahora && document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur();
      abierto = ahora;
    }

    vista.addEventListener("resize", medir);
    vista.addEventListener("scroll", medir);
    return () => {
      vista.removeEventListener("resize", medir);
      vista.removeEventListener("scroll", medir);
      raiz.removeAttribute("data-teclado");
      raiz.style.removeProperty("--alto-teclado");
    };
  }, []);
}

// El círculo de la sección activa florece: halo pálido, punto que crece, rebote y el icono se revela.
function Activa({ Icono, nombre }: { Icono: LucideIcon; nombre: string }) {
  return (
    <span className="relative grid size-11 place-items-center">
      <span className="nav-halo absolute inset-0 rounded-full bg-senal/30" aria-hidden />
      <span className="nav-disco absolute inset-0 rounded-full bg-senal" aria-hidden />
      <span className="nav-icono relative text-tinta">
        <Icono className="size-[1.375rem]" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="sr-only">{nombre}</span>
    </span>
  );
}

export function Navegacion() {
  const ruta = usePathname();
  useTeclado();
  const seccion =
    ruta === "/" || ruta === "/mis-tramites"
      ? ruta
      : ruta === "/vigila" || ruta === "/como-funciona" || ruta.endsWith("/verificar")
        ? "/vigila"
        : "/tramites";
  const enCurso = Object.values(useMisTramites()).filter((s) => !s.terminado).length;

  return (
    <nav aria-label="Secciones" className="nav-flotante fixed inset-x-0 z-40 mx-auto h-14 w-[min(23rem,calc(100%-2rem))] rounded-full bg-panel shadow-[0_8px_24px_-8px_rgb(21_18_14/0.32)]">
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
                  <span className="nav-reposo relative flex flex-col items-center gap-0.5">
                    <Icono className="size-[1.375rem]" strokeWidth={1.9} aria-hidden />
                    {destino === "/mis-tramites" && enCurso ? (
                      <span key={enCurso} className="nav-cuenta absolute -top-1 left-1/2 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-senal px-1 text-[0.6875rem] leading-none font-bold text-tinta">
                        {enCurso}
                        <span className="sr-only"> en curso</span>
                      </span>
                    ) : null}
                    <span className="text-xs leading-none font-medium">{nombre}</span>
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
