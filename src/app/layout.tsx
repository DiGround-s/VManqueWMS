import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { LIQUID_BOOT } from "@/components/liquid-toggle";
import "./globals.css";

// Inter stands in for SF Pro where the system font is not Apple's (Windows, Android).
const sans = Inter({ subsets: ["latin"], variable: "--font-ui" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-ui-mono" });

export const metadata: Metadata = { title: { default: "VManque WMS", template: "%s · VManque WMS" }, description: "Gestión de bodega" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f2f7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LIQUID_BOOT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
