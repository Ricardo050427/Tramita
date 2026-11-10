import { notFound } from "next/navigation";
import { LlenarFormato } from "@/components/llenar";
import { esLlenable, idsFormatos } from "@/lib/llenado";

export const instant = false;

export function generateStaticParams() {
  return idsFormatos.map((id) => ({ id }));
}

export default async function PaginaLlenar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esLlenable(id)) notFound();
  return <LlenarFormato id={id} />;
}
