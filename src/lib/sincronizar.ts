import { db } from "@/lib/db";
import { asegurarSemilla } from "@/lib/semilla";
import { categorizar, recategorizarPendientes, reglasOrdenadas, textoNormalizado } from "@/lib/categorizar";
import {
  asegurarConfiguracion,
  descargarReporte,
  detallePago,
  generarReporte,
  type FilaReporte,
} from "@/lib/mercadopago";

const FUENTE = "mercadopago";
const DIAS_PRIMERA_VEZ = Number(process.env.SYNC_DIAS_INICIALES ?? 90);
const SOLAPAMIENTO_DIAS = 3; // se vuelve a pedir un poco hacia atrás: MP a veces informa tarde
const EN_CURSO_VENCE_MIN = 20;

const DIA = 24 * 60 * 60 * 1000;

export type ResultadoSync = { estado: "ok" | "omitida" | "error"; filas: number; nuevas: number; mensaje?: string };

export async function sincronizarMercadoPago(): Promise<ResultadoSync> {
  await asegurarSemilla();

  // Evita dos sincronizaciones a la vez (botón + programador).
  const enCurso = await db.sincronizacion.findFirst({
    where: { fuente: FUENTE, estado: "en_curso", iniciadaEn: { gt: new Date(Date.now() - EN_CURSO_VENCE_MIN * 60_000) } },
  });
  if (enCurso) return { estado: "omitida", filas: 0, nuevas: 0, mensaje: "Ya hay una sincronización en curso" };

  const ultima = await db.sincronizacion.findFirst({
    where: { fuente: FUENTE, estado: "ok" },
    orderBy: { hasta: "desc" },
  });
  const hasta = new Date();
  const desde = ultima
    ? new Date(ultima.hasta.getTime() - SOLAPAMIENTO_DIAS * DIA)
    : new Date(hasta.getTime() - DIAS_PRIMERA_VEZ * DIA);

  const sync = await db.sincronizacion.create({ data: { fuente: FUENTE, desde, hasta, estado: "en_curso" } });

  try {
    await asegurarConfiguracion();
    const { id, archivo } = await generarReporte(desde, hasta);
    const filas = await descargarReporte(archivo);
    const nuevas = await guardarFilas(filas);
    await recategorizarPendientes();

    await db.sincronizacion.update({
      where: { id: sync.id },
      data: { estado: "ok", filas: filas.length, nuevas, reporteId: String(id), terminadaEn: new Date() },
    });
    return { estado: "ok", filas: filas.length, nuevas };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await db.sincronizacion.update({
      where: { id: sync.id },
      data: { estado: "error", error: mensaje, terminadaEn: new Date() },
    });
    return { estado: "error", filas: 0, nuevas: 0, mensaje };
  }
}

async function guardarFilas(filas: FilaReporte[]) {
  const reglas = await reglasOrdenadas();
  let nuevas = 0;

  for (const f of filas) {
    const monto = Number(f.TRANSACTION_AMOUNT);
    if (!f.SOURCE_ID || Number.isNaN(monto)) continue;

    const montoCentavos = Math.round(monto * 100);
    const idExterno = `${f.SOURCE_ID}:${f.TRANSACTION_TYPE}:${montoCentavos}`;

    // Lo que ya está guardado no se toca: puede tener una categoría que eligió el usuario.
    const existe = await db.movimiento.findUnique({
      where: { origen_idExterno: { origen: FUENTE, idExterno } },
      select: { id: true },
    });
    if (existe) continue;

    // El reporte no trae el comercio; el detalle del pago sí (solo existe para pagos, no para transferencias).
    const detalle = ["SETTLEMENT", "REFUND"].includes(f.TRANSACTION_TYPE) ? await detallePago(f.SOURCE_ID) : null;

    // Ingresos sin medio de pago ni detalle: son los rendimientos diarios de la plata en cuenta.
    const esRendimiento = f.TRANSACTION_TYPE === "SETTLEMENT" && monto > 0 && !f.PAYMENT_METHOD_TYPE && !detalle;
    const operacion = esRendimiento ? "rendimiento" : (detalle?.operation_type ?? null);
    const descripcion = (detalle?.description || f.DESCRIPTION || "").trim() || null;
    const fecha = new Date(f.TRANSACTION_DATE);

    const resultado = categorizar(
      {
        tipo: f.TRANSACTION_TYPE,
        operacion,
        montoCentavos,
        fecha,
        texto: textoNormalizado(descripcion, f.BUSINESS_UNIT, f.STORE_NAME, f.POS_NAME),
      },
      reglas,
    );

    await db.movimiento.create({
      data: {
        origen: FUENTE,
        idExterno,
        fecha,
        montoCentavos,
        moneda: f.TRANSACTION_CURRENCY || "ARS",
        tipo: f.TRANSACTION_TYPE,
        operacion,
        medio: f.PAYMENT_METHOD_TYPE || detalle?.payment_method_id || null,
        descripcion,
        estado: resultado.estado,
        categoriaId: resultado.categoriaId,
        reglaId: resultado.reglaId,
        crudo: JSON.stringify(f),
      },
    });
    nuevas++;
  }
  return nuevas;
}
