import { db } from "@/lib/db";
import type { Regla } from "@/generated/prisma/client";

// Lo mínimo que hace falta de un movimiento para decidir su categoría.
export type DatosMovimiento = {
  tipo: string;
  operacion: string | null;
  montoCentavos: number;
  fecha: Date;
  destinatario?: string | null; // la otra cuenta de Mercado Pago
  texto: string; // descripción + rubro + datos del comercio, en minúsculas
};

export type Resultado = {
  categoriaId: number | null;
  reglaId: number | null;
  estado: "auto" | "pendiente";
};

const PESO_ORIGEN: Record<string, number> = { usuario: 300, aprendida: 200, sistema: 100 };

// Descripciones que no dicen nada: no sirven para aprender por texto.
const GENERICAS = new Set([
  "", "varios", "var", "bank transfer", "transferencia", "pago", "payment", "pedido", "producto", "link de pago",
]);
const PARECE_CODIGO = /^[0-9a-f-]{16,}$|^\d+$/; // UUIDs o números de orden

export function esDescripcionGenerica(descripcion: string | null | undefined) {
  const d = textoNormalizado(descripcion);
  return GENERICAS.has(d) || PARECE_CODIGO.test(d);
}

export function textoNormalizado(...partes: (string | null | undefined)[]) {
  return partes
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cumple(r: Regla, m: DatosMovimiento) {
  const signo = m.montoCentavos < 0 ? "sale" : "entra";
  const abs = Math.abs(m.montoCentavos);
  const dia = m.fecha.getDate();
  if (r.descripcionContiene && !m.texto.includes(r.descripcionContiene)) return false;
  if (r.destinatario && r.destinatario !== m.destinatario) return false;
  if (r.tipo && r.tipo !== m.tipo) return false;
  if (r.operacion && r.operacion !== m.operacion) return false;
  if (r.signo && r.signo !== signo) return false;
  if (r.montoMinCentavos != null && abs < r.montoMinCentavos) return false;
  if (r.montoMaxCentavos != null && abs > r.montoMaxCentavos) return false;
  if (r.diaDesde != null && r.diaHasta != null) {
    // Rango que puede cruzar fin de mes (ej. del 28 al 3).
    const dentro =
      r.diaDesde <= r.diaHasta ? dia >= r.diaDesde && dia <= r.diaHasta : dia >= r.diaDesde || dia <= r.diaHasta;
    if (!dentro) return false;
  }
  return true;
}

function especificidad(r: Regla) {
  return [r.descripcionContiene, r.destinatario, r.tipo, r.operacion, r.signo, r.montoMinCentavos, r.diaDesde].filter(
    (v) => v != null,
  ).length;
}

export async function reglasOrdenadas() {
  const reglas = await db.regla.findMany();
  return reglas.sort(
    (a, b) =>
      b.prioridad + (PESO_ORIGEN[b.origen] ?? 0) + especificidad(b) -
      (a.prioridad + (PESO_ORIGEN[a.origen] ?? 0) + especificidad(a)),
  );
}

export function categorizar(m: DatosMovimiento, reglas: Regla[]): Resultado {
  const regla = reglas.find((r) => cumple(r, m));
  if (!regla) return { categoriaId: null, reglaId: null, estado: "pendiente" };
  // Las reglas aprendidas por parecido (monto y día) proponen categoría pero dejan el movimiento para confirmar.
  return {
    categoriaId: regla.categoriaId,
    reglaId: regla.id,
    estado: regla.requiereConfirmar ? "pendiente" : "auto",
  };
}

function datosDe(m: {
  tipo: string;
  operacion: string | null;
  montoCentavos: number;
  fecha: Date;
  descripcion: string | null;
  rubro: string | null;
  destinatario: string | null;
  contraparte: string | null;
  alias: string | null;
  crudo: string | null;
}): DatosMovimiento {
  const f = m.crudo ? (JSON.parse(m.crudo) as Record<string, string>) : {};
  return {
    tipo: m.tipo,
    operacion: m.operacion,
    montoCentavos: m.montoCentavos,
    fecha: m.fecha,
    destinatario: m.destinatario,
    texto: textoNormalizado(m.alias, m.descripcion, m.contraparte, m.rubro, f.BUSINESS_UNIT, f.STORE_NAME, f.POS_NAME),
  };
}

/**
 * Vuelve a pasar las reglas sobre todo lo que el usuario no confirmó a mano (pendientes y
 * categorizados solos). Así una regla nueva resuelve también lo que ya estaba, no solo lo que
 * entre después: ej. "Pedro = Alquiler" saca de "Transferencias" todas las de Pedro.
 * Devuelve cuántos cambiaron.
 */
export async function recategorizar() {
  const reglas = await reglasOrdenadas();
  const movimientos = await db.movimiento.findMany({ where: { estado: { not: "confirmado" } } });
  let cambiados = 0;
  for (const m of movimientos) {
    const r = categorizar(datosDe(m), reglas);
    if (r.categoriaId === m.categoriaId && r.estado === m.estado && r.reglaId === m.reglaId) continue;
    await db.movimiento.update({ where: { id: m.id }, data: r });
    cambiados++;
  }
  return cambiados;
}

async function aprenderPorTexto(texto: string, signo: string, categoriaId: number) {
  const existente = await db.regla.findFirst({ where: { descripcionContiene: texto, signo } });
  if (existente) {
    await db.regla.update({ where: { id: existente.id }, data: { categoriaId, origen: "aprendida" } });
  } else {
    await db.regla.create({ data: { categoriaId, descripcionContiene: texto, signo, origen: "aprendida" } });
  }
}

/**
 * El usuario confirmó la categoría de un movimiento: se guarda y se aprende una regla
 * para que la próxima vez se resuelva solo (o al menos venga sugerido).
 */
export async function confirmarCategoria(movimientoId: number, categoriaId: number, nota?: string) {
  const m = await db.movimiento.findUniqueOrThrow({ where: { id: movimientoId } });

  await db.movimiento.update({
    where: { id: movimientoId },
    data: { categoriaId, estado: "confirmado", ...(nota !== undefined ? { nota } : {}) },
  });

  const signo = m.montoCentavos < 0 ? "sale" : "entra";
  const descripcion = textoNormalizado(m.descripcion);

  if (m.destinatario) {
    // Misma cuenta del otro lado (la misma persona o el mismo comercio): la señal más confiable.
    const existente = await db.regla.findFirst({ where: { destinatario: m.destinatario, signo } });
    if (existente) {
      await db.regla.update({ where: { id: existente.id }, data: { categoriaId, origen: "aprendida" } });
    } else {
      await db.regla.create({ data: { categoriaId, destinatario: m.destinatario, signo, origen: "aprendida" } });
    }
    await recategorizar();
    return;
  }

  const contraparte = textoNormalizado(m.contraparte);
  if (contraparte) {
    // Nombre de la otra parte (sale del resumen de cuenta): típico de transferencias a otros bancos.
    await aprenderPorTexto(contraparte, signo, categoriaId);
    await recategorizar();
    return;
  }

  if (!esDescripcionGenerica(descripcion)) {
    // Hay un comercio identificable: la regla por texto es confiable, categoriza sola.
    await aprenderPorTexto(descripcion, signo, categoriaId);
    await recategorizar();
    return;
  }

  // Sin descripción útil (típico de transferencias): se aprende por monto parecido y día del mes,
  // y se pide confirmación porque dos transferencias parecidas pueden ser cosas distintas.
  const abs = Math.abs(m.montoCentavos);
  const dia = m.fecha.getDate();
  const diaDesde = ((dia - 4 + 31) % 31) + 1;
  const diaHasta = ((dia + 2) % 31) + 1;
  await db.regla.create({
    data: {
      categoriaId,
      tipo: m.tipo,
      signo,
      montoMinCentavos: Math.round(abs * 0.85),
      montoMaxCentavos: Math.round(abs * 1.15),
      diaDesde,
      diaHasta,
      requiereConfirmar: true,
      origen: "aprendida",
    },
  });
  await recategorizar();
}
