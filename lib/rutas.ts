import { tramitePorClave } from "./datos";
import { leerPlazo } from "./habiles";
import { estimarCosto } from "./plan";

// Rutas de vida: lo que de verdad hay que hacer para una meta común, en orden, con lo que pasa fuera del Ayuntamiento.
type PasoCrudo =
  | { clave: string; nota: string; opcional?: string }
  | { externo: { nombre: string; quien: string; url?: string }; nota: string; opcional?: string };

type RutaCruda = { slug: string; nombre: string; frase: string; fases: { nombre: string; pasos: PasoCrudo[] }[] };

const RUTAS: RutaCruda[] = [
  {
    slug: "negocio-de-comida",
    nombre: "Abrir un negocio de comida",
    frase: "Una taquería, una cocina económica o una cafetería en un local.",
    fases: [
      {
        nombre: "Antes de rentar el local",
        pasos: [{ clave: "HMO-00529", nota: "Confirma sin costo que en ese domicilio se permite un negocio de comida, antes de firmar la renta." }],
      },
      {
        nombre: "Los papeles del local",
        pasos: [
          { clave: "HMO-00033", nota: "La piden la licencia de uso de suelo y la de funcionamiento." },
          { clave: "HMO-00211", nota: "Da el número oficial del domicilio.", opcional: "Solo si el local aún no tiene número oficial." },
          { clave: "HMO-00227", nota: "Autoriza tu giro en ese local. El costo depende de los metros." },
          { clave: "HMO-00018", nota: "La carta de no adeudo de Agua de Hermosillo que pide la licencia de funcionamiento." },
          { clave: "HMO-00225", nota: "La licencia de funcionamiento pide una licencia ambiental. Pregunta si tu negocio entra en la simplificada." },
        ],
      },
      {
        nombre: "Fuera del Ayuntamiento",
        pasos: [
          { externo: { nombre: "Alta en el RFC", quien: "SAT", url: "https://www.sat.gob.mx" }, nota: "Para facturar y pagar impuestos como negocio." },
          {
            externo: { nombre: "Aviso de funcionamiento sanitario", quien: "COFEPRIS", url: "https://www.gob.mx/cofepris" },
            nota: "Los negocios que preparan y venden alimentos avisan a la autoridad sanitaria.",
          },
        ],
      },
      {
        nombre: "Para abrir",
        pasos: [
          { clave: "HMO-00495", nota: "Permiso para el letrero de tu negocio.", opcional: "Solo si vas a pintar o colgar un letrero." },
          { clave: "HMO-00195", nota: "Permiso municipal para vender alcohol.", opcional: "Solo si venderás cerveza u otras bebidas con alcohol." },
          { clave: "HMO-00420", nota: "El permiso final para abrir. Con todo lo anterior listo, no tiene costo." },
        ],
      },
    ],
  },
  {
    slug: "construir-o-ampliar",
    nombre: "Construir o ampliar tu casa",
    frase: "Un cuarto más, una segunda planta o una casa nueva en tu terreno.",
    fases: [
      {
        nombre: "Antes de construir",
        pasos: [
          { clave: "HMO-00211", nota: "Da el número oficial del terreno.", opcional: "Solo si el terreno aún no tiene número oficial." },
          { clave: "HMO-00033", nota: "La pide la licencia de construcción." },
          { clave: "HMO-00186", nota: "El permiso para construir. El costo depende de los metros que vas a construir." },
        ],
      },
      {
        nombre: "Si la casa es nueva",
        pasos: [
          { clave: "HMO-00444", nota: "Confirma que hay agua y drenaje para tu casa.", opcional: "Solo si el terreno aún no tiene servicios." },
          { clave: "HMO-00250", nota: "Permiso para romper la calle y conectar servicios.", opcional: "Solo si hay que abrir el pavimento." },
          { clave: "HMO-00059", nota: "El contrato de agua y drenaje de tu casa.", opcional: "Solo si la casa no tiene contrato de agua." },
        ],
      },
      {
        nombre: "Al terminar la obra",
        pasos: [
          { clave: "HMO-00219", nota: "Extiende tu licencia.", opcional: "Solo si la licencia vence antes de terminar." },
          { clave: "HMO-00214", nota: "Comprueba que la obra quedó como se autorizó." },
        ],
      },
    ],
  },
  {
    slug: "comprar-o-vender-casa",
    nombre: "Comprar o vender una casa",
    frase: "Lo que se revisa antes de firmar y lo que se cambia de nombre después.",
    fases: [
      {
        nombre: "Antes de firmar",
        pasos: [
          { clave: "HMO-00035", nota: "Comprueba que la casa no debe predial." },
          { clave: "HMO-00018", nota: "Comprueba que la casa no debe agua." },
          { clave: "HMO-00511", nota: "Medidas, colindancias y valor del predio. Confirma con la notaría si lo necesita." },
        ],
      },
      {
        nombre: "La escritura",
        pasos: [
          { externo: { nombre: "Escritura de compraventa", quien: "una notaría pública" }, nota: "La compraventa de un inmueble se firma ante notario." },
          { clave: "HMO-00512", nota: "Registra el cambio de dueño y el impuesto de traslado. Suele presentarlo la notaría: pregúntale." },
        ],
      },
      {
        nombre: "Ya es tuya",
        pasos: [
          { clave: "HMO-00058", nota: "Pon el recibo del agua a tu nombre." },
          { clave: "HMO-00494", nota: "Desde ahora el predial corre a tu cargo." },
        ],
      },
    ],
  },
  {
    slug: "vender-en-la-calle",
    nombre: "Vender en la calle",
    frase: "Un puesto de comida, elotes o fruta en la vía pública.",
    fases: [
      {
        nombre: "Elige tu permiso",
        pasos: [
          { clave: "HMO-00518", nota: "Si te pones siempre en el mismo lugar con un puesto semifijo.", opcional: "Elige este o el siguiente, según tu puesto." },
          { clave: "HMO-00522", nota: "Si recorres la ciudad o vendes solo por temporada.", opcional: "Elige este o el anterior, según tu puesto." },
        ],
      },
      {
        nombre: "Fuera del Ayuntamiento",
        pasos: [{ externo: { nombre: "Alta en el RFC", quien: "SAT", url: "https://www.sat.gob.mx" }, nota: "Para pagar impuestos como pequeño negocio." }],
      },
    ],
  },
];

