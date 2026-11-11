import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ResultadoExamen } from "@/components/examen";
import { Encabezado } from "@/components/senal";
import conocimiento from "@/data/conocimiento.json";
import { documentos, tramites } from "@/lib/datos";
import { FECHA_CATALOGO, fechaLegible } from "@/lib/ley";

export const metadata = { title: "Cómo responde Sagui · Tramita" };

const REPO = "https://github.com/Ricardo050427/Tramita";

function contar() {
  const fragmentos = conocimiento as { fuente: string; tipo: string }[];
  const leyes = fragmentos.filter((f) => f.tipo === "ley");
  return {
    leyes: [...new Set(leyes.map((f) => f.fuente))],
    articulos: leyes.length,
    paginas: new Set(fragmentos.filter((f) => f.tipo === "pagina").map((f) => f.fuente)).size,
  };
}

const PASOS = [
  {
    titulo: "Si el dato ya está en la ficha, lo da directo",
    texto: "Costo, horario, teléfono, requisitos o plazo de un trámite se contestan al instante desde el catálogo, sin usar IA.",
  },
  {
    titulo: "La IA elige qué trámites aplican a tu caso",
    texto: "Lee tu pregunta, tu foto o tu audio y escoge entre los trámites del catálogo. Si ninguno hace lo que pides, lo dice.",
  },
  {
    titulo: "Redacta solo con fuentes oficiales",
    texto: "Escribe la respuesta usando únicamente esas fichas y los artículos de ley que aplican, y te muestra la fuente.",
  },
  {
    titulo: "Revisa cada cifra antes de mostrarla",
    texto: "Montos, plazos y teléfonos se comparan con las fuentes. Si una línea trae un número que no aparece en ellas, se descarta.",
  },
  {
    titulo: "Si tarda, te da la ficha oficial",
    texto: "Si la IA no responde en 7 segundos, ves la ficha tal como la publica el Ayuntamiento, sin redactar.",
  },
];

export default function PaginaComoFunciona() {
  const { leyes, articulos, paginas } = contar();
  const fuentes = [
    { cifra: tramites.length, texto: "trámites del catálogo municipal, con requisitos, costo, plazo, oficinas y fundamento" },
    { cifra: documentos.length, texto: "formatos y guías oficiales en PDF, que puedes descargar o llenar" },
    { cifra: articulos.toLocaleString("es-MX"), texto: `fragmentos de ${leyes.length} leyes y reglamentos: ${leyes.join(", ")}` },
    { cifra: paginas, texto: "páginas de portales oficiales del Ayuntamiento y sus dependencias" },
  ];

  return (
    <div className="min-h-dvh">
      <Encabezado mensaje="Así responde Sagui" volver="/vigila" />
      <main className="mx-auto max-w-2xl px-4 py-5">
        <p className="text-[1.1875rem] leading-relaxed">
          Sagui es el asistente de Tramita. No inventa trámites ni requisitos: responde con la información que publica el Ayuntamiento de Hermosillo y te dice de dónde sale
          cada dato.
        </p>

        <section className="mt-9" aria-labelledby="fuentes">
          <h2 id="fuentes" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            De dónde salen sus datos
          </h2>
          <ul className="mt-3">
            {fuentes.map((f) => (
              <li key={f.texto} className="flex gap-4 border-t border-linea py-3.5">
                <span className="w-16 shrink-0 text-[1.625rem] leading-none font-bold tracking-[-0.03em]">{f.cifra}</span>
                <span className="min-w-0 leading-snug">{f.texto}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.9375rem] text-tinta-suave">Consultado el {fechaLegible(FECHA_CATALOGO)}.</p>
        </section>

        <section className="mt-9" aria-labelledby="pasos">
          <h2 id="pasos" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Cómo arma una respuesta
          </h2>
          <ol className="mt-3">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-3 border-t border-linea py-3.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-senal text-[0.9375rem] font-bold">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block leading-snug font-bold">{p.titulo}</span>
                  <span className="mt-0.5 block leading-snug text-tinta-suave">{p.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-9" aria-labelledby="examen">
          <h2 id="examen" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Lo pusimos a prueba
          </h2>
          <ResultadoExamen />
        </section>

        <section className="mt-9" aria-labelledby="verificador">
          <h2 id="verificador" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Cuando verifica lo que te pidieron
          </h2>
          <p className="mt-2 leading-relaxed">
            La IA solo separa lo que escribiste o fotografiaste y lo empareja con los requisitos de la ficha. El veredicto lo deciden reglas fijas, escritas a partir de la
            ficha oficial y de la Ley Nacional para Eliminar Trámites Burocráticos. Por eso el resultado se puede explicar y sale igual cada vez.
          </p>
        </section>

        <section className="mt-9" aria-labelledby="no-hace">
          <h2 id="no-hace" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Lo que Sagui no hace
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-senal-oscura">
            <li>No hace trámites ni pagos por ti, y nunca te pide dinero.</li>
            <li>No te pide nombre, CURP, domicilio ni datos personales.</li>
            <li>No sustituye a la autoridad: si algo no aparece en la ficha, te dice a quién preguntar.</li>
            <li>No contesta temas ajenos a los servicios públicos de Hermosillo.</li>
          </ul>
        </section>

        <section className="mt-9" aria-labelledby="datos">
          <h2 id="datos" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Tus datos
          </h2>
          <p className="mt-2 leading-relaxed">
            Tu conversación, tus listas de requisitos y Mis trámites se guardan solo en tu teléfono. Tus preguntas y fotos se procesan con Gemini, de Google, y Tramita no
            las guarda. En esta versión de prueba Google puede usar lo que envías para mejorar su servicio, así que no escribas datos personales.
          </p>
        </section>

        <section className="mt-9" aria-labelledby="limites">
          <h2 id="limites" className="text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
            Sus límites
          </h2>
          <p className="mt-2 leading-relaxed">
            El catálogo puede cambiar después de la fecha de consulta y la IA puede entender mal una pregunta. Antes de ir, revisa la ficha oficial: cada respuesta trae la
            liga a su fuente.
          </p>
        </section>

        <section className="mt-9 rounded-[14px] bg-panel p-4" aria-labelledby="abierto">
          <h2 id="abierto" className="text-lg font-bold">
            Código abierto
          </h2>
          <p className="mt-1 leading-relaxed">
            Todo el código de Tramita es público. Cualquier persona o gobierno puede revisarlo, auditar cómo responde y reutilizarlo.
          </p>
          <p className="mt-1 flex flex-wrap gap-x-5">
            <a href={REPO} target="_blank" rel="noreferrer" className="flex min-h-11 items-center font-bold underline">
              Ver el código en GitHub
            </a>
            <a href={`${REPO}/issues`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center underline">
              Reportar un error
            </a>
          </p>
        </section>

        <Link
          href="/vigila"
          className="mt-8 flex min-h-14 items-center justify-between gap-3 rounded-[14px] bg-tinta px-4 font-bold text-panel transition-transform duration-150 active:scale-[0.98]"
        >
          Ver el observatorio de trámites
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
      </main>
    </div>
  );
}
