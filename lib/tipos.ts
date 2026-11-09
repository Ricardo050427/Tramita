export type Requisito = { titulo: string; detalle?: string };

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
  horario: string;
  telefono: string;
  domicilio: string;
  enLinea: string;
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
  | { t: "sugerencias"; items: string[] }
  | { t: "aviso"; d: string }
  | { t: "fin" };
