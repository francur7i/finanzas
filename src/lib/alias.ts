import { db } from "@/lib/db";
import { recategorizar, textoNormalizado } from "@/lib/categorizar";

// Apodos: el usuario enseña por chat "EBANX es Uber" y todo lo que diga EBANX se muestra como Uber.
// El apodo también entra en el texto que leen las reglas, así "uber" → Transporte funciona solo.

/** Recalcula Movimiento.alias según los apodos vigentes. Devuelve cuántos cambiaron. */
export async function aplicarAlias() {
  const apodos = (await db.alias.findMany()).sort((a, b) => b.patron.length - a.patron.length); // el más específico gana
  const movimientos = await db.movimiento.findMany({
    select: { id: true, descripcion: true, contraparte: true, rubro: true, alias: true },
  });
  let cambiados = 0;
  for (const m of movimientos) {
    const texto = textoNormalizado(m.descripcion, m.contraparte, m.rubro);
    const alias = apodos.find((a) => texto.includes(a.patron))?.nombre ?? null;
    if (alias === m.alias) continue;
    await db.movimiento.update({ where: { id: m.id }, data: { alias } });
    cambiados++;
  }
  return cambiados;
}

export async function crearAlias(patron: string, nombre: string) {
  const p = textoNormalizado(patron);
  if (p.length < 3) throw new Error("El nombre a reemplazar es demasiado corto.");
  await db.alias.upsert({ where: { patron: p }, create: { patron: p, nombre: nombre.trim() }, update: { nombre: nombre.trim() } });
  const movimientos = await aplicarAlias();
  await recategorizar();
  return { patron: p, movimientos };
}

export async function borrarAlias(patron: string) {
  const p = textoNormalizado(patron);
  const { count } = await db.alias.deleteMany({ where: { OR: [{ patron: p }, { nombre: patron.trim() }] } });
  await aplicarAlias();
  await recategorizar();
  return count;
}
