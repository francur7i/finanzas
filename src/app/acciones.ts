"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categorizar, confirmarCategoria, reglasOrdenadas, textoNormalizado } from "@/lib/categorizar";
import { interpretarCarga, listarPendientes } from "@/lib/pendientes";
import { sincronizarMercadoPago } from "@/lib/sincronizar";
import { pesos } from "@/lib/formato";

export async function sincronizarAhora() {
  const r = await sincronizarMercadoPago();
  revalidatePath("/", "layout");
  return r;
}

/** Respuesta a un pendiente del chat. Devuelve la lista actualizada (puede haber resuelto parecidos). */
export async function responderPendiente(movimientoId: number, categoriaId: number, nota?: string) {
  const antes = await db.movimiento.count({ where: { estado: "pendiente" } });
  await confirmarCategoria(movimientoId, categoriaId, nota?.trim() || undefined);
  const pendientes = await listarPendientes();
  revalidatePath("/", "layout");
  // -1 por el que se acaba de confirmar; el resto se resolvió por la regla aprendida.
  return { pendientes, resueltosDeRebote: Math.max(0, antes - 1 - pendientes.length) };
}

export async function cambiarCategoria(movimientoId: number, categoriaId: number) {
  await confirmarCategoria(movimientoId, categoriaId);
  revalidatePath("/", "layout");
}

/** Carga rápida desde el chat: "café 2500". */
export async function cargarManual(texto: string) {
  const carga = interpretarCarga(texto);
  if (!carga) {
    return { ok: false as const, mensaje: 'No encontré el monto. Probá así: "café 2500" o "+ cobré 30000".' };
  }

  const fecha = new Date();
  const resultado = categorizar(
    { tipo: "MANUAL", operacion: null, montoCentavos: carga.montoCentavos, fecha, texto: textoNormalizado(carga.descripcion) },
    await reglasOrdenadas(),
  );

  const mov = await db.movimiento.create({
    data: {
      origen: "manual",
      idExterno: randomUUID(),
      fecha,
      montoCentavos: carga.montoCentavos,
      tipo: "MANUAL",
      medio: "efectivo",
      descripcion: carga.descripcion,
      ...resultado,
    },
    include: { categoria: true },
  });

  revalidatePath("/", "layout");
  const resumen = `${carga.descripcion} · ${pesos(Math.abs(carga.montoCentavos))}`;
  return {
    ok: true as const,
    auto: resultado.estado === "auto",
    mensaje:
      resultado.estado === "auto"
        ? `Anotado: ${resumen} en ${mov.categoria?.icono} ${mov.categoria?.nombre}.`
        : `Anotado: ${resumen}. ¿En qué categoría lo pongo?`,
    pendientes: await listarPendientes(),
    movimientoId: mov.id,
  };
}
