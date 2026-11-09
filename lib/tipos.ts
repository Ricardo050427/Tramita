export type Documento = {
  id: string;
  titulo: string;
  tipo: "solicitud" | "guia" | "otro";
  archivo: string;
  url: string;
  formato: string;
  pesoKB: number;
  paginas?: number;
  revision?: string;
  verificado: string;
};

export type Requisito = {
  titulo: string;
  detalle?: string;
  documento?: string;
  obtener?: { clave: string; nombre: string };
};

export type Oficina = {
  nombre: string;
  direccion: string;
  colonia: string;
  telefono: string;
  horario: string;
  lat: number;
  lng: number;
};

export type TipoBloque = "resumen" | "camino" | "paso" | "alerta";
export type Bloque = { tipo: TipoBloque; d: string };

export type Tramite = {
  clave: string;
  nombre: string;
  categoria: string;
  dependencia: string;
  modalidad: string;
  descripcion: string;
  aplica: string;
  requisitos: Requisito[];
  costo: string;
  plazo: string;
  vigencia: string;
  obtienes: string;
  sanciones: string;
  fundamento: string;
  horario: string;
  telefono: string;
  domicilio: string;
  enLinea: string;
  enLineaGeneral?: boolean;
  oficinas?: Oficina[];
  documentos?: Documento[];
};

export type Categoria = {
  slug: string;
  nombre: string;
  icono: string;
  total: number;
};

export type EntradaIndice = {
  c: string; // clave
  n: string; // nombre
  g: string; // slug de categoría
  k: string; // texto normalizado para buscar
  l: boolean; // tiene trámite en línea
};

export type Adjunto = { nombre: string; mime: string; datos: string };

export type EventoChat =
  | { t: "fichas"; items: Tramite[] }
  | { t: "texto"; d: string }
  | { t: "bloque"; bloque: Bloque }
  | { t: "documentos"; items: Documento[] }
  | { t: "sugerencias"; items: string[] }
  | { t: "aviso"; d: string }
  | { t: "fin" };
