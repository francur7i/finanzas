"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { confirmarCategoria } from "@/lib/categorizar";
import { detalleMovimiento, listarPendientes } from "@/lib/pendientes";
import { sincronizarMercadoPago } from "@/lib/sincronizar";
import { importarResumen } from "@/lib/resumenCuenta";

export async function sincronizarAhora() {
  const r = await sincronizarMercadoPago();
  revalidatePath("/", "layout");
  return r;
}

/** Respuesta con un botón a un pendiente. Devuelve la lista actualizada (puede haber resuelto parecidos). */
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

/** Después de que el asistente categoriza o anota algo, el chat vuelve a pedir los pendientes. */
export async function pendientesActuales() {
  revalidatePath("/", "layout");
  return listarPendientes();
}

export async function verDetalle(movimientoId: number) {
  return detalleMovimiento(movimientoId);
}

export type ResultadoImportacion =
  | { ok: true; filas: number; cruzadas: number; conNombre: number; recategorizados: number; sinCruzar: string[] }
  | { ok: false; error: string };

/** Sube el "Resumen de cuenta" (.csv) descargado de la web de Mercado Pago. */
export async function importarResumenCuenta(_previo: ResultadoImportacion | null, datos: FormData): Promise<ResultadoImportacion> {
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elegí el archivo .csv del resumen." };
  if (archivo.size > 1_000_000) return { ok: false, error: "El archivo es demasiado grande para ser un resumen mensual." };
  try {
    const r = await importarResumen(archivo.name, await archivo.text());
    revalidatePath("/", "layout");
    return {
      ok: true,
      filas: r.importacion.filas,
      cruzadas: r.importacion.cruzadas,
      conNombre: r.importacion.conNombre,
      recategorizados: r.recategorizados,
      sinCruzar: r.sinCruzar,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }
}
