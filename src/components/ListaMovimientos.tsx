import type { ReactNode } from "react";
import { fechaCorta, pesos } from "@/lib/formato";

type Mov = {
  id: number;
  fecha: Date;
  montoCentavos: number;
  descripcion: string | null;
  nota: string | null;
  tipo: string;
  operacion: string | null;
  estado: string;
  categoriaId: number | null;
  categoria: { nombre: string; icono: string; tipo: string } | null;
};

/** Texto a mostrar cuando la fuente no trae descripción. */
export function descripcionVisible(m: Pick<Mov, "descripcion" | "nota" | "tipo" | "operacion" | "montoCentavos">) {
  if (m.nota) return m.nota;
  if (m.descripcion && m.descripcion !== "Varios") return m.descripcion;
  if (m.tipo === "PAYOUTS") return "Transferencia enviada";
  if (m.operacion === "money_transfer") return m.montoCentavos < 0 ? "Transferencia a cuenta Mercado Pago" : "Transferencia recibida";
  if (m.operacion === "rendimiento") return "Rendimiento diario";
  if (m.operacion === "account_fund") return "Ingreso desde tu banco";
  if (m.operacion === "investment") return "Movimiento a inversión";
  return m.descripcion || "Pago";
}

export function ListaMovimientos({ movimientos, accion }: { movimientos: Mov[]; accion?: (m: Mov) => ReactNode }) {
  if (movimientos.length === 0) {
    return <p className="py-8 text-center text-sm text-tinta-3">No hay movimientos con estos filtros.</p>;
  }
  return (
    <ul className="divide-y divide-borde">
      {movimientos.map((m) => {
        const neutro = m.categoria?.tipo === "neutro";
        const color = neutro ? "text-tinta-3" : m.montoCentavos >= 0 ? "text-positivo" : "text-tinta";
        return (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <span className="cifras w-11 shrink-0 text-xs text-tinta-3">{fechaCorta(m.fecha)}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm">{descripcionVisible(m)}</span>
              <span className="flex items-center gap-1.5 text-xs text-tinta-3">
                {m.categoria ? (
                  <span>
                    {m.categoria.icono} {m.categoria.nombre}
                  </span>
                ) : (
                  <span className="text-aviso">Sin categorizar</span>
                )}
                {m.estado === "pendiente" && (
                  <span className="rounded bg-aviso-suave px-1 text-[10px] font-medium text-aviso">revisar</span>
                )}
              </span>
            </span>
            {accion?.(m)}
            <span className={`cifras shrink-0 text-right text-sm font-medium ${color}`}>
              {m.montoCentavos >= 0 ? "+" : "−"}
              {pesos(Math.abs(m.montoCentavos))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
