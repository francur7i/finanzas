"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { pendientesActuales, responderPendiente, verDetalle } from "@/app/acciones";
import type { Pendiente } from "@/lib/pendientes";
import { fechaCorta, pesos } from "@/lib/formato";

type Cat = { id: number; nombre: string; icono: string; tipo: string };

// Cómo se muestra cada herramienta mientras el modelo la usa.
const ACCIONES: Record<string, [string, string]> = {
  resumenDelMes: ["Mirando el resumen del mes…", "Revisé el resumen del mes"],
  buscarMovimientos: ["Buscando movimientos…", "Busqué movimientos"],
  detalleDeMovimiento: ["Mirando el detalle…", "Revisé el detalle"],
  listarCategorias: ["Mirando las categorías…", "Revisé las categorías"],
  categorizarMovimiento: ["Categorizando…", "Categoricé el movimiento"],
  anotarMovimiento: ["Anotando…", "Anoté el movimiento"],
};

function pregunta(p: Pendiente) {
  const fecha = fechaCorta(new Date(p.fecha));
  const monto = pesos(Math.abs(p.montoCentavos));
  const sale = p.montoCentavos < 0;
  const desc = p.descripcion && !["Varios", "VAR"].includes(p.descripcion) ? p.descripcion : null;

  if (p.tipo === "MANUAL") return `Anotaste "${desc}" por ${monto}.`;
  if (p.contraparte) {
    const esTransferencia = p.tipo === "PAYOUTS" || p.operacion === "money_transfer";
    if (esTransferencia) {
      return sale ? `El ${fecha} le transferiste ${monto} a ${p.contraparte}.` : `El ${fecha} ${p.contraparte} te transfirió ${monto}.`;
    }
    return sale ? `El ${fecha} pagaste ${monto} en ${p.contraparte}.` : `El ${fecha} ${p.contraparte} te pagó ${monto}.`;
  }
  if (p.tipo === "PAYOUTS") return `El ${fecha} transferiste ${monto} a otro banco.`;
  if (p.operacion === "money_transfer") {
    return sale
      ? `El ${fecha} le mandaste ${monto} a una cuenta de Mercado Pago${desc ? ` ("${desc}")` : ""}.`
      : `El ${fecha} recibiste una transferencia de ${monto}${desc ? ` ("${desc}")` : ""}.`;
  }
  return sale
    ? `El ${fecha} pagaste ${monto}${desc ? ` en "${desc}"` : ""}.`
    : `El ${fecha} entraron ${monto}${desc ? ` ("${desc}")` : ""}.`;
}

