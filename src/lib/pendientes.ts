import { rubroEnCastellano } from "@/lib/descripcion";
import { db } from "@/lib/db";

// Forma serializable (sin Date) para pasarla a componentes de cliente.
export type Pendiente = {
  id: number;
  fecha: string;
  montoCentavos: number;
  tipo: string;
  operacion: string | null;
  descripcion: string | null;
  contraparte: string | null;
  sugerida: { id: number; nombre: string; icono: string } | null;
};

export async function listarPendientes(): Promise<Pendiente[]> {
  const filas = await db.movimiento.findMany({
    where: { estado: "pendiente" },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });
  return filas.map((m) => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    montoCentavos: m.montoCentavos,
    tipo: m.tipo,
    operacion: m.operacion,
    descripcion: m.descripcion,
    contraparte: m.contraparte,
    sugerida: m.categoria ? { id: m.categoria.id, nombre: m.categoria.nombre, icono: m.categoria.icono } : null,
  }));
}

/** "café 2500", "super 12.500,50", "+ cobré 3000". Devuelve null si no es una carga. */
export function interpretarCarga(texto: string) {
  // Una pregunta nunca es una carga ("El 30/9?").
  if (texto.includes("?")) return null;
  // Las fechas (30/9, 30/09/2026) no son montos.
  const limpio = texto.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ").trim();
  const numeros = [...limpio.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/g)];
  const ultimo = numeros.at(-1);
  if (!ultimo) return null;

  const enteros = Number(ultimo[1].replace(/\./g, ""));
  const decimales = ultimo[2] ? Number(ultimo[2].padEnd(2, "0")) : 0;
  const centavos = enteros * 100 + decimales;
  if (centavos <= 0) return null;

  const descripcion = (limpio.slice(0, ultimo.index) + limpio.slice(ultimo.index! + ultimo[0].length))
    .replace(/^\s*[+-]\s*/, "")
    .replace(/\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Tiene que decir en qué fue: "2500" solo no alcanza.
  if (!/\p{L}{2,}/u.test(descripcion)) return null;
  const entra = /^\s*\+/.test(limpio) || /\b(cobr|ingres|recib|me pagaron)/i.test(limpio);

  return { descripcion, montoCentavos: entra ? centavos : -centavos };
}

const MEDIOS: Record<string, string> = {
  available_money: "plata en tu cuenta",
  account_money: "plata en tu cuenta",
  bank_transfer: "transferencia bancaria",
  cvu: "transferencia a tu CVU",
  debit_card: "tarjeta de débito",
  credit_card: "tarjeta de crédito",
  prepaid_card: "tarjeta prepaga",
  efectivo: "efectivo",
};

/** Todo lo que se sabe de un movimiento, en frases para el chat. */
export async function detalleMovimiento(id: number): Promise<string[]> {
  const m = await db.movimiento.findUnique({ where: { id } });
  if (!m) return ["No encontré ese movimiento."];

  const lineas: string[] = [];
  const cuando = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(m.fecha);
  lineas.push(`Fue el ${cuando}.`);
  if (m.contraparte) {
    lineas.push(`Según el resumen de cuenta, ${m.montoCentavos < 0 ? "fue a" : "vino de"} ${m.contraparte}.`);
  }
  if (m.descripcion && !["Varios", "VAR"].includes(m.descripcion)) lineas.push(`Mercado Pago lo describe como "${m.descripcion}".`);
  if (m.rubro) {
    const rubro = rubroEnCastellano(m.rubro);
    lineas.push(`Rubro del comercio: ${rubro ? `${rubro} (${m.rubro})` : m.rubro}.`);
  }
  if (m.medio) lineas.push(`Se pagó con ${MEDIOS[m.medio] ?? m.medio}.`);

  if (m.destinatario) {
    const otros = await db.movimiento.count({ where: { destinatario: m.destinatario, id: { not: m.id } } });
    lineas.push(
      otros > 0
        ? `Fue a una cuenta a la que le mandaste plata ${otros} vez${otros === 1 ? "" : "es"} más. Si la categorizás, la próxima la reconozco sola.`
        : "Es la primera vez que le mandás plata a esa cuenta.",
    );
  } else if (m.tipo === "PAYOUTS" && !m.contraparte) {
    lineas.push("Fue a una cuenta de otro banco: la API no informa a quién. Importá el resumen de cuenta del mes para ver el nombre.");
  }

  // Mismo monto (±1 %) en los últimos 90 días: suele ser una suscripción o un débito automático.
  const abs = Math.abs(m.montoCentavos);
  const parecidos = await db.movimiento.findMany({
    where: {
      id: { not: m.id },
      montoCentavos: m.montoCentavos < 0 ? { gte: -Math.round(abs * 1.01), lte: -Math.round(abs * 0.99) } : { gte: Math.round(abs * 0.99), lte: Math.round(abs * 1.01) },
      fecha: { gte: new Date(m.fecha.getTime() - 90 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { fecha: "desc" },
    take: 10,
  });
  if (parecidos.length >= 2) {
    const fechas = parecidos
      .slice(0, 5)
      .map((p) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit" }).format(p.fecha))
      .join(", ");
    lineas.push(`Se repite: hay ${parecidos.length} más por el mismo monto (${fechas}${parecidos.length > 5 ? "…" : ""}). Puede ser una suscripción o un débito automático.`);
  }

  if (m.origen === "mercadopago") {
    lineas.push(`Número de operación: ${m.idExterno.split(":")[0]}. Lo podés buscar en Actividad, en la app de Mercado Pago.`);
  }
  return lineas;
}
