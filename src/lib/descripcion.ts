type ConDescripcion = {
  descripcion: string | null;
  nota: string | null;
  tipo: string;
  operacion: string | null;
  montoCentavos: number;
  rubro?: string | null;
  contraparte?: string | null;
};

// Mercado Pago informa el rubro en inglés ("Transport - Tolls paygo"). Del más específico al más general.
const RUBROS: [RegExp, string][] = [
  [/toll/i, "Peaje"],
  [/parking/i, "Estacionamiento"],
  [/fuel|gas station/i, "Combustible"],
  [/taxi|ride/i, "Viaje"],
  [/supermarket|grocer/i, "Supermercado"],
  [/fast food/i, "Comida rápida"],
  [/restaurant|food/i, "Restaurante"],
  [/pharmac|drug/i, "Farmacia"],
  [/health|medical/i, "Salud"],
  [/utilit/i, "Servicios"],
  [/telecom|internet|mobile/i, "Telefonía e internet"],
  [/entertainment|games|streaming/i, "Entretenimiento"],
  [/transport/i, "Transporte"],
];

/** Rubro en castellano, o null si no hay traducción conocida. */
export function rubroEnCastellano(rubro: string | null | undefined) {
  if (!rubro) return null;
  return RUBROS.find(([patron]) => patron.test(rubro))?.[1] ?? null;
}

/** Texto a mostrar para un movimiento cuando la fuente no trae una descripción útil. */
export function descripcionVisible(m: ConDescripcion) {
  if (m.nota) return m.nota;
  if (m.contraparte) {
    // El nombre del resumen de cuenta es más claro que lo que da la API ("UNL VIRTUAL", un UUID, "Varios").
    const esTransferencia = m.tipo === "PAYOUTS" || m.operacion === "money_transfer" || m.operacion === "account_fund";
    if (!esTransferencia) return m.contraparte;
    return m.montoCentavos < 0 ? `Transferencia a ${m.contraparte}` : `Transferencia de ${m.contraparte}`;
  }
  if (m.descripcion && m.descripcion !== "Varios") return m.descripcion;
  const rubro = rubroEnCastellano(m.rubro);
  if (rubro) return rubro;
  if (m.tipo === "PAYOUTS") return "Transferencia enviada";
  if (m.operacion === "money_transfer") return m.montoCentavos < 0 ? "Transferencia a cuenta Mercado Pago" : "Transferencia recibida";
  if (m.operacion === "rendimiento") return "Rendimiento diario";
  if (m.operacion === "account_fund") return "Ingreso desde tu banco";
  if (m.operacion === "investment") return "Movimiento a inversión";
  if (m.rubro) return m.rubro;
  return m.descripcion || "Pago";
}
