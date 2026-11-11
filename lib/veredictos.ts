import type { Fundamento } from "./ley";
import type { TipoReporte } from "./tipos-reporte";

export type TipoElemento = "documento" | "pago" | "tiempo" | "otro";
export type Elemento = { dicho: string; tipo: TipoElemento; requisito: number; copia: boolean; monto: number; informal: boolean };

export type Veredicto = "oficial" | "simplificar" | "no_publicado" | "cobro" | "plazo" | "revisar";
export type Hallazgo = { dicho: string; veredicto: Veredicto; detalle: string; requisito?: string; fundamentos: Fundamento[]; reporte?: TipoReporte };
export type ResultadoVerificacion = {
  hallazgos: Hallazgo[];
  faltantes: string[];
  porIA: boolean;
};

export const ETIQUETAS: Record<Veredicto, string> = {
  oficial: "Está en la ficha oficial",
  simplificar: "Está en la ficha, pero la ley pide quitarlo",
  no_publicado: "No aparece en la ficha oficial",
  cobro: "Cobro distinto al publicado",
  plazo: "Más tiempo del publicado",
  revisar: "Para revisar",
};
