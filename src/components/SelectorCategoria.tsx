"use client";

import { useTransition } from "react";
import { cambiarCategoria } from "@/app/acciones";

type Cat = { id: number; nombre: string; icono: string; tipo: string };

const GRUPOS: [string, string][] = [
  ["gasto", "Gastos"],
  ["ingreso", "Ingresos"],
  ["neutro", "Sin efecto"],
];

export function SelectorCategoria({
  movimientoId,
  actual,
  categorias,
}: {
  movimientoId: number;
  actual: number | null;
  categorias: Cat[];
}) {
  const [guardando, iniciar] = useTransition();
  return (
    <select
      aria-label="Cambiar categoría"
      value={actual ?? ""}
      disabled={guardando}
      onChange={(e) => {
        const id = Number(e.target.value);
        if (id) iniciar(() => cambiarCategoria(movimientoId, id));
      }}
      className="hidden max-w-40 rounded-md border border-borde bg-superficie px-1.5 py-1 text-xs text-tinta-2 disabled:opacity-50 sm:block"
    >
      <option value="" disabled>
        Elegir categoría…
      </option>
      {GRUPOS.map(([tipo, titulo]) => (
        <optgroup key={tipo} label={titulo}>
          {categorias
            .filter((c) => c.tipo === tipo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {c.nombre}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
