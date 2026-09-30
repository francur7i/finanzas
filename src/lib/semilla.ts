import { db } from "@/lib/db";

// Categorías y reglas de arranque. Se cargan una sola vez, cuando la base está vacía.
const CATEGORIAS = [
  { nombre: "Supermercado", tipo: "gasto", color: "#16a34a", icono: "🛒" },
  { nombre: "Comida y delivery", tipo: "gasto", color: "#ea580c", icono: "🍔" },
  { nombre: "Transporte", tipo: "gasto", color: "#0284c7", icono: "🚗" },
  { nombre: "Suscripciones", tipo: "gasto", color: "#7c3aed", icono: "📺" },
  { nombre: "Servicios", tipo: "gasto", color: "#0891b2", icono: "💡" },
  { nombre: "Compras online", tipo: "gasto", color: "#db2777", icono: "📦" },
  { nombre: "Vivienda", tipo: "gasto", color: "#b45309", icono: "🏠" },
  { nombre: "Salud", tipo: "gasto", color: "#dc2626", icono: "💊" },
  { nombre: "Ocio", tipo: "gasto", color: "#9333ea", icono: "🎉" },
  { nombre: "Transferencias", tipo: "gasto", color: "#475569", icono: "↗" },
  { nombre: "Otros gastos", tipo: "gasto", color: "#64748b", icono: "•" },
  { nombre: "Sueldo", tipo: "ingreso", color: "#059669", icono: "💼" },
  { nombre: "Rendimientos", tipo: "ingreso", color: "#10b981", icono: "📈" },
  { nombre: "Devoluciones", tipo: "ingreso", color: "#14b8a6", icono: "↩" },
  { nombre: "Otros ingresos", tipo: "ingreso", color: "#22c55e", icono: "•" },
  { nombre: "Entre mis cuentas", tipo: "neutro", color: "#94a3b8", icono: "⇄" },
] as const;

type ReglaSemilla = {
  categoria: (typeof CATEGORIAS)[number]["nombre"];
  descripcionContiene?: string;
  tipo?: string;
  operacion?: string;
  signo?: "entra" | "sale";
};

const REGLAS: ReglaSemilla[] = [
  // Lo que Mercado Pago deja identificar sin ambigüedad.
  { categoria: "Rendimientos", operacion: "rendimiento", signo: "entra" },
  { categoria: "Entre mis cuentas", operacion: "account_fund", signo: "entra" },
  { categoria: "Entre mis cuentas", operacion: "investment" },
  // Transferencias salientes: una sola categoría, sin importar el banco de destino (decisión del usuario).
  // Lo que el usuario aclare por chat (ej. "fue el alquiler") gana porque las reglas aprendidas tienen más prioridad.
  { categoria: "Transferencias", tipo: "PAYOUTS", signo: "sale" },
  { categoria: "Transferencias", operacion: "money_transfer", signo: "sale" },
  { categoria: "Devoluciones", tipo: "REFUND" },
  { categoria: "Devoluciones", tipo: "DISPUTE", signo: "entra" },
  { categoria: "Compras online", descripcionContiene: "mercado libre", signo: "sale" },
  // Comercios conocidos por descripción.
  ...["apple.com", "primevideo", "netflix", "spotify", "disney", "hbo", "max.com", "youtube", "google", "paramount", "crunchyroll", "chatgpt", "openai", "claude"].map(
    (d) => ({ categoria: "Suscripciones" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  ...["coto", "carrefour", "jumbo", "chango mas", "la anonima", "supermercado"].map(
    (d) => ({ categoria: "Supermercado" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  ...["rappi", "pedidosya", "mcdonald", "burger king", "mostaza"].map(
    (d) => ({ categoria: "Comida y delivery" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  ...["uber", "cabify", "didi", "ypf", "shell", "axion", "sube", "telepase", "peaje"].map(
    (d) => ({ categoria: "Transporte" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  ...["edenor", "edesur", "metrogas", "naturgy", "aysa", "personal", "movistar", "claro", "telecentro", "fibertel"].map(
    (d) => ({ categoria: "Servicios" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  ...["farmacia", "farmacity", "osde", "swiss medical", "galeno"].map(
    (d) => ({ categoria: "Salud" as const, descripcionContiene: d, signo: "sale" as const }),
  ),
  // Rubros que informa Mercado Pago en el detalle del pago (en inglés, ej. "Transport - Tolls paygo").
  ...(
    [
      ["tolls", "Transporte"],
      ["transport", "Transporte"],
      ["parking", "Transporte"],
      ["fuel", "Transporte"],
      ["supermarket", "Supermercado"],
      ["grocer", "Supermercado"],
      ["restaurant", "Comida y delivery"],
      ["fast food", "Comida y delivery"],
      ["pharmac", "Salud"],
      ["utilities", "Servicios"],
      ["telecom", "Servicios"],
      ["entertainment", "Ocio"],
    ] as const
  ).map(([d, categoria]) => ({ categoria, descripcionContiene: d, signo: "sale" as const })),
];

/**
 * Agrega las categorías y reglas de fábrica que falten. Es idempotente: se puede correr en cada
 * sincronización, así una regla nueva agregada acá llega sola a una base que ya existe.
 */
// Categorías que cambiaron de nombre: se renombran en la base en vez de crear una nueva.
const RENOMBRADAS: Record<string, string> = { "Transferencias a terceros": "Transferencias" };

export async function asegurarSemilla() {
  for (const [viejo, nuevo] of Object.entries(RENOMBRADAS)) {
    const yaExiste = await db.categoria.findUnique({ where: { nombre: nuevo } });
    if (!yaExiste) await db.categoria.updateMany({ where: { nombre: viejo }, data: { nombre: nuevo } });
  }

  const existentes = new Set((await db.categoria.findMany({ select: { nombre: true } })).map((c) => c.nombre));
  const faltantes = CATEGORIAS.filter((c) => !existentes.has(c.nombre));
  if (faltantes.length) await db.categoria.createMany({ data: faltantes.map((c) => ({ ...c })) });

  const porNombre = new Map((await db.categoria.findMany()).map((c) => [c.nombre, c.id]));
  const clave = (r: { categoriaId: number; descripcionContiene?: string | null; tipo?: string | null; operacion?: string | null; signo?: string | null }) =>
    [r.categoriaId, r.descripcionContiene ?? "", r.tipo ?? "", r.operacion ?? "", r.signo ?? ""].join("|");

  const actuales = new Set((await db.regla.findMany({ where: { origen: "sistema" } })).map(clave));
  const nuevas = REGLAS.map(({ categoria, ...condiciones }) => ({
    categoriaId: porNombre.get(categoria)!,
    origen: "sistema",
    ...condiciones,
  })).filter((r) => !actuales.has(clave(r)));

  if (nuevas.length) await db.regla.createMany({ data: nuevas });
}
