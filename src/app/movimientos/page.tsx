import { ListaMovimientos } from "@/components/ListaMovimientos";
import { SelectorCategoria } from "@/components/SelectorCategoria";
import { SelectorMes } from "@/components/SelectorMes";
import { listarCategorias, listarMovimientos } from "@/lib/consultas";
import { mesValido, pesos } from "@/lib/formato";

const texto = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function Movimientos({ searchParams }: PageProps<"/movimientos">) {
  const sp = await searchParams;
  const mes = mesValido(texto(sp.mes));
  const categoria = texto(sp.categoria);
  const estado = texto(sp.estado);

  const [movimientos, categorias] = await Promise.all([
    listarMovimientos({ mes, categoria, estado }),
    listarCategorias(),
  ]);

  const entra = movimientos.filter((m) => m.montoCentavos > 0).reduce((s, m) => s + m.montoCentavos, 0);
  const sale = movimientos.filter((m) => m.montoCentavos < 0).reduce((s, m) => s - m.montoCentavos, 0);
  const extra = `${categoria ? `&categoria=${categoria}` : ""}${estado ? `&estado=${estado}` : ""}`;
  const control = "rounded-full bg-superficie px-3.5 py-2 text-sm text-tinta shadow-suave outline-none focus:ring-2 focus:ring-acento";

  return (
    <div className="aparecer flex flex-col gap-5">
      <SelectorMes mes={mes} ruta="/movimientos" extra={extra} subtitulo="Movimientos" />

      {/* Filtros: formulario GET, la URL queda compartible */}
      <form className="flex flex-wrap items-center gap-2" action="/movimientos">
        <input type="hidden" name="mes" value={mes} />
        <select name="categoria" defaultValue={categoria ?? ""} className={control} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          <option value="sin">Sin categorizar</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icono} {c.nombre}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={estado ?? ""} className={control} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="pendiente">Para revisar</option>
          <option value="auto">Categorizados solos</option>
          <option value="confirmado">Confirmados por vos</option>
        </select>
        <button className="rounded-full bg-acento px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">Filtrar</button>
        <span className="cifras ml-auto text-xs text-tinta-3">
          {movimientos.length} movimientos · entró <span className="text-positivo">{pesos(entra)}</span> · salió{" "}
          {pesos(sale)}
        </span>
      </form>

      <section className="tarjeta px-5 py-2">
        <ListaMovimientos
          movimientos={movimientos}
          accion={(m) => <SelectorCategoria movimientoId={m.id} actual={m.categoriaId} categorias={categorias} />}
        />
      </section>
    </div>
  );
}
