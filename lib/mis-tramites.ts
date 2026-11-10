import { useMemo, useSyncExternalStore } from "react";
import type { PasoPlan, Tramite } from "./tipos";

// Trámites que la persona va siguiendo. Viven solo en su dispositivo, con una copia de lo necesario para mostrarlos.
export type Seguimiento = {
  clave: string;
  nombre: string;
  dependencia: string;
  requisitos: string[];
  creado: string;
  actualizado: string;
  terminado?: string;
  vigencia?: PasoPlan["vigencia"];
  /** Entró al marcar un paso de la ruta: si se desmarca, deja de seguirse. */
  deRuta?: boolean;
};

type Registro = Record<string, Seguimiento>;
type Datos = Pick<Seguimiento, "clave" | "nombre" | "dependencia" | "requisitos"> & Partial<Pick<Seguimiento, "vigencia" | "deRuta">>;

const LLAVE = "tramita:mis";
const CASO = "tramita:caso";
const EVENTO = "tramita:mis-cambio";

function crudo() {
  try {
    return localStorage.getItem(LLAVE) ?? "{}";
  } catch {
    return "{}";
  }
}

function leer(): Registro {
  try {
    return JSON.parse(crudo());
  } catch {
    return {};
  }
}

function escribir(registro: Registro) {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(registro));
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

export function useMisTramites() {
  const texto = useSyncExternalStore(suscribir, crudo, () => "{}");
  return useMemo(() => JSON.parse(texto) as Registro, [texto]);
}

export const datosDe = (t: Tramite): Datos => ({ clave: t.clave, nombre: t.nombre, dependencia: t.dependencia, requisitos: t.requisitos.map((r) => r.titulo) });

export function seguir(datos: Datos) {
  const registro = leer();
  const ahora = new Date().toISOString();
  const previo = registro[datos.clave];
  escribir({ ...registro, [datos.clave]: { ...previo, ...datos, creado: previo?.creado ?? ahora, deRuta: previo ? previo.deRuta && datos.deRuta : datos.deRuta, actualizado: ahora } });
}

export function dejarDeSeguir(clave: string) {
  const registro = leer();
  delete registro[clave];
  escribir(registro);
}

export function restaurar(seguimiento: Seguimiento) {
  escribir({ ...leer(), [seguimiento.clave]: seguimiento });
}

// La ruta del chat guarda sus pasos listos aparte: se mantiene al día para que ambas vistas digan lo mismo.
function marcarEnRuta(clave: string, fecha: string | null) {
  try {
    const caso = JSON.parse(localStorage.getItem(CASO) ?? "{}") as Record<string, string>;
    if (fecha) caso[clave] = fecha;
    else delete caso[clave];
    localStorage.setItem(CASO, JSON.stringify(caso));
  } catch {}
}

function sinTerminar(seguimiento: Seguimiento): Seguimiento {
  const copia = { ...seguimiento, actualizado: new Date().toISOString() };
  delete copia.terminado;
  return copia;
}

export function terminar(clave: string) {
  const registro = leer();
  if (!registro[clave]) return;
  const ahora = new Date().toISOString();
  marcarEnRuta(clave, ahora);
  escribir({ ...registro, [clave]: { ...registro[clave], terminado: ahora, actualizado: ahora } });
}

export function reabrir(clave: string) {
  const registro = leer();
  if (!registro[clave]) return;
  marcarEnRuta(clave, null);
  escribir({ ...registro, [clave]: sinTerminar(registro[clave]) });
}

/** Refleja en la lista un paso marcado o desmarcado desde la ruta del chat. */
export function alternarPaso(paso: PasoPlan, fecha: string | null) {
  const registro = leer();
  const previo = registro[paso.clave];
  if (fecha) {
    escribir({
      ...registro,
      [paso.clave]: {
        ...previo,
        requisitos: previo?.requisitos ?? [],
        deRuta: previo ? previo.deRuta : true,
        creado: previo?.creado ?? fecha,
        clave: paso.clave,
        nombre: paso.nombre,
        dependencia: paso.dependencia,
        vigencia: paso.vigencia,
        terminado: fecha,
        actualizado: fecha,
      },
    });
  } else if (previo?.deRuta) {
    delete registro[paso.clave];
    escribir(registro);
  } else if (previo) {
    escribir({ ...registro, [paso.clave]: sinTerminar(previo) });
  }
}
