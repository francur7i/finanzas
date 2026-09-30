import { db } from "@/lib/db";
import { recategorizar } from "@/lib/categorizar";
import { aplicarAlias } from "@/lib/alias";

// Importa el "Resumen de cuenta" en CSV que se descarga de la web de Mercado Pago
// (Reportes → Resumen de cuenta). Es la única fuente con el NOMBRE de la otra parte de cada
// transferencia: la API no lo informa. Formato: un bloque de saldos, una línea vacía y después
//   RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
//   09-08-2026;Transferencia enviada Pedro Perez;172059347587;-607.000,00;308.860,75
// REFERENCE_ID es el mismo número de operación que SOURCE_ID en la API: el cruce es exacto.

type LineaResumen = { fecha: Date; descripcion: string; referencia: string; nombre: string | null };

// Del texto de la operación se saca el nombre de la otra parte, según cómo empieza.
const PREFIJOS = [/^transferencia enviada/i, /^transferencia recibida/i, /^pago con qr/i, /^pago/i, /^inversi[oó]n/i];

export function nombreDeLinea(descripcion: string) {
  const d = descripcion.replace(/\s+/g, " ").trim();
  if (/^rendimientos/i.test(d)) return null;
  const prefijo = PREFIJOS.find((p) => p.test(d));
  if (!prefijo) return null;
  const nombre = d.replace(prefijo, "").trim();
  return nombre || null;
}

export function parsearResumen(texto: string): LineaResumen[] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const inicio = lineas.findIndex((l) => l.startsWith("RELEASE_DATE;"));
  if (inicio === -1) {
    throw new Error("No parece un resumen de cuenta de Mercado Pago (falta la columna RELEASE_DATE). ¿Elegiste el formato .csv?");
  }
  return lineas
    .slice(inicio + 1)
    .filter((l) => l.trim())
    .map((l) => {
      const [fecha, descripcion = "", referencia = ""] = l.split(";");
      const [dia, mes, anio] = fecha.split("-").map(Number);
      return {
        fecha: new Date(Date.UTC(anio, mes - 1, dia, 3)),
        descripcion: descripcion.trim(),
        referencia: referencia.trim(),
        nombre: nombreDeLinea(descripcion),
      };
    })
    .filter((l) => l.referencia && !Number.isNaN(l.fecha.getTime()));
}

export async function importarResumen(nombreArchivo: string, texto: string) {
  const lineas = parsearResumen(texto);
  if (lineas.length === 0) throw new Error("El resumen no tiene movimientos.");

  let cruzadas = 0;
  let conNombre = 0;
  const sinCruzar: string[] = [];

  for (const l of lineas) {
    const movs = await db.movimiento.findMany({
      where: { origen: "mercadopago", idExterno: { startsWith: `${l.referencia}:` } },
      select: { id: true },
    });
    if (movs.length === 0) {
      sinCruzar.push(`${l.descripcion} (${l.referencia})`);
      continue;
    }
    cruzadas++;
    if (l.nombre) {
      await db.movimiento.updateMany({ where: { id: { in: movs.map((m) => m.id) } }, data: { contraparte: l.nombre } });
      conNombre += movs.length;
    }
  }

  const fechas = lineas.map((l) => l.fecha.getTime());
  const importacion = await db.importacion.create({
    data: {
      archivo: nombreArchivo,
      desde: new Date(Math.min(...fechas)),
      hasta: new Date(Math.max(...fechas)),
      filas: lineas.length,
      cruzadas,
      conNombre,
    },
  });

  // Con los nombres, las reglas aprendidas por nombre pueden resolver movimientos que ya estaban.
  await aplicarAlias();
  const recategorizados = await recategorizar();
  return { importacion, sinCruzar, recategorizados };
}
