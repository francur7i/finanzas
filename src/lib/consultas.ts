import { connection } from "next/server";
import { db } from "@/lib/db";
import { mesVecino, rangoMes } from "@/lib/formato";

export const SIN_CATEGORIA = "Sin categorizar";

// Todo se lee por request: el driver de SQLite es sincrónico y Next lo congelaría en el build.
export async function resumenMes(mes: string) {
  await connection();
  const { desde, hasta } = rangoMes(mes);
  const movs = await db.movimiento.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    include: { categoria: true },
  });

  let ingresos = 0;
  let gastos = 0;
  let pendientes = 0;
  const porCategoria = new Map<
    string,
    { id: number | null; nombre: string; icono: string; centavos: number; cantidad: number }
  >();

  let desdeMisCuentas = 0;

  for (const m of movs) {
    if (m.estado === "pendiente") pendientes++;
    // Lo que va y viene entre cuentas propias no es ni ingreso ni gasto. Lo que entra desde el banco propio
    // (ahí llega el sueldo) se muestra aparte porque es con lo que se pagan los gastos.
    if (m.categoria?.tipo === "neutro") {
      if (m.operacion === "account_fund") desdeMisCuentas += m.montoCentavos;
      continue;
    }
    if (m.montoCentavos >= 0) {
      ingresos += m.montoCentavos;
      continue;
    }
    gastos += -m.montoCentavos;
    const nombre = m.categoria?.nombre ?? SIN_CATEGORIA;
    const actual = porCategoria.get(nombre) ?? {
      id: m.categoria?.id ?? null,
      nombre,
      icono: m.categoria?.icono ?? "?",
      centavos: 0,
      cantidad: 0,
    };
    actual.centavos += -m.montoCentavos;
    actual.cantidad++;
    porCategoria.set(nombre, actual);
  }

  return {
    ingresos,
    gastos,
    desdeMisCuentas,
    balance: ingresos + desdeMisCuentas - gastos,
    pendientes,
    cantidad: movs.length,
    categorias: [...porCategoria.values()].sort((a, b) => b.centavos - a.centavos),
  };
}

export type PuntoMensual = { mes: string; ingresos: number; gastos: number; balance: number; desdeMisCuentas: number };

/** Totales de los `cantidad` meses que terminan en `mesFinal` (el más viejo primero). */
export async function serieMensual(mesFinal: string, cantidad = 6): Promise<PuntoMensual[]> {
  const meses = Array.from({ length: cantidad }, (_, i) => mesVecino(mesFinal, i - cantidad + 1));
  const resumenes = await Promise.all(meses.map((m) => resumenMes(m)));
  return resumenes.map((r, i) => ({
    mes: meses[i],
    ingresos: r.ingresos,
    gastos: r.gastos,
    balance: r.balance,
    desdeMisCuentas: r.desdeMisCuentas,
  }));
}

export type FiltrosMovimientos = { mes: string; categoria?: string; estado?: string };

export async function listarMovimientos({ mes, categoria, estado }: FiltrosMovimientos) {
  await connection();
  const { desde, hasta } = rangoMes(mes);
  return db.movimiento.findMany({
    where: {
      fecha: { gte: desde, lt: hasta },
      ...(estado ? { estado } : {}),
      ...(categoria === "sin" ? { categoriaId: null } : categoria ? { categoriaId: Number(categoria) } : {}),
    },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });
}

export async function ultimosMovimientos(cantidad: number) {
  await connection();
  return db.movimiento.findMany({ include: { categoria: true }, orderBy: { fecha: "desc" }, take: cantidad });
}

export async function listarCategorias() {
  await connection();
  return db.categoria.findMany({ orderBy: [{ tipo: "asc" }, { nombre: "asc" }] });
}

export async function contarPendientes() {
  await connection();
  return db.movimiento.count({ where: { estado: "pendiente" } });
}

/** Si ya se importó un resumen de cuenta que cubre (casi) todo el mes. */
export async function mesImportado(mes: string) {
  await connection();
  const { desde, hasta } = rangoMes(mes);
  const DIA = 24 * 60 * 60 * 1000;
  const i = await db.importacion.findFirst({
    where: { desde: { lte: new Date(desde.getTime() + 2 * DIA) }, hasta: { gte: new Date(hasta.getTime() - 3 * DIA) } },
  });
  return i !== null;
}

export async function ultimaSincronizacion() {
  await connection();
  return db.sincronizacion.findFirst({ orderBy: { iniciadaEn: "desc" } });
}
