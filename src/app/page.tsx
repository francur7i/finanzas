import Link from "next/link";
import { GastosPorCategoria } from "@/components/GastosPorCategoria";
import { ListaMovimientos } from "@/components/ListaMovimientos";
import { SelectorMes } from "@/components/SelectorMes";
import { listarMovimientos, resumenMes } from "@/lib/consultas";
import { mesValido, pesos } from "@/lib/formato";

export default async function Resumen({ searchParams }: PageProps<"/">) {
  const { mes: mesParam } = await searchParams;
  const mes = mesValido(typeof mesParam === "string" ? mesParam : undefined);
  const [r, movimientos] = await Promise.all([resumenMes(mes), listarMovimientos({ mes })]);

  return (
    <div className="flex flex-col gap-6">
      <SelectorMes mes={mes} ruta="/" />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Totales del mes">
        <Tile
          titulo="Ingresos"
          valor={pesos(r.ingresos)}
          tono="text-positivo"
          detalle={r.desdeMisCuentas > 0 ? `+ ${pesos(r.desdeMisCuentas)} que pasaste desde tu banco` : undefined}
        />
        <Tile titulo="Gastos" valor={pesos(r.gastos)} />
        <Tile
          titulo="Balance"
          valor={pesos(r.balance)}
          tono={r.balance >= 0 ? "text-positivo" : "text-negativo"}
          detalle="lo que entró menos lo que salió"
        />
        <Tile
          titulo="Para revisar"
          valor={String(r.pendientes)}
          detalle={r.pendientes > 0 ? "movimientos sin confirmar" : "todo al día"}
          href={r.pendientes > 0 ? "/chat" : undefined}
        />
      </section>

      <section className="rounded-xl border border-borde bg-superficie p-4">
        <h2 className="mb-3 text-sm font-medium text-tinta-2">Gastos por categoría</h2>
        <GastosPorCategoria filas={r.categorias} total={r.gastos} mes={mes} />
      </section>

      <section className="rounded-xl border border-borde bg-superficie p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-tinta-2">Últimos movimientos</h2>
          <Link href={`/movimientos?mes=${mes}`} className="text-sm text-acento hover:underline">
            Ver todos ({movimientos.length})
          </Link>
        </div>
        <ListaMovimientos movimientos={movimientos.slice(0, 8)} />
      </section>
    </div>
  );
}

function Tile({
  titulo,
  valor,
  detalle,
  tono = "text-tinta",
  href,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  tono?: string;
  href?: string;
}) {
  const contenido = (
    <>
      <span className="text-xs text-tinta-3">{titulo}</span>
      <span className={`text-xl font-semibold tracking-tight sm:text-2xl ${tono}`}>{valor}</span>
      {detalle && <span className="text-xs text-tinta-3">{detalle}</span>}
    </>
  );
  const clase = "flex flex-col gap-1 rounded-xl border border-borde bg-superficie p-4";
  return href ? (
    <Link href={href} className={`${clase} hover:border-aviso`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
