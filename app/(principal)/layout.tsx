import { Marco } from "@/components/marco";
import { indice } from "@/lib/datos";

export default function LayoutPrincipal({ children }: { children: React.ReactNode }) {
  return <Marco indice={indice}>{children}</Marco>;
}