export type PasoRuta = {
  clave?: string;
  nombre: string;
  dependencia: string;
  nota: string;
  opcional?: string;
  costo?: string;
  minimo: number | null;
  maximo: number | null;
  plazo?: string;
  diasPlazo: number | null;
  requisitos: string[];
  externo?: { quien: string; url?: string };
};
export type Ruta = { slug: string; nombre: string; frase: string; fases: { nombre: string; pasos: PasoRuta[] }[] };

const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: n % 1 ? 2 : 0 });

function completar(p: PasoCrudo): PasoRuta | null {
  if ("externo" in p) {
    return { nombre: p.externo.nombre, dependencia: p.externo.quien, nota: p.nota, opcional: p.opcional, minimo: null, maximo: null, diasPlazo: null, requisitos: [], externo: p.externo };
  }
  const t = tramitePorClave(p.clave);
  if (!t) return null;
  const rango = estimarCosto(t);
  const plazo = leerPlazo(t.plazo);
  return {
    clave: t.clave,
    nombre: t.nombre,
    dependencia: t.dependencia,
    nota: p.nota,
    opcional: p.opcional,
    costo: rango ? (rango.max === 0 ? "Sin costo" : rango.min === rango.max ? pesos(rango.max) : `${pesos(rango.min)} a ${pesos(rango.max)}`) : "Depende de tu caso",
    minimo: rango?.min ?? null,
    maximo: rango?.max ?? null,
    plazo: plazo ? `${plazo.dias} ${plazo.dias === 1 ? "día" : "días"}${plazo.habiles ? (plazo.dias === 1 ? " hábil" : " hábiles") : ""}` : "Sin plazo publicado",
    diasPlazo: plazo?.habiles ? plazo.dias : null,
    requisitos: t.requisitos.map((r) => r.titulo),
  };
}

export const rutas: Ruta[] = RUTAS.map((r) => ({
  ...r,
  fases: r.fases.map((f) => ({ nombre: f.nombre, pasos: f.pasos.map(completar).filter((p): p is PasoRuta => Boolean(p)) })),
}));

export const rutaPorSlug = (slug: string) => rutas.find((r) => r.slug === slug);

export function resumenRuta(r: Ruta) {
  const pasos = r.fases.flatMap((f) => f.pasos);
  // "Elige este o el siguiente": de un grupo de alternativas se hace solo una.
  const alternativas = pasos.filter((p) => p.clave && p.opcional?.startsWith("Elige"));
  const obligatorios = pasos.filter((p) => !p.opcional && p.clave);
  const conCosto = obligatorios.filter((p) => p.minimo !== null);
  const conCostoAlt = alternativas.filter((p) => p.minimo !== null);
  return {
    enAyuntamiento: obligatorios.length + (alternativas.length ? 1 : 0),
    opcionales: pasos.filter((p) => p.opcional && p.clave).length - alternativas.length,
    externos: pasos.filter((p) => p.externo).length,
    minimo: conCosto.reduce((s, p) => s + (p.minimo ?? 0), 0) + (conCostoAlt.length ? Math.min(...conCostoAlt.map((p) => p.minimo!)) : 0),
    maximo: conCosto.reduce((s, p) => s + (p.maximo ?? 0), 0) + (conCostoAlt.length ? Math.max(...conCostoAlt.map((p) => p.maximo!)) : 0),
    sinCosto: obligatorios.length - conCosto.length,
    dias: obligatorios.reduce((s, p) => s + (p.diasPlazo ?? 0), 0) + Math.max(0, ...alternativas.map((p) => p.diasPlazo ?? 0)),
    sinPlazo: obligatorios.filter((p) => p.diasPlazo === null).length,
  };
}
