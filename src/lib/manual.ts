import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { categorizar, confirmarCategoria, reglasOrdenadas, textoNormalizado } from "@/lib/categorizar";

/**
 * Movimiento cargado a mano (efectivo o algo que no pasa por Mercado Pago).
 * Si viene categoría, queda confirmado y la app aprende; si no, se intenta con las reglas.
 */
export async function crearMovimientoManual(descripcion: string, montoCentavos: number, categoriaId?: number) {
  const fecha = new Date();
  const resultado = categorizar(
    { tipo: "MANUAL", operacion: null, montoCentavos, fecha, texto: textoNormalizado(descripcion) },
    await reglasOrdenadas(),
  );

  const mov = await db.movimiento.create({
    data: {
      origen: "manual",
      idExterno: randomUUID(),
      fecha,
      montoCentavos,
      tipo: "MANUAL",
      medio: "efectivo",
      descripcion,
      enriquecido: true,
      ...resultado,
    },
  });

  if (categoriaId) await confirmarCategoria(mov.id, categoriaId);
  return db.movimiento.findUniqueOrThrow({ where: { id: mov.id }, include: { categoria: true } });
}
