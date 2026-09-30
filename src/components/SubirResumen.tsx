"use client";

import { useActionState, useState } from "react";
import { importarResumenCuenta, type ResultadoImportacion } from "@/app/acciones";

export function SubirResumen() {
  const [resultado, enviar, subiendo] = useActionState<ResultadoImportacion | null, FormData>(importarResumenCuenta, null);
  const [nombre, setNombre] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <form action={enviar} className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-2xl border-2 border-dashed border-borde px-5 py-4 text-sm text-tinta-2 transition-colors hover:border-acento hover:text-acento">
          <input
            type="file"
            name="archivo"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => setNombre(e.target.files?.[0]?.name ?? null)}
          />
          {nombre ?? "Elegir el archivo .csv…"}
        </label>
        <button
          disabled={subiendo || !nombre}
          className="rounded-full bg-acento px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {subiendo ? "Importando…" : "Importar"}
        </button>
      </form>

      {resultado?.ok === false && (
        <p role="alert" className="rounded-xl bg-aviso-suave px-4 py-3 text-sm text-aviso">
          {resultado.error}
        </p>
      )}
      {resultado?.ok && (
        <div role="status" className="space-y-1 rounded-xl bg-superficie-2 px-4 py-3 text-sm">
          <p>
            Listo: {resultado.cruzadas} de {resultado.filas} líneas coinciden con tus movimientos y{" "}
            <strong>{resultado.conNombre}</strong> ahora tienen el nombre de la otra parte.
          </p>
          {resultado.recategorizados > 0 && (
            <p className="text-tinta-2">Con los nombres se recategorizaron {resultado.recategorizados} movimientos.</p>
          )}
          {resultado.sinCruzar.length > 0 && (
            <details className="text-tinta-2">
              <summary className="cursor-pointer">
                {resultado.sinCruzar.length} líneas no están en la base (todavía no se sincronizaron o son de antes)
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {resultado.sinCruzar.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
