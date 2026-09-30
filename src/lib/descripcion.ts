type ConDescripcion = {
  descripcion: string | null;
  nota: string | null;
  tipo: string;
  operacion: string | null;
  montoCentavos: number;
  rubro?: string | null;
};

/** Texto a mostrar para un movimiento cuando la fuente no trae una descripción útil. */
export function descripcionVisible(m: ConDescripcion) {
  if (m.nota) return m.nota;
  if (m.descripcion && m.descripcion !== "Varios") return m.descripcion;
  if (m.rubro && /toll/i.test(m.rubro)) return "Peaje";
  if (m.tipo === "PAYOUTS") return "Transferencia enviada";
  if (m.operacion === "money_transfer") return m.montoCentavos < 0 ? "Transferencia a cuenta Mercado Pago" : "Transferencia recibida";
  if (m.operacion === "rendimiento") return "Rendimiento diario";
  if (m.operacion === "account_fund") return "Ingreso desde tu banco";
  if (m.operacion === "investment") return "Movimiento a inversión";
  if (m.rubro) return m.rubro;
  return m.descripcion || "Pago";
}
