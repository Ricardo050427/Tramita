import { useMemo, useSyncExternalStore } from "react";

// Cómo prefiere leer la persona y para quién busca. Se guarda solo en su dispositivo y nunca pide datos personales.
export const PERFILES = [
  {
    id: "mayor",
    nombre: "Adulto mayor",
    sugerencias: ["¿Hay descuento en el predial para adultos mayores?", "¿Cómo pido la tarifa social del agua?", "¿Qué hace la estancia de día para adultos mayores?", "¿Dónde pago mi predial?"],
  },
  {
    id: "discapacidad",
    nombre: "Persona con discapacidad",
    sugerencias: ["¿Cómo saco el tarjetón de discapacidad?", "Necesito un certificado de discapacidad", "¿Qué apoyos funcionales dan?", "¿Hay descuentos para personas con discapacidad?"],
  },
  {
    id: "negocio",
    nombre: "Tengo o quiero un negocio",
    sugerencias: ["Quiero abrir una taquería", "¿Cuánto cuesta la licencia de funcionamiento?", "Quiero poner un letrero en mi negocio", "¿Cómo renuevo mi licencia de funcionamiento?"],
  },
  {
    id: "casa",
    nombre: "Construyo o compro casa",
    sugerencias: ["Quiero ampliar mi casa", "¿Qué necesito para el número oficial?", "Voy a comprar una casa, ¿qué reviso?", "¿Cómo contrato el agua en una casa nueva?"],
  },
] as const;

export type Perfil = (typeof PERFILES)[number]["id"];
export type Preferencias = { letra?: boolean; sencillo?: boolean; perfil?: Perfil };

const LLAVE = "tramita:preferencias";
const EVENTO = "tramita:preferencias-cambio";

function crudo() {
  try {
    return localStorage.getItem(LLAVE) ?? "{}";
  } catch {
    return "{}";
  }
}

export function leerPreferencias(): Preferencias {
  try {
    return JSON.parse(crudo());
  } catch {
    return {};
  }
}

export function guardarPreferencias(cambio: Partial<Preferencias>) {
  const siguiente = { ...leerPreferencias(), ...cambio };
  for (const k of Object.keys(siguiente) as (keyof Preferencias)[]) if (!siguiente[k]) delete siguiente[k];
  try {
    localStorage.setItem(LLAVE, JSON.stringify(siguiente));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

export function usePreferencias() {
  const texto = useSyncExternalStore(suscribir, crudo, () => "{}");
  return useMemo(() => {
    try {
      return JSON.parse(texto) as Preferencias;
    } catch {
      return {};
    }
  }, [texto]);
}
