import type { Metadata } from "next";
import "./globals.css";
import { Navegacion } from "@/components/Navegacion";
import { BotonSincronizar } from "@/components/BotonSincronizar";
import { contarPendientes, ultimaSincronizacion } from "@/lib/consultas";
import { fechaHora } from "@/lib/formato";

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
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-borde bg-superficie/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
            <div className="flex items-center gap-6">
              <span className="font-semibold tracking-tight">Finanzas</span>
              <Navegacion pendientes={pendientes} />
            </div>
            <BotonSincronizar ultima={textoSync} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
