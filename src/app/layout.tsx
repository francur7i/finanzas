import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navegacion } from "@/components/Navegacion";
import { BotonSincronizar } from "@/components/BotonSincronizar";
import { BotonTema, scriptTema } from "@/components/BotonTema";
import { contarPendientes, ultimaSincronizacion } from "@/lib/consultas";
import { fechaHora } from "@/lib/formato";

// Respaldo de SF Pro fuera de Apple (ver --font-sans en globals.css).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Control de finanzas personales con Mercado Pago",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [pendientes, sync] = await Promise.all([contarPendientes(), ultimaSincronizacion()]);
  const textoSync = sync
    ? sync.estado === "error"
      ? `Última sincronización con error (${fechaHora(sync.iniciadaEn)})`
      : `Actualizado ${fechaHora(sync.terminadaEn ?? sync.iniciadaEn)}`
    : "Todavía no se sincronizó";

  return (
    <html lang="es" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Barra translúcida con desenfoque, como en las apps de Apple */}
        <header className="sticky top-0 z-20 border-b border-borde bg-vidrio backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-5">
              <span className="text-[17px] font-semibold tracking-tight">Finanzas</span>
              <Navegacion pendientes={pendientes} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <BotonSincronizar ultima={textoSync} />
              <BotonTema />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16">{children}</main>
      </body>
    </html>
  );
}
