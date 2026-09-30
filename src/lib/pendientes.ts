import { db } from "@/lib/db";

// Forma serializable (sin Date) para pasarla a componentes de cliente.
export type Pendiente = {
  id: number;
  fecha: string;
  montoCentavos: number;
  tipo: string;
  operacion: string | null;
  descripcion: string | null;
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
    sugerida: m.categoria ? { id: m.categoria.id, nombre: m.categoria.nombre, icono: m.categoria.icono } : null,
  }));
}

/** "café 2500", "super 12.500,50", "+ cobré 3000". Devuelve null si no hay monto. */
export function interpretarCarga(texto: string) {
  const limpio = texto.trim();
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
  const entra = /^\s*\+/.test(limpio) || /\b(cobr|ingres|recib|me pagaron)/i.test(limpio);

  return { descripcion: descripcion || "Sin descripción", montoCentavos: entra ? centavos : -centavos };
}
