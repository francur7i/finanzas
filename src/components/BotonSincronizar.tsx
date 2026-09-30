"use client";

import { useState, useTransition } from "react";
import { sincronizarAhora } from "@/app/acciones";

export function BotonSincronizar({ ultima }: { ultima: string | null }) {
  const [enCurso, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  function sincronizar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await sincronizarAhora();
      setMensaje(
        r.estado === "ok"
          ? r.nuevas > 0
            ? `${r.nuevas} movimiento${r.nuevas === 1 ? "" : "s"} nuevo${r.nuevas === 1 ? "" : "s"}`
            : "Sin novedades"
          : (r.mensaje ?? "No se pudo sincronizar"),
      );
    });
  }

  return (
    <div className="flex items-center gap-3 text-xs text-tinta-3">
      <span className="hidden sm:inline" aria-live="polite">
        {enCurso ? "Pidiendo el reporte a Mercado Pago… (tarda unos minutos)" : (mensaje ?? ultima)}
      </span>
      <button
        onClick={sincronizar}
        disabled={enCurso}
        className="rounded-lg border border-borde px-3 py-1.5 text-sm text-tinta-2 transition-colors hover:bg-grilla disabled:opacity-60"
      >
        {enCurso ? "Sincronizando…" : "Sincronizar"}
      </button>
    </div>
  );
}
