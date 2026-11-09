import { notFound } from "next/navigation";
import { VistaTramite } from "@/components/ficha";
import { tramitePorClave, tramites } from "@/lib/datos";

export const instant = false;

export function generateStaticParams() {
  return tramites.map((t) => ({ clave: t.clave }));
}

export default async function PaginaTramite({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const tramite = tramitePorClave(clave);
  if (!tramite) notFound();
  return <VistaTramite tramite={tramite} />;
}
