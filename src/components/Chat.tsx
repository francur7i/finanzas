"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cargarManual, responderPendiente } from "@/app/acciones";
import type { Pendiente } from "@/lib/pendientes";
import { fechaCorta, pesos } from "@/lib/formato";

type Cat = { id: number; nombre: string; icono: string; tipo: string };
type Mensaje = { id: number; de: "bot" | "yo"; texto: string };

let siguienteId = 1;
const msj = (de: Mensaje["de"], texto: string): Mensaje => ({ id: siguienteId++, de, texto });

function pregunta(p: Pendiente) {
  const fecha = fechaCorta(new Date(p.fecha));
  const monto = pesos(Math.abs(p.montoCentavos));
  const sale = p.montoCentavos < 0;
  const desc = p.descripcion && !["Varios", "VAR"].includes(p.descripcion) ? p.descripcion : null;

  if (p.tipo === "MANUAL") return `Anotaste "${desc}" por ${monto}.`;
  if (p.tipo === "PAYOUTS") return `El ${fecha} transferiste ${monto}.`;
  if (p.operacion === "money_transfer") {
    return sale
      ? `El ${fecha} le mandaste ${monto} a una cuenta de Mercado Pago${desc ? ` ("${desc}")` : ""}.`
      : `El ${fecha} recibiste una transferencia de ${monto}${desc ? ` ("${desc}")` : ""}.`;
  }
  return sale
    ? `El ${fecha} pagaste ${monto}${desc ? ` en "${desc}"` : ""}.`
    : `El ${fecha} entraron ${monto}${desc ? ` ("${desc}")` : ""}.`;
}

export function Chat({ pendientesIniciales, categorias }: { pendientesIniciales: Pendiente[]; categorias: Cat[] }) {
  const [pendientes, setPendientes] = useState(pendientesIniciales);
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => [
    msj(
      "bot",
      pendientesIniciales.length > 0
        ? `Hola. Tenés ${pendientesIniciales.length} movimiento${pendientesIniciales.length === 1 ? "" : "s"} que no pude categorizar solo. Contestame y aprendo para la próxima.`
        : "Hola. No hay nada para revisar. Si pagaste algo en efectivo, anotalo acá abajo.",
    ),
  ]);
  const [nota, setNota] = useState("");
  const [entrada, setEntrada] = useState("");
  const [ocupado, iniciar] = useTransition();
  const fondo = useRef<HTMLDivElement>(null);

  const actual = pendientes[0];

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, actual?.id]);

  const opciones = actual
    ? categorias.filter((c) =>
        actual.montoCentavos < 0 ? c.tipo === "gasto" || c.tipo === "neutro" : c.tipo === "ingreso" || c.tipo === "neutro",
      )
    : [];

  function responder(cat: Cat) {
    if (!actual) return;
    const textoNota = nota.trim();
    setMensajes((m) => [...m, msj("bot", pregunta(actual)), msj("yo", `${cat.icono} ${cat.nombre}${textoNota ? ` · ${textoNota}` : ""}`)]);
    setNota("");
    iniciar(async () => {
      const r = await responderPendiente(actual.id, cat.id, textoNota);
      setPendientes(r.pendientes);
      const extra = r.resueltosDeRebote > 0 ? ` Con eso resolví ${r.resueltosDeRebote} parecido${r.resueltosDeRebote === 1 ? "" : "s"}.` : "";
      const quedan = r.pendientes.length > 0 ? ` Quedan ${r.pendientes.length}.` : " ¡Listo, no queda nada por revisar!";
      setMensajes((m) => [...m, msj("bot", `Anotado.${extra}${quedan}`)]);
    });
  }

  function saltear() {
    if (pendientes.length < 2) return;
    setPendientes(([primero, ...resto]) => [...resto, primero]);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = entrada.trim();
    if (!texto) return;
    setEntrada("");
    setMensajes((m) => [...m, msj("yo", texto)]);
    iniciar(async () => {
      const r = await cargarManual(texto);
      setMensajes((m) => [...m, msj("bot", r.mensaje)]);
      if (r.ok) {
        // Si no se pudo categorizar solo, se pregunta ya mismo.
        const nuevo = r.pendientes.find((p) => p.id === r.movimientoId);
        setPendientes(nuevo ? [nuevo, ...r.pendientes.filter((p) => p.id !== nuevo.id)] : r.pendientes);
      }
    });
  }

  const sugerida = actual?.sugerida ? categorias.find((c) => c.id === actual.sugerida!.id) : undefined;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col rounded-xl border border-borde bg-superficie">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {mensajes.map((m) => (
          <Burbuja key={m.id} de={m.de}>
            {m.texto}
          </Burbuja>
        ))}

        {actual && (
          <div className="space-y-2">
            <Burbuja de="bot">
              {pregunta(actual)} <strong>¿Qué fue?</strong>
              {sugerida && <span className="mt-1 block text-tinta-2">Se parece a uno que marcaste como {sugerida.nombre}.</span>}
            </Burbuja>
            <div className="flex flex-wrap gap-1.5 pl-1">
              {sugerida && (
                <Chip onClick={() => responder(sugerida)} disabled={ocupado} destacado>
                  Sí, {sugerida.icono} {sugerida.nombre}
                </Chip>
              )}
              {opciones
                .filter((c) => c.id !== sugerida?.id)
                .map((c) => (
                  <Chip key={c.id} onClick={() => responder(c)} disabled={ocupado}>
                    {c.icono} {c.nombre}
                  </Chip>
                ))}
            </div>
            <div className="flex items-center gap-2 pl-1">
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Nota opcional (ej. alquiler octubre)"
                className="w-full max-w-72 rounded-lg border border-borde bg-plano px-2 py-1 text-xs"
              />
              {pendientes.length > 1 && (
                <button onClick={saltear} disabled={ocupado} className="text-xs text-tinta-3 hover:text-tinta-2">
                  Después
                </button>
              )}
            </div>
          </div>
        )}
        {ocupado && <Burbuja de="bot">…</Burbuja>}
        <div ref={fondo} />
      </div>

      <form onSubmit={enviar} className="flex gap-2 border-t border-borde p-3">
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder='Anotá un gasto en efectivo: "café 2500"'
          className="flex-1 rounded-lg border border-borde bg-plano px-3 py-2 text-sm"
          aria-label="Cargar movimiento"
        />
        <button disabled={ocupado || !entrada.trim()} className="rounded-lg bg-acento px-4 text-sm font-medium text-white disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  );
}

function Burbuja({ de, children }: { de: "bot" | "yo"; children: React.ReactNode }) {
  return (
    <div className={`flex ${de === "yo" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          de === "yo" ? "rounded-br-sm bg-acento text-white" : "rounded-bl-sm bg-grilla text-tinta"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled,
  destacado,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destacado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
        destacado ? "border-acento bg-acento text-white" : "border-borde text-tinta-2 hover:border-acento hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}
