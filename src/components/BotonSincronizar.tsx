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

  const texto = enCurso ? "Pidiendo el reporte a Mercado Pago… (tarda unos minutos)" : (mensaje ?? ultima ?? "");

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-tinta-3 lg:inline" aria-live="polite">
        {texto}
      </span>
      <button
        onClick={sincronizar}
        disabled={enCurso}
        title={`Sincronizar con Mercado Pago. ${texto}`}
        aria-label="Sincronizar con Mercado Pago"
        className="grid h-8 w-8 place-items-center rounded-full text-tinta-2 transition-colors hover:bg-grilla hover:text-tinta disabled:opacity-60"
      >
        <svg
          viewBox="0 0 20 20"
          className={`h-[18px] w-[18px] ${enCurso ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6" />
          <path d="M16.5 3.5v3.5H13" />
        </svg>
      </button>
    </div>
  );
}
