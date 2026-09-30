import { sincronizarMercadoPago } from "@/lib/sincronizar";

const HORAS = Number(process.env.SYNC_CADA_HORAS ?? 6);

async function correr() {
  const r = await sincronizarMercadoPago();
  console.log(`[sync] Mercado Pago: ${r.estado} · ${r.nuevas} nuevas de ${r.filas}${r.mensaje ? ` · ${r.mensaje}` : ""}`);
}

/** Sincroniza al arrancar y después cada SYNC_CADA_HORAS mientras el servidor esté prendido. */
export function iniciarProgramador() {
  if (!process.env.MP_ACCESS_TOKEN) {
    console.warn("[sync] Sin MP_ACCESS_TOKEN: la sincronización automática queda apagada");
    return;
  }
  setTimeout(correr, 10_000);
  setInterval(correr, HORAS * 60 * 60 * 1000);
  console.log(`[sync] Programada cada ${HORAS} h`);
}
