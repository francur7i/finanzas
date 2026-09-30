// Cliente mínimo de la API de Mercado Pago para el reporte "Todas las transacciones"
// (settlement_report). Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/reports/account-money/api

const API = "https://api.mercadopago.com";

const COLUMNAS = [
  "TRANSACTION_DATE",
  "SOURCE_ID",
  "EXTERNAL_REFERENCE",
  "TRANSACTION_TYPE",
  "DESCRIPTION",
  "PAYMENT_METHOD",
  "PAYMENT_METHOD_TYPE",
  "TRANSACTION_AMOUNT",
  "SETTLEMENT_NET_AMOUNT",
  "TRANSACTION_CURRENCY",
  "FEE_AMOUNT",
  "BUSINESS_UNIT",
  "SUB_UNIT",
  "OPERATION_TAGS",
  "METADATA",
  "ORDER_ID",
  "STORE_NAME",
  "POS_NAME",
  "POI_WALLET_NAME",
  "POI_BANK_NAME",
];

export type FilaReporte = Record<string, string>;

export type DetallePago = {
  description: string | null;
  operation_type: string | null;
  payment_method_id: string | null;
  rubro: string | null; // point_of_interaction.business_info.branch, ej. "Transport - Tolls paygo"
  cobradorId: string | null; // quien recibió la plata
  pagadorId: string | null; // quien la mandó
};

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta la variable de entorno MP_ACCESS_TOKEN");
  return t;
}

async function llamar(ruta: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  return res;
}

async function llamarJson<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await llamar(ruta, init);
  if (!res.ok) {
    throw new Error(`Mercado Pago ${init.method ?? "GET"} ${ruta}: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Crea la configuración del reporte si la cuenta todavía no tiene una. */
export async function asegurarConfiguracion() {
  const actual = await llamar("/v1/account/settlement_report/config");
  if (actual.ok) return;
  if (actual.status !== 404) {
    throw new Error(`No se pudo leer la configuración del reporte: ${actual.status} ${await actual.text()}`);
  }
  await llamarJson("/v1/account/settlement_report/config", {
    method: "POST",
    body: JSON.stringify({
      file_name_prefix: "finanzas",
      include_withdraw: true,
      refund_detailed: true,
      coupon_detailed: false,
      shipping_detail: false,
      show_fee_prevision: false,
      show_chargeback_cancel: true,
      display_timezone: "GMT-03",
      header_language: "es",
      frequency: { hour: 0, type: "monthly", value: 1 },
      columns: COLUMNAS.map((key) => ({ key })),
    }),
  });
}

type Reporte = { id: number; status: string; file_name: string | null };

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pide el reporte para el rango, espera a que se genere y devuelve el nombre del archivo. */
export async function generarReporte(desde: Date, hasta: Date, maxEsperaMs = 10 * 60_000) {
  const pedido = await llamarJson<Reporte>("/v1/account/settlement_report", {
    method: "POST",
    body: JSON.stringify({ begin_date: desde.toISOString(), end_date: hasta.toISOString() }),
  });

  const limite = Date.now() + maxEsperaMs;
  while (Date.now() < limite) {
    await esperar(15_000);
    const lista = await llamarJson<Reporte[]>("/v1/account/settlement_report/list");
    const r = lista.find((x) => x.id === pedido.id);
    if (r?.status === "processed" && r.file_name) return { id: pedido.id, archivo: r.file_name };
    if (r && !["pending", "processing", "in_progress"].includes(r.status)) {
      throw new Error(`El reporte ${pedido.id} terminó con estado ${r.status}`);
    }
  }
  throw new Error(`El reporte ${pedido.id} no estuvo listo en ${maxEsperaMs / 60_000} minutos`);
}

/** Descarga el CSV (separado por ";") y lo devuelve como filas con nombre de columna. */
export async function descargarReporte(archivo: string): Promise<FilaReporte[]> {
  const res = await llamar(`/v1/account/settlement_report/${encodeURIComponent(archivo)}`);
  if (!res.ok) throw new Error(`No se pudo descargar ${archivo}: ${res.status}`);
  return parsearCsv(await res.text());
}

/** Detalle de un pago: acá aparece el comercio ("Apple.com/bill") que el reporte no trae. */
export async function detallePago(id: string): Promise<DetallePago | null> {
  const res = await llamar(`/v1/payments/${id}`);
  if (!res.ok) return null; // transferencias salientes y rendimientos no son "payments": 404
  const p = await res.json();
  const texto = (v: unknown) => (v == null ? null : String(v));
  return {
    description: p.description ?? null,
    operation_type: p.operation_type ?? null,
    payment_method_id: p.payment_method_id ?? null,
    rubro: p.point_of_interaction?.business_info?.branch ?? null,
    cobradorId: texto(p.collector?.id ?? p.collector_id),
    pagadorId: texto(p.payer?.id),
  };
}

let miIdCache: string | null = null;

/** Id de la cuenta dueña del token, para distinguir "la otra parte" de un pago. */
export async function miId() {
  miIdCache ??= String((await llamarJson<{ id: number }>("/users/me")).id);
  return miIdCache;
}

/** La otra cuenta del movimiento: a quién le pagué, o quién me pagó. Null si soy yo mismo. */
export function contraparte(d: DetallePago, montoCentavos: number, yo: string) {
  const otro = montoCentavos < 0 ? d.cobradorId : d.pagadorId;
  return otro && otro !== yo ? otro : null;
}

export function parsearCsv(texto: string): FilaReporte[] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const encabezado = partirLinea(lineas[0]);
  return lineas.slice(1).map((linea) => {
    const valores = partirLinea(linea);
    return Object.fromEntries(encabezado.map((col, i) => [col, valores[i] ?? ""]));
  });
}

// Separa por ";" respetando comillas (METADATA trae JSON entre comillas).
function partirLinea(linea: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === ";" && !entreComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos;
}
