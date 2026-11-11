import type { Mensaje } from "@/components/conversacion";

// La conversación de cada trámite guardado en Mis trámites. Vive solo en el dispositivo, como la lista.
const LIMITE = 24;

export const llaveCharla = (clave: string) => `tramita:charla:${clave}`;

export function leerCharla(clave: string): Mensaje[] {
  try {
    const lista = JSON.parse(localStorage.getItem(llaveCharla(clave)) ?? "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** Trámites de los que se habló: sus fichas, los pasos de su ruta o lo que se verificó. */
export function clavesDe(mensajes: Mensaje[]) {
  return [
    ...new Set(
      mensajes.flatMap((m) => [...(m.fichas ?? []).map((t) => t.clave), ...(m.plan?.pasos ?? []).map((p) => p.clave), ...(m.verificacion ? [m.verificacion.clave] : [])]),
    ),
  ];
}

/** Junta dos tramos de conversación sin repetir mensajes y sin las preguntas que terminaron en error. */
export function unir(previos: Mensaje[], nuevos: Mensaje[]) {
  const vistos = new Set<string>();
  const todos = [...previos, ...nuevos].filter((m) => !vistos.has(m.id) && vistos.add(m.id));
  return todos.filter((m, i) => !m.error && !(m.rol === "usuario" && todos[i + 1]?.error)).slice(-LIMITE);
}

/** Copia la conversación del chat a cada trámite guardado del que se habló, para retomarla otro día. */
export function copiarACharlas(mensajes: Mensaje[], claves: string[]) {
  for (const clave of claves) {
    try {
      const antes = localStorage.getItem(llaveCharla(clave)) ?? "[]";
      const despues = JSON.stringify(unir(leerCharla(clave), mensajes));
      if (despues !== antes) localStorage.setItem(llaveCharla(clave), despues);
    } catch {}
  }
}
