"use client";

import { useState, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { BarraPregunta } from "./barra-pregunta";
import { Mensajes, useConversacion } from "./conversacion";
import { Encabezado } from "./senal";
import type { EntradaIndice } from "@/lib/tipos";

const POPULARES = [
  "¿Cómo pido la tarifa social del agua?",
  "Se fundió una lámpara de mi calle",
  "Necesito mi constancia de no adeudo",
  "Quiero cambiar de nombre mi recibo de agua",
];
const SENAL_INICIAL = "¿Qué necesitas resolver?";

export function Aplicacion({ indice }: { indice: EntradaIndice[] }) {
  const [senal, setSenal] = useState(SENAL_INICIAL);
  const { mensajes, ocupado, preguntar, reintentar, reiniciar } = useConversacion({ almacen: "tramita:historial", alSenal: setSenal });
  const enCharla = mensajes.length > 0;

  const accion = enCharla ? (
    <button
      type="button"
      onClick={() => {
        reiniciar();
        setSenal(SENAL_INICIAL);
      }}
      className="min-h-11 rounded-[8px] px-2 font-bold underline"
    >
      Nueva pregunta
    </button>
  ) : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado mensaje={senal} grande={!enCharla} accion={accion} />

      <div className="flex w-full flex-1 flex-col">
        <main className="flex-1">
          {enCharla ? (
            <Mensajes mensajes={mensajes} ocupado={ocupado} alPreguntar={(t, a) => void preguntar(t, a)} alReintentar={reintentar} alSenal={setSenal} />
          ) : (
            <div className="mx-auto max-w-2xl px-3 pt-4 pb-3">
              <p className="px-1 leading-snug text-pretty text-tinta-suave">Pregunta como en la ventanilla. Te digo qué llevar, cuánto cuesta y a dónde ir, con la ficha oficial a la vista.</p>
              <h2 className="mt-6 px-1 text-[0.9375rem] font-bold">Lo más preguntado</h2>
              <ul className="mt-2 divide-y divide-linea/70 overflow-hidden rounded-[14px] bg-panel">
                {POPULARES.map((s, i) => (
                  <li key={s} style={{ "--fila": i } as CSSProperties} className="entra-fila">
                    <button type="button" onClick={() => void preguntar(s, [])} className="fila-senal flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-left leading-snug font-medium">
                      <span className="flex-1">{s}</span>
                      <ChevronRight className="flecha size-5 shrink-0 text-tinta-suave" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 px-1 text-[0.8125rem] leading-snug text-tinta-suave">Proyecto independiente de hackathon. No es un sitio oficial del Ayuntamiento de Hermosillo.</p>
            </div>
          )}
        </main>

        <BarraPregunta indice={indice} ocupado={ocupado} alEnviar={(t, a) => void preguntar(t, a)} />
        <div className="h-(--alto-dock)" aria-hidden />
      </div>
    </div>
  );
}
