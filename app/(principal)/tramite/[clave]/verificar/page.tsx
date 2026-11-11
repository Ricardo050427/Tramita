import { notFound } from "next/navigation";
import { Verificador } from "@/components/verificador";
import { tramitePorClave, tramites } from "@/lib/datos";

export const instant = false;

export function generateStaticParams() {
  return tramites.map((t) => ({ clave: t.clave }));
}

export async function generateMetadata({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  return { title: tramite ? `Verificar: ${tramite.nombre} · Tramita` : "Tramita" };
}

export default async function PaginaVerificar({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  if (!tramite) notFound();
  return <Verificador tramite={tramite} />;
}
