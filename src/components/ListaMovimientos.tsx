import type { ReactNode } from "react";
import { IconoCategoria } from "@/components/IconoCategoria";
import { descripcionVisible } from "@/lib/descripcion";
import { fechaCorta, pesos } from "@/lib/formato";

type Mov = {
  id: number;
  fecha: Date;
  montoCentavos: number;
  descripcion: string | null;
  nota: string | null;
  tipo: string;
  operacion: string | null;
  rubro: string | null;
  contraparte: string | null;
  estado: string;
  categoriaId: number | null;
  categoria: { nombre: string; icono: string; tipo: string } | null;
};

/** Lista estilo Wallet: ícono redondeado, título, categoría y fecha abajo, monto a la derecha. */
export function ListaMovimientos({ movimientos, accion }: { movimientos: Mov[]; accion?: (m: Mov) => ReactNode }) {
  if (movimientos.length === 0) {
    return <p className="py-10 text-center text-sm text-tinta-3">No hay movimientos con estos filtros.</p>;
  }
  return (
    <ul>
      {movimientos.map((m) => {
        const neutro = m.categoria?.tipo === "neutro";
        const color = neutro ? "text-tinta-3" : m.montoCentavos >= 0 ? "text-positivo" : "text-tinta";
        return (
          <li key={m.id} className="flex items-center gap-3 py-2.5 [&+li]:border-t [&+li]:border-borde">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-superficie-2 text-tinta-2" aria-hidden>
              <IconoCategoria nombre={m.categoria?.nombre} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px]">{descripcionVisible(m)}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-tinta-3">
                <span className="cifras">{fechaCorta(m.fecha)}</span>
                <span aria-hidden>·</span>
                {m.categoria ? <span className="truncate">{m.categoria.nombre}</span> : <span className="text-aviso">Sin categorizar</span>}
                {m.estado === "pendiente" && (
                  <span className="rounded-full bg-aviso-suave px-1.5 text-[11px] font-medium text-aviso">revisar</span>
                )}
              </span>
            </span>
            {accion?.(m)}
            <span className={`cifras shrink-0 text-right text-[15px] font-semibold ${color}`}>
              {m.montoCentavos >= 0 ? "+" : "−"}
              {pesos(Math.abs(m.montoCentavos))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
