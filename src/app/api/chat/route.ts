import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { herramientas } from "@/lib/ia/herramientas";
import { configuracionModelo, modeloDelChat } from "@/lib/ia/modelo";
import { mesActual, ZONA } from "@/lib/formato";

export const maxDuration = 60;

function instrucciones(pendienteId: number | null) {
  const hoy = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, dateStyle: "full" }).format(new Date());
  return `Sos el asistente de una app personal de finanzas. Los datos vienen de la cuenta de Mercado Pago del usuario (Argentina, pesos).
Hoy es ${hoy}; el mes actual es ${mesActual()}.

Reglas:
- Respondé en español rioplatense, corto y concreto. Montos con formato argentino ($ 12.500,50).
- Nunca inventes datos: para cualquier pregunta sobre movimientos, montos o categorías usá las herramientas.
- Si una herramienta devuelve "ok": false o un "error", NO digas que se hizo. Decí que falló y mostrá el error tal cual, en una línea. No reintentes la misma herramienta más de una vez.
- Si preguntan por algo que no es una categoría (peajes, Uber, Netflix, un comercio), usá buscarMovimientos con "texto" y respondé con su "totalEnPesos". No sumes montos a mano.
- Si una búsqueda no encuentra nada, probá otra forma antes de decir que no hay (otra palabra, sin filtro de categoría, o por monto).
- Si el usuario dice qué fue un movimiento ("fue el alquiler", "eso es comida"), usá categorizarMovimiento con una categoría existente. Si no está claro cuál, preguntá.
- Si dice que un nombre es otro ("EBANX es Uber"), usá ponerApodo. Si además dice la categoría, categorizá también.
- Si pide anotar un gasto en efectivo ("café 2500"), usá anotarMovimiento.
- "Entre mis cuentas" es plata del usuario que cambia de lugar (su sueldo entra a otro banco y lo pasa a Mercado Pago): no es ingreso ni gasto.
- Las transferencias a otros bancos (tipo PAYOUTS) no traen destinatario: eso solo lo sabe el usuario.
${pendienteId ? `- El usuario está mirando el movimiento pendiente con id ${pendienteId}. Si habla de "este", "ese pago" o similar, se refiere a ese.` : ""}`;
}

export async function POST(req: Request) {
  const { messages, pendienteId }: { messages: UIMessage[]; pendienteId?: number | null } = await req.json();

  const { falta, proveedor } = configuracionModelo();
  if (falta) {
    return Response.json({ error: `Falta configurar ${falta} para usar ${proveedor}. Ver README.` }, { status: 503 });
  }

  const result = streamText({
    model: modeloDelChat(),
    system: instrucciones(pendienteId ?? null),
    messages: await convertToModelMessages(messages),
    tools: herramientas,
    stopWhen: isStepCount(6),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (e) => (e instanceof Error ? e.message : "Error del modelo"),
    }),
  });
}
