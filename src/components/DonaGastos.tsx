"use client";

import Link from "next/link";
import { useState } from "react";
import { pesosRedondo } from "@/lib/formato";

type Fila = { id: number | null; nombre: string; icono: string; centavos: number; cantidad: number };

// El color sigue a la categoría, nunca a su posición en el ranking: si un mes cambia el orden, los colores no.
// Ocho tonos validados (ver globals.css); el resto de las categorías se agrupa en "Otras" en gris.
const COLOR_POR_CATEGORIA: Record<string, string> = {
  Transferencias: "var(--serie-1)",
  "Comida y delivery": "var(--serie-2)",
  Supermercado: "var(--serie-3)",
  Transporte: "var(--serie-4)",
  Suscripciones: "var(--serie-5)",
  Servicios: "var(--serie-6)",
  "Compras online": "var(--serie-7)",
  Vivienda: "var(--serie-8)",
};
const OTRAS = "var(--serie-otras)";

const R = 70;
const GROSOR = 22;
const CIRC = 2 * Math.PI * R;
const HUECO = 2; // separación de 2px entre porciones, del color de la superficie

export function DonaGastos({ filas, total, mes }: { filas: Fila[]; total: number; mes: string }) {
  const [activa, setActiva] = useState<string | null>(null);

  if (filas.length === 0 || total <= 0) {
    return <p className="py-10 text-center text-sm text-tinta-3">No hay gastos este mes.</p>;
  }

  // Porciones: categorías con color propio + una sola porción "Otras" con el resto.
  const conColor = filas.filter((f) => COLOR_POR_CATEGORIA[f.nombre]);
  const resto = filas.filter((f) => !COLOR_POR_CATEGORIA[f.nombre]);
  const porciones = [
    ...conColor.map((f) => ({ clave: f.nombre, centavos: f.centavos, color: COLOR_POR_CATEGORIA[f.nombre] })),
    ...(resto.length ? [{ clave: "Otras", centavos: resto.reduce((s, f) => s + f.centavos, 0), color: OTRAS }] : []),
  ];

  let acumulado = 0;
  const arcos = porciones.map((p) => {
    const largo = (p.centavos / total) * CIRC;
    const arco = { ...p, largo, inicio: acumulado };
    acumulado += largo;
    return arco;
  });

  const claveDe = (f: Fila) => (COLOR_POR_CATEGORIA[f.nombre] ? f.nombre : "Otras");
  const seleccion = activa ? filas.filter((f) => claveDe(f) === activa) : [];
  const montoActivo = seleccion.reduce((s, f) => s + f.centavos, 0);

  return (
    <div className="grid items-center gap-8 md:grid-cols-[240px_1fr]">
      <div className="relative mx-auto h-60 w-60">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Gastos por categoría">
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--grilla)" strokeWidth={GROSOR} />
          {arcos.map((a) => {
            const atenuada = activa !== null && activa !== a.clave;
            return (
              <circle
                key={a.clave}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={GROSOR}
                strokeDasharray={`${Math.max(a.largo - HUECO, 0.5)} ${CIRC}`}
                strokeDashoffset={-a.inicio}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: atenuada ? 0.25 : 1 }}
                onMouseEnter={() => setActiva(a.clave)}
                onMouseLeave={() => setActiva(null)}
              >
                <title>{`${a.clave}: ${pesosRedondo(a.centavos)} (${((a.centavos / total) * 100).toFixed(1)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        {/* Centro: total del mes, o la categoría señalada */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-tinta-3">{activa ?? "Gastos del mes"}</span>
          <span className="cifras text-2xl font-semibold tracking-tight">{pesosRedondo(activa ? montoActivo : total)}</span>
          {activa && <span className="cifras text-xs text-tinta-2">{((montoActivo / total) * 100).toFixed(1)}%</span>}
        </div>
      </div>

      {/* Leyenda: cada fila dice nombre, % y monto; el color nunca es la única forma de leerla */}
      <ul className="flex flex-col" aria-label="Detalle por categoría">
        {filas.map((f) => {
          const clave = claveDe(f);
          const pct = (f.centavos / total) * 100;
          const atenuada = activa !== null && activa !== clave;
          return (
            <li key={f.nombre}>
              <Link
                href={`/movimientos?mes=${mes}&categoria=${f.id ?? "sin"}`}
                onMouseEnter={() => setActiva(clave)}
                onMouseLeave={() => setActiva(null)}
                className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-superficie-2"
                style={{ opacity: atenuada ? 0.45 : 1 }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: COLOR_POR_CATEGORIA[f.nombre] ?? OTRAS }} aria-hidden />
                <span className="truncate text-sm">
                  {f.icono} {f.nombre}
                  <span className="ml-1.5 text-xs text-tinta-3">
                    {f.cantidad} mov.
                  </span>
                </span>
                <span className="cifras w-12 text-right text-sm text-tinta-2">{pct < 1 ? "<1" : pct.toFixed(0)}%</span>
                <span className="cifras w-28 text-right text-sm font-medium">{pesosRedondo(f.centavos)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
