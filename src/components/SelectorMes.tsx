import Link from "next/link";
import { mesActual, mesVecino, nombreMes } from "@/lib/formato";

const Flecha = ({ izquierda }: { izquierda?: boolean }) => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={izquierda ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
  </svg>
);

/** Título grande del mes con flechas, al estilo de los encabezados de iOS. */
export function SelectorMes({ mes, ruta, extra = "", subtitulo }: { mes: string; ruta: string; extra?: string; subtitulo?: string }) {
  const siguiente = mesVecino(mes, 1);
  const hayFuturo = siguiente <= mesActual();
  const boton = "grid h-9 w-9 place-items-center rounded-full bg-superficie text-tinta-2 shadow-suave transition-colors hover:text-acento";
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {subtitulo && <p className="text-sm font-medium text-tinta-3">{subtitulo}</p>}
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">{nombreMes(mes)}</h1>
      </div>
      <div className="flex gap-2 pb-1">
        <Link href={`${ruta}?mes=${mesVecino(mes, -1)}${extra}`} className={boton} aria-label="Mes anterior">
          <Flecha izquierda />
        </Link>
        {hayFuturo ? (
          <Link href={`${ruta}?mes=${siguiente}${extra}`} className={boton} aria-label="Mes siguiente">
            <Flecha />
          </Link>
        ) : (
          <span className={`${boton} opacity-40`} aria-hidden>
            <Flecha />
          </span>
        )}
      </div>
    </div>
  );
}
