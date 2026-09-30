import Link from "next/link";
import { pesosRedondo } from "@/lib/formato";

type Fila = { id: number | null; nombre: string; icono: string; centavos: number; cantidad: number };

// Barras horizontales de un solo tono: el trabajo es comparar magnitudes, no distinguir series.
// Cada fila lleva monto y porcentaje escritos, así el color nunca es la única forma de leerla.
export function GastosPorCategoria({ filas, total, mes }: { filas: Fila[]; total: number; mes: string }) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-sm text-tinta-3">No hay gastos este mes.</p>;
  }
  const maximo = filas[0].centavos;

  return (
    <ul className="flex flex-col gap-1" aria-label="Gastos por categoría">
      {filas.map((f) => {
        const pct = total > 0 ? (f.centavos / total) * 100 : 0;
        const ancho = Math.max((f.centavos / maximo) * 100, 0.5);
        const sinCategoria = f.id === null;
        const href = `/movimientos?mes=${mes}&categoria=${f.id ?? "sin"}`;
        return (
          <li key={f.nombre}>
            <Link
              href={href}
              className="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-grilla/60 sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span aria-hidden>{f.icono}</span>
                <span className={`truncate ${sinCategoria ? "text-aviso font-medium" : "text-tinta-2"}`}>{f.nombre}</span>
              </span>
              <span className="h-3 w-full" aria-hidden>
                <span
                  className={`block h-full rounded-r-[4px] ${sinCategoria ? "bg-aviso" : "bg-barra"} transition-opacity group-hover:opacity-80`}
                  style={{ width: `${ancho}%` }}
                />
              </span>
              <span className="cifras text-right text-sm">
                <span className="font-medium text-tinta">{pesosRedondo(f.centavos)}</span>
                <span className="ml-2 inline-block w-10 text-tinta-3">{pct.toFixed(0)}%</span>
              </span>
              {/* Tooltip al pasar el mouse */}
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-tinta px-2 py-1 text-xs text-plano shadow group-hover:block"
              >
                {f.cantidad} movimiento{f.cantidad === 1 ? "" : "s"} · {pct.toFixed(1)}% del gasto · ver detalle
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
