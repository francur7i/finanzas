import Link from "next/link";
import { DonaGastos } from "@/components/DonaGastos";
import { ListaMovimientos } from "@/components/ListaMovimientos";
import { SelectorMes } from "@/components/SelectorMes";
import { contarPendientes, listarMovimientos, mesImportado, resumenMes } from "@/lib/consultas";
import { mesActual, mesValido, nombreMes, pesos } from "@/lib/formato";

export default async function Resumen({ searchParams }: PageProps<"/">) {
  const { mes: mesParam } = await searchParams;
  const mes = mesValido(typeof mesParam === "string" ? mesParam : undefined);
  const [r, movimientos, importado, pendientesTotales] = await Promise.all([
    resumenMes(mes),
    listarMovimientos({ mes }),
    mesImportado(mes),
    contarPendientes(),
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

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Totales del mes">
        <Tile
          titulo="Ingresos"
          valor={pesos(r.ingresos)}
          tono="text-positivo"
          detalle={r.desdeMisCuentas > 0 ? `+ ${pesos(r.desdeMisCuentas)} desde tu banco` : undefined}
        />
        <Tile titulo="Gastos" valor={pesos(r.gastos)} />
        <Tile
          titulo="Balance"
          valor={pesos(r.balance)}
          tono={r.balance >= 0 ? "text-positivo" : "text-negativo"}
          detalle="entró menos salió"
        />
        <Tile
          titulo="Para revisar este mes"
          valor={String(r.pendientes)}
          detalle={
            r.pendientes > 0
              ? "sin confirmar"
              : pendientesTotales > 0
                ? `${pendientesTotales} en otros meses`
                : "todo al día"
          }
          href={r.pendientes > 0 || pendientesTotales > 0 ? "/chat" : undefined}
        />
      </section>

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
      <span className="text-[13px] font-medium text-tinta-3">{titulo}</span>
      <span className={`cifras truncate text-[22px] font-semibold tracking-tight sm:text-[26px] ${tono}`}>{valor}</span>
      {detalle && <span className="truncate text-xs text-tinta-3">{detalle}</span>}
    </>
  );
  const clase = "tarjeta flex min-w-0 flex-col gap-1 p-4 sm:p-5";
  return href ? (
    <Link href={href} className={`${clase} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-alta`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
