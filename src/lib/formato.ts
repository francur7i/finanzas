export const ZONA = "America/Argentina/Buenos_Aires";

const pesosFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pesosRedondoFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const pesos = (centavos: number) => pesosFmt.format(centavos / 100);
export const pesosRedondo = (centavos: number) => pesosRedondoFmt.format(centavos / 100);

export const fechaCorta = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit" }).format(d);

export const fechaHora = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

export const nombreMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  const txt = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, 15)),
  );
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

/** "2026-09" del momento actual en Argentina. */
export function mesActual() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit" }).format(
    new Date(),
  );
  return partes.slice(0, 7);
}

export function mesValido(mes: string | undefined) {
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : mesActual();
}

export function mesVecino(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Límites del mes en hora argentina (UTC-3, sin horario de verano). */
export function rangoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return { desde: new Date(Date.UTC(a, m - 1, 1, 3)), hasta: new Date(Date.UTC(a, m, 1, 3)) };
}
