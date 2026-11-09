import { Aplicacion } from "@/components/aplicacion";
import { categorias, indice } from "@/lib/datos";

export default function Inicio() {
  return <Aplicacion categorias={categorias} indice={indice} />;
}
