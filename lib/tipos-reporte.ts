// Lo que una persona puede reportar de forma anónima. Se publica solo el conteo, nunca el texto.
export const TIPOS_REPORTE = [
  { id: "requisito", nombre: "Me pidieron algo que no está publicado", corto: "Requisito no publicado" },
  { id: "cobro", nombre: "Me cobraron más de lo publicado", corto: "Cobro distinto" },
  { id: "dinero", nombre: "Me pidieron dinero por fuera o sin recibo", corto: "Dinero sin recibo" },
  { id: "plazo", nombre: "No me respondieron en el plazo publicado", corto: "Plazo vencido" },
  { id: "vueltas", nombre: "Me mandaron de oficina en oficina", corto: "Vueltas de más" },
  { id: "ficha", nombre: "La información de la ficha está mal", corto: "Ficha equivocada" },
] as const;

export type TipoReporte = (typeof TIPOS_REPORTE)[number]["id"];
export const ES_TIPO = new Set<string>(TIPOS_REPORTE.map((t) => t.id));

export type ResumenReportes = {
  total: number;
  porTipo: { id: TipoReporte; corto: string; total: number }[];
  porTramite: { clave: string; nombre: string; dependencia: string; total: number }[];
  ultimo: string | null;
};
