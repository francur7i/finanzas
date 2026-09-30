import Link from "next/link";
import { mesActual, mesVecino, nombreMes } from "@/lib/formato";

export function SelectorMes({ mes, ruta, extra = "" }: { mes: string; ruta: string; extra?: string }) {
  const siguiente = mesVecino(mes, 1);
  const hayFuturo = siguiente <= mesActual();
  const boton = "grid h-8 w-8 place-items-center rounded-lg border border-borde text-tinta-2 hover:bg-grilla";
  return (
    <div className="flex items-center gap-2">
      <Link href={`${ruta}?mes=${mesVecino(mes, -1)}${extra}`} className={boton} aria-label="Mes anterior">
        ‹
      </Link>
      <h1 className="min-w-40 text-center text-lg font-semibold">{nombreMes(mes)}</h1>
      {hayFuturo ? (
        <Link href={`${ruta}?mes=${siguiente}${extra}`} className={boton} aria-label="Mes siguiente">
          ›
        </Link>
      ) : (
        <span className={`${boton} opacity-30`} aria-hidden>
          ›
        </span>
      )}
    </div>
  );
}
