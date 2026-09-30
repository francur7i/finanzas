"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PuntoMensual } from "@/lib/consultas";
import { pesos, pesosRedondo } from "@/lib/formato";

type Metrica = "ingresos" | "gastos" | "balance";

const TITULOS: Record<Metrica, string> = { ingresos: "Ingresos", gastos: "Gastos", balance: "Balance" };

const mesCorto = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, 15))).replace(".", "");
};
const mesLargo = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, 15)));
};

/**
 * Fila de totales del mes. Ingresos, Gastos y Balance funcionan como pestañas: la elegida muestra abajo
 * sus últimos meses en columnas (una sola serie, un solo tono; el mes que se está viendo resaltado).
 * Balance es divergente: arriba del cero en azul, abajo en rojo.
 */
export function TotalesMes({
  serie: serieCompleta,
  mes,
  pendientes,
  pendientesTotales,
}: {
  serie: PuntoMensual[];
  mes: string;
  pendientes: number;
  pendientesTotales: number;
}) {
  // Los meses del principio sin ningún dato (antes de la primera sincronización) no aportan: se sacan.
  const primero = serieCompleta.findIndex((p) => p.ingresos || p.gastos || p.desdeMisCuentas);
  const serie = serieCompleta.slice(Math.min(primero === -1 ? 0 : primero, Math.max(serieCompleta.length - 3, 0)));
  const [metrica, setMetrica] = useState<Metrica>("gastos");
  const [encima, setEncima] = useState<string | null>(null);
  const router = useRouter();
  const actual = serie.find((p) => p.mes === mes) ?? serie[serie.length - 1];

  const tiles: { m: Metrica; valor: string; tono: string; detalle?: string }[] = [
    {
      m: "ingresos",
      valor: pesos(actual.ingresos),
      tono: "text-positivo",
      detalle: actual.desdeMisCuentas > 0 ? `+ ${pesos(actual.desdeMisCuentas)} desde tu banco` : undefined,
    },
    { m: "gastos", valor: pesos(actual.gastos), tono: "text-tinta" },
    {
      m: "balance",
      valor: pesos(actual.balance),
      tono: actual.balance >= 0 ? "text-positivo" : "text-negativo",
      detalle: "entró menos salió",
    },
  ];

  return (
    <section className="flex flex-col gap-3" aria-label="Totales del mes">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="tablist" aria-label="Elegí qué graficar">
        {tiles.map((t) => {
          const elegida = metrica === t.m;
          return (
            <button
              key={t.m}
              role="tab"
              aria-selected={elegida}
              onClick={() => setMetrica(t.m)}
              className={`tarjeta flex min-w-0 flex-col gap-1 p-4 text-left transition-all duration-200 sm:p-5 ${
                elegida ? "outline-2 outline-acento outline-solid" : "hover:-translate-y-0.5 hover:shadow-alta"
              }`}
            >
              <span className="text-[13px] font-medium text-tinta-3">{TITULOS[t.m]}</span>
              <span className={`cifras truncate text-[22px] font-semibold tracking-tight sm:text-[26px] ${t.tono}`}>{t.valor}</span>
              {t.detalle && <span className="truncate text-xs text-tinta-3">{t.detalle}</span>}
            </button>
          );
        })}
        <Link
          href="/chat"
          className="tarjeta flex min-w-0 flex-col gap-1 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-alta sm:p-5"
        >
          <span className="text-[13px] font-medium text-tinta-3">Para revisar este mes</span>
          <span className="cifras text-[22px] font-semibold tracking-tight sm:text-[26px]">{pendientes}</span>
          <span className="truncate text-xs text-tinta-3">
            {pendientes > 0 ? "sin confirmar" : pendientesTotales > 0 ? `${pendientesTotales} en otros meses` : "todo al día"}
          </span>
        </Link>
      </div>

      <div className="tarjeta p-5 sm:p-6" role="tabpanel" aria-label={`${TITULOS[metrica]} de los últimos ${serie.length} meses`}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-tight">
            {TITULOS[metrica]} <span className="font-normal text-tinta-3">· últimos {serie.length} meses</span>
          </h2>
          <span className="hidden text-xs text-tinta-3 sm:inline">Tocá un mes para verlo</span>
        </div>
        <Columnas
          serie={serie}
          metrica={metrica}
          mes={mes}
          encima={encima}
          setEncima={setEncima}
          ir={(m) => router.push(`/?mes=${m}`)}
        />
      </div>
    </section>
  );
}

function Columnas({
  serie,
  metrica,
  mes,
  encima,
  setEncima,
  ir,
}: {
  serie: PuntoMensual[];
  metrica: Metrica;
  mes: string;
  encima: string | null;
  setEncima: (m: string | null) => void;
  ir: (m: string) => void;
}) {
  const valores = serie.map((p) => p[metrica]);
  const divergente = metrica === "balance";
  const maximo = Math.max(...valores.map(Math.abs), 1);
  // Divergente: mitad de arriba para lo positivo, mitad de abajo para lo negativo.
  const alto = (v: number) => `${(Math.abs(v) / maximo) * (divergente ? 50 : 100)}%`;
  const color = (v: number) => (divergente && v < 0 ? "var(--serie-8)" : "var(--serie-1)");

  return (
    <div className="grid h-52 gap-1" style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }} onMouseLeave={() => setEncima(null)}>
      {serie.map((p) => {
        const v = p[metrica];
        const elegido = p.mes === mes;
        const resaltado = encima ? encima === p.mes : elegido;
        return (
          <button
            key={p.mes}
            onClick={() => ir(p.mes)}
            onMouseEnter={() => setEncima(p.mes)}
            onFocus={() => setEncima(p.mes)}
            aria-label={`${mesLargo(p.mes)}: ${pesos(v)}`}
            className="group relative flex h-full flex-col items-center rounded-xl outline-none transition-colors hover:bg-superficie-2 focus-visible:ring-2 focus-visible:ring-acento"
          >
            {/* Zona del dibujo: la barra crece desde la línea de base (abajo, o el centro si es divergente) */}
            <span className="relative w-full flex-1">
              <span
                className="absolute inset-x-0 border-t border-grilla"
                style={{ top: divergente ? "50%" : "100%" }}
                aria-hidden
              />
              <span
                className={`absolute left-1/2 w-6 max-w-[60%] -translate-x-1/2 transition-all duration-500 ease-out ${
                  divergente && v < 0 ? "rounded-b-[4px]" : "rounded-t-[4px]"
                }`}
                style={{
                  height: alto(v),
                  background: color(v),
                  opacity: resaltado ? 1 : 0.35,
                  ...(divergente
                    ? v >= 0
                      ? { bottom: "50%" }
                      : { top: "50%" }
                    : { bottom: 0 }),
                }}
                aria-hidden
              />
              {/* Valor solo en la columna resaltada: nunca un número en cada barra */}
              {resaltado && (
                <span
                  className="cifras absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-tinta px-1.5 py-0.5 text-[11px] font-medium text-plano shadow-suave"
                  style={
                    divergente
                      ? v >= 0
                        ? { bottom: `calc(50% + ${alto(v)} + 4px)` }
                        : { bottom: "calc(50% + 4px)" } // negativo: arriba del cero, para no pisar el nombre del mes
                      : { bottom: `calc(${alto(v)} + 4px)` }
                  }
                >
                  {pesosRedondo(v)}
                </span>
              )}
            </span>
            <span className={`pt-2 pb-1 text-xs capitalize ${elegido ? "font-semibold text-tinta" : "text-tinta-3"}`}>
              {mesCorto(p.mes)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
