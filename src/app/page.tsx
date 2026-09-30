import Link from "next/link";
import { DonaGastos } from "@/components/DonaGastos";
import { ListaMovimientos } from "@/components/ListaMovimientos";
import { SelectorMes } from "@/components/SelectorMes";
import { TotalesMes } from "@/components/TotalesMes";
import { contarPendientes, listarMovimientos, mesImportado, resumenMes, serieMensual } from "@/lib/consultas";
import { mesActual, mesValido, nombreMes } from "@/lib/formato";

export default async function Resumen({ searchParams }: PageProps<"/">) {
  const { mes: mesParam } = await searchParams;
  const mes = mesValido(typeof mesParam === "string" ? mesParam : undefined);
  const [r, movimientos, importado, pendientesTotales, serie] = await Promise.all([
    resumenMes(mes),
    listarMovimientos({ mes }),
    mesImportado(mes),
    contarPendientes(),
    serieMensual(mes, 6),
  ]);
  // Solo tiene sentido para meses cerrados: Mercado Pago genera el resumen cuando termina el mes.
  const sugerirImportar = mes < mesActual() && !importado;

  return (
    <div className="aparecer flex flex-col gap-6">
      <SelectorMes mes={mes} ruta="/" subtitulo="Resumen" />

      {sugerirImportar && (
        <Link
          href="/importar"
          className="tarjeta flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm transition-shadow hover:shadow-alta"
        >
          <span className="text-tinta-2">
            Falta el resumen de cuenta de {nombreMes(mes).toLowerCase()}: sin él, las transferencias no muestran a quién fueron.
          </span>
          <span className="font-medium text-acento">Importar ›</span>
        </Link>
      )}

      <TotalesMes serie={serie} mes={mes} pendientes={r.pendientes} pendientesTotales={pendientesTotales} />

      <section className="tarjeta p-6">
        <h2 className="mb-5 text-[20px] font-semibold tracking-tight">Gastos por categoría</h2>
        <DonaGastos filas={r.categorias} total={r.gastos} mes={mes} />
      </section>

      <section className="tarjeta px-6 pt-5 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight">Últimos movimientos</h2>
          <Link href={`/movimientos?mes=${mes}`} className="text-sm text-acento hover:underline">
            Ver todos ({movimientos.length})
          </Link>
        </div>
        <ListaMovimientos movimientos={movimientos.slice(0, 8)} />
      </section>
    </div>
  );
}