export function Chat({
  pendientesIniciales,
  categorias,
  modelo,
}: {
  pendientesIniciales: Pendiente[];
  categorias: Cat[];
  modelo: { nombre: string; falta: string | null };
}) {
  const [pendientes, setPendientes] = useState(pendientesIniciales);
  const [aviso, setAviso] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<{ id: number; lineas: string[] } | null>(null);
  const [nota, setNota] = useState("");
  const [entrada, setEntrada] = useState("");
  const [guardando, iniciar] = useTransition();
  const fondo = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // El asistente pudo categorizar o anotar: se refresca la lista de pendientes.
    onFinish: () => {
      pendientesActuales().then(setPendientes);
    },
  });

  const actual = pendientes[0];
  const pensando = status === "submitted" || status === "streaming";

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const opciones = actual
    ? categorias.filter((c) =>
        actual.montoCentavos < 0 ? c.tipo === "gasto" || c.tipo === "neutro" : c.tipo === "ingreso" || c.tipo === "neutro",
      )
    : [];
  const sugerida = actual?.sugerida ? categorias.find((c) => c.id === actual.sugerida!.id) : undefined;

  function responder(cat: Cat) {
    if (!actual) return;
    const textoNota = nota.trim();
    setNota("");
    setDetalle(null);
    iniciar(async () => {
      const r = await responderPendiente(actual.id, cat.id, textoNota);
      setPendientes(r.pendientes);
      setAviso(
        `${cat.nombre}: anotado.` +
          (r.resueltosDeRebote > 0 ? ` Resolví ${r.resueltosDeRebote} parecido${r.resueltosDeRebote === 1 ? "" : "s"}.` : ""),
      );
    });
  }

  function mostrarDetalle() {
    if (!actual) return;
    if (detalle?.id === actual.id) return setDetalle(null);
    iniciar(async () => setDetalle({ id: actual.id, lineas: await verDetalle(actual.id) }));
  }

  function saltear() {
    setDetalle(null);
    setPendientes(([primero, ...resto]) => [...resto, primero]);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const texto = entrada.trim();
    if (!texto || pensando) return;
    setEntrada("");
    if (error) clearError();
    sendMessage({ text: texto }, { body: { pendienteId: actual?.id ?? null } });
  }

  return (
    <div className="aparecer flex h-[calc(100dvh-8.5rem)] flex-col gap-4">
      {/* Pendiente actual: se responde con un toque */}
      <section className="tarjeta p-5" aria-label="Movimiento para revisar">
        <div className="mb-2 flex items-center justify-between text-xs text-tinta-3">
          <span>
            Para revisar: <span className="cifras font-semibold text-aviso">{pendientes.length}</span>
          </span>
          {aviso && <span className="text-positivo">{aviso}</span>}
        </div>

        {actual ? (
          <div className="space-y-2">
            <p className="text-sm">
              {pregunta(actual)} <strong>¿Qué fue?</strong>
              {sugerida && <span className="text-tinta-2"> Se parece a uno que marcaste como {sugerida.nombre}.</span>}
            </p>
            {detalle?.id === actual.id && (
              <ul className="list-disc space-y-0.5 rounded-xl bg-superficie-2 py-2.5 pr-3 pl-7 text-xs text-tinta-2">
                {detalle.lineas.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-1.5">
              {sugerida && (
                <Chip onClick={() => responder(sugerida)} disabled={guardando} destacado>
                  Sí, {sugerida.nombre}
                </Chip>
              )}
              {opciones
                .filter((c) => c.id !== sugerida?.id)
                .map((c) => (
                  <Chip key={c.id} onClick={() => responder(c)} disabled={guardando}>
                    {c.nombre}
                  </Chip>
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Nota opcional (ej. alquiler octubre)"
                className="w-full max-w-64 rounded-full bg-superficie-2 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-acento"
              />
              <button onClick={mostrarDetalle} disabled={guardando} className="text-xs text-acento hover:underline">
                {detalle?.id === actual.id ? "Ocultar detalle" : "Ver detalle"}
              </button>
              {pendientes.length > 1 && (
                <button onClick={saltear} disabled={guardando} className="text-xs text-tinta-3 hover:text-tinta-2">
                  Después
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-tinta-2">No hay nada para revisar.</p>
        )}
      </section>

      {/* Conversación con el asistente */}
      <section className="flex min-h-0 flex-1 flex-col tarjeta" aria-label="Asistente">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <Burbuja de="bot">
            Preguntame lo que quieras de tus movimientos: &quot;¿qué es este pago?&quot;, &quot;¿cuánto gasté en comida?&quot;,
            &quot;el de $50.000 fue el alquiler&quot; o &quot;café 2500&quot; para anotar efectivo.
          </Burbuja>

          {messages.map((m) => (
            <div key={m.id} className="space-y-1.5">
              {m.parts.map((part, i) => {
                if (part.type === "text" && part.text.trim()) {
                  return (
                    <Burbuja key={i} de={m.role === "user" ? "yo" : "bot"}>
                      {part.text}
                    </Burbuja>
                  );
                }
                if (isToolUIPart(part)) {
                  const [haciendo, hecho] = ACCIONES[getToolName(part)] ?? ["Consultando…", "Consulté"];
                  const listo = part.state === "output-available";
                  const fallo = part.state === "output-error";
                  return (
                    <p key={i} className="pl-1 text-xs text-tinta-3">
                      {fallo ? `No pude: ${part.errorText}` : listo ? `✓ ${hecho}` : haciendo}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          ))}

          {status === "submitted" && <Burbuja de="bot">…</Burbuja>}
          {error && (
            <p role="alert" className="rounded-xl bg-aviso-suave px-3 py-2 text-xs text-aviso">
              No pude contestar: {error.message}
            </p>
          )}
          <div ref={fondo} />
        </div>

        <form onSubmit={enviar} className="flex items-center gap-2 border-t border-borde p-3">
          <input
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder={modelo.falta ? `Falta configurar ${modelo.falta} (ver README)` : "Escribí tu pregunta…"}
            disabled={!!modelo.falta}
            className="flex-1 rounded-full bg-superficie-2 px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-acento disabled:opacity-60"
            aria-label="Mensaje para el asistente"
          />
          <button
            disabled={pensando || !entrada.trim() || !!modelo.falta}
            aria-label="Enviar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acento text-white transition-all duration-200 hover:opacity-90 disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" />
            </svg>
          </button>
        </form>
        <p className="px-3 pb-2 text-[10px] text-tinta-3">Modelo: {modelo.nombre}</p>
      </section>
    </div>
  );
}

function Burbuja({ de, children }: { de: "bot" | "yo"; children: React.ReactNode }) {
  return (
    <div className={`flex ${de === "yo" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-[20px] px-3.5 py-2 text-[15px] leading-snug ${
          de === "yo" ? "rounded-br-md bg-acento text-white" : "rounded-bl-md bg-superficie-2 text-tinta"
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
      className={`rounded-full px-3 py-1.5 text-[13px] transition-all duration-200 disabled:opacity-50 ${
        destacado ? "bg-acento text-white shadow-suave" : "bg-superficie-2 text-tinta hover:bg-acento-suave hover:text-acento"
      }`}
    >
      {children}
    </button>
  );
}
