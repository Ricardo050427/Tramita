import type { Metadata, Viewport } from "next";
import { Fira_Sans } from "next/font/google";
import "./globals.css";

const fira = Fira_Sans({
  variable: "--fuente-senal",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tramita",
  description: "Pregunta por cualquier trámite de Hermosillo y sabe qué llevar, cuánto cuesta y a dónde ir.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Tramita", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e96000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={fira.variable}>
      <body>{children}</body>
    </html>
  );
}
