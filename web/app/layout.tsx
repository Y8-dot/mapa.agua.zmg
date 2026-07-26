import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapa-agua-zmg.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mapa Ciudadano de Calidad del Agua — ZMG",
    template: "%s · Mapa Agua ZMG",
  },
  description:
    "Mapa interactivo que centraliza reportes de calidad del agua potable por colonia en la Zona Metropolitana de Guadalajara. Datos de fuentes oficiales, académicas, periodísticas y ciudadanas.",
  applicationName: "Mapa Agua ZMG",
  authors: [{ name: "Mapa Ciudadano de Calidad del Agua ZMG", url: SITE_URL }],
  category: "Transparencia ciudadana",
  keywords: [
    "agua",
    "calidad del agua",
    "Guadalajara",
    "ZMG",
    "Zapopan",
    "Tlaquepaque",
    "Tonalá",
    "SIAPA",
    "contaminación",
    "metales pesados",
    "coliformes",
    "IMDEC",
    "mapa ciudadano",
    "transparencia",
    "Jalisco",
    "El Salto",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Mapa Ciudadano de Calidad del Agua — ZMG",
    url: "/",
    title: "Mapa Ciudadano de Calidad del Agua — ZMG",
    description:
      "¿Qué tan limpia es el agua de tu colonia? Reportes, fuentes y datos en un mapa interactivo de la ZMG.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa Ciudadano de Calidad del Agua — ZMG",
    description:
      "¿Qué tan limpia es el agua de tu colonia? Mapa interactivo de la ZMG con reportes verificados.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
