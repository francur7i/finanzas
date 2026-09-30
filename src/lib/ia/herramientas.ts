import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { confirmarCategoria } from "@/lib/categorizar";
import { resumenMes } from "@/lib/consultas";
import { descripcionVisible } from "@/lib/descripcion";
import { mesActual, rangoMes, ZONA } from "@/lib/formato";
import { crearMovimientoManual } from "@/lib/manual";
import { detalleMovimiento } from "@/lib/pendientes";
import type { Movimiento, Categoria } from "@/generated/prisma/client";

// Lo que ve el modelo de cada movimiento: pesos (no centavos) y fecha legible.
function compacto(m: Movimiento & { categoria: Categoria | null }) {
  return {
    id: m.id,
    fecha: new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA, dateStyle: "short", timeStyle: "short" }).format(m.fecha),
    monto: m.montoCentavos / 100,
    descripcion: descripcionVisible(m),
    rubro: m.rubro,
    categoria: m.categoria?.nombre ?? null,
    estado: m.estado,
    tipo: m.tipo,
  };
}

const mesSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .describe("Mes en formato AAAA-MM. Si no se indica, el mes actual.");

async function buscarCategoria(nombre: string) {
  const todas = await db.categoria.findMany();
  const n = nombre.toLowerCase().trim();
  return todas.find((c) => c.nombre.toLowerCase() === n) ?? todas.find((c) => c.nombre.toLowerCase().includes(n)) ?? null;
}

export const herramientas = {
  resumenDelMes: tool({
    description: "Totales de un mes: ingresos, gastos, balance, cantidad de pendientes y gastos por categoría (en pesos).",
    inputSchema: z.object({ mes: mesSchema }),
    execute: async ({ mes }) => {
      const r = await resumenMes(mes ?? mesActual());
      const pesos = (c: number) => c / 100;
      return {
        mes: mes ?? mesActual(),
        ingresos: pesos(r.ingresos),
        pasadoDesdeSuBanco: pesos(r.desdeMisCuentas),
        gastos: pesos(r.gastos),
        balance: pesos(r.balance),
        pendientes: r.pendientes,
        gastosPorCategoria: r.categorias.map((c) => ({ categoria: c.nombre, monto: pesos(c.centavos), movimientos: c.cantidad })),
      };
    },
  }),

  buscarMovimientos: tool({
    description:
      "Busca movimientos. Todos los filtros son opcionales y se combinan. Montos en pesos: negativos = salió plata, positivos = entró.",
    inputSchema: z.object({
      mes: mesSchema,
      texto: z.string().optional().describe("Parte de la descripción, rubro o nota (ej. 'uber', 'peaje')."),
      categoria: z.string().optional().describe("Nombre de categoría, o 'sin' para los sin categorizar."),
      estado: z.enum(["pendiente", "auto", "confirmado"]).optional(),
      montoAproximado: z.number().optional().describe("Busca montos parecidos (±2 %) a este valor absoluto en pesos."),
      limite: z.number().int().min(1).max(50).optional().describe("Máximo de resultados (default 20)."),
    }),
    execute: async ({ mes, texto, categoria, estado, montoAproximado, limite }) => {
      const { desde, hasta } = rangoMes(mes ?? mesActual());
      const cat = categoria && categoria !== "sin" ? await buscarCategoria(categoria) : null;
      const abs = montoAproximado ? Math.round(Math.abs(montoAproximado) * 100) : null;
      const filas = await db.movimiento.findMany({
        where: {
          fecha: { gte: desde, lt: hasta },
          ...(estado ? { estado } : {}),
          ...(categoria === "sin" ? { categoriaId: null } : cat ? { categoriaId: cat.id } : {}),
          AND: [
            texto
              ? { OR: [{ descripcion: { contains: texto } }, { rubro: { contains: texto } }, { nota: { contains: texto } }] }
              : {},
            abs
              ? {
                  OR: [
                    { montoCentavos: { gte: Math.round(abs * 0.98), lte: Math.round(abs * 1.02) } },
                    { montoCentavos: { gte: -Math.round(abs * 1.02), lte: -Math.round(abs * 0.98) } },
                  ],
                }
              : {},
          ],
        },
        include: { categoria: true },
        orderBy: { fecha: "desc" },
        take: limite ?? 20,
      });
      return { cantidad: filas.length, movimientos: filas.map(compacto) };
    },
  }),

  detalleDeMovimiento: tool({
    description:
      "Todo lo que se sabe de un movimiento: fecha y hora, descripción, rubro del comercio, medio de pago, si la cuenta de destino se repite, si el monto se repite (suscripciones) y el número de operación.",
    inputSchema: z.object({ id: z.number().int() }),
    execute: async ({ id }) => ({ detalle: await detalleMovimiento(id) }),
  }),

  listarCategorias: tool({
    description: "Categorías disponibles. tipo: gasto, ingreso o neutro (movimientos entre cuentas propias).",
    inputSchema: z.object({}),
    execute: async () => ({
      categorias: (await db.categoria.findMany({ orderBy: { nombre: "asc" } })).map((c) => ({ nombre: c.nombre, tipo: c.tipo })),
    }),
  }),

  categorizarMovimiento: tool({
    description:
      "Asigna la categoría a un movimiento cuando el usuario lo dice. La app aprende una regla y puede resolver solos otros pendientes parecidos.",
    inputSchema: z.object({
      id: z.number().int(),
      categoria: z.string().describe("Nombre exacto de una categoría existente."),
      nota: z.string().optional().describe("Aclaración del usuario (ej. 'alquiler octubre')."),
    }),
    execute: async ({ id, categoria, nota }) => {
      const cat = await buscarCategoria(categoria);
      if (!cat) return { ok: false, error: `No existe la categoría "${categoria}". Usá listarCategorias.` };
      const antes = await db.movimiento.count({ where: { estado: "pendiente" } });
      await confirmarCategoria(id, cat.id, nota);
      const despues = await db.movimiento.count({ where: { estado: "pendiente" } });
      return { ok: true, categoria: cat.nombre, resueltosParecidos: Math.max(0, antes - 1 - despues), pendientesRestantes: despues };
    },
  }),

  anotarMovimiento: tool({
    description: "Anota un gasto o ingreso en efectivo que no pasó por Mercado Pago (ej. 'café 2500').",
    inputSchema: z.object({
      descripcion: z.string(),
      monto: z.number().positive().describe("Monto en pesos, siempre positivo."),
      tipo: z.enum(["gasto", "ingreso"]),
      categoria: z.string().optional().describe("Nombre de categoría si está claro; si no, se intenta sola."),
    }),
    execute: async ({ descripcion, monto, tipo, categoria }) => {
      const cat = categoria ? await buscarCategoria(categoria) : null;
      const centavos = Math.round(monto * 100) * (tipo === "gasto" ? -1 : 1);
      const m = await crearMovimientoManual(descripcion, centavos, cat?.id);
      return { ok: true, id: m.id, categoria: m.categoria?.nombre ?? null, quedoPendiente: m.estado === "pendiente" };
    },
  }),
};
