import { Directorio } from "@/components/directorio";
import { Encabezado } from "@/components/senal";
import { categorias } from "@/lib/datos";

export default function PaginaTramites() {
  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="¿De qué es tu trámite?" />
      <main className="mx-auto max-w-4xl px-3 py-3 sm:py-5">
        <Directorio categorias={categorias} />
        <p className="mt-4 px-1 text-[0.8125rem] text-tinta-suave">Proyecto independiente de hackathon. No es un sitio oficial del Ayuntamiento de Hermosillo.</p>
      </main>
    </div>
  );
}
