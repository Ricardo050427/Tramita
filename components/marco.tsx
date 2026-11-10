"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Aplicacion } from "./aplicacion";
import { Navegacion } from "./navegacion";
import type { EntradaIndice } from "@/lib/tipos";

// La conversación vive aquí, fuera de las páginas: sigue contestando aunque la persona cambie de sección.
export function Marco({ indice, children }: { indice: EntradaIndice[]; children: React.ReactNode }) {
  const enChat = usePathname() === "/";
  const scrollDelChat = useRef(0);

  useLayoutEffect(() => {
    if (!enChat) return;
    window.scrollTo(0, scrollDelChat.current);
    const anotar = () => {
      scrollDelChat.current = window.scrollY;
    };
    window.addEventListener("scroll", anotar, { passive: true });
    return () => window.removeEventListener("scroll", anotar);
  }, [enChat]);

  return (
    <>
      <div className={enChat ? undefined : "hidden"}>
        <Aplicacion indice={indice} />
      </div>
      <div className={enChat ? "hidden" : "[&>*]:pb-24"}>{children}</div>
      <Navegacion />
    </>
  );
}
