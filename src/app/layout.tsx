import type { Metadata, Viewport } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Overpass({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"], variable: "--font-overpass" });
const mono = Overpass_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-overpass-mono" });

export const metadata: Metadata = { title: { default: "VManque WMS", template: "%s · VManque WMS" }, description: "Gestión de bodega" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f3b6d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
