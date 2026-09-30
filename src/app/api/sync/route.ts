import { sincronizarMercadoPago } from "@/lib/sincronizar";

// La generación del reporte en Mercado Pago puede tardar varios minutos.
export const maxDuration = 900;

export async function POST() {
  const r = await sincronizarMercadoPago();
  return Response.json(r, { status: r.estado === "error" ? 502 : 200 });
}
