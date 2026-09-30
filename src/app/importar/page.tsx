import { connection } from "next/server";
import { SubirResumen } from "@/components/SubirResumen";
import { db } from "@/lib/db";
import { fechaCorta, fechaHora } from "@/lib/formato";

const PASOS = [
  <>
    Entrá a{" "}
    <a
      href="https://www.mercadopago.com.ar/balance/reports/account_status"
      target="_blank"
      rel="noreferrer"
      className="text-acento hover:underline"
    >
      Mercado Pago → Reportes → Resumen de cuenta
    </a>{" "}
    (desde la computadora).
  </>,
  <>
    Tocá <strong>Generar</strong> al lado del mes (o <strong>Generar nuevo resumen</strong> y elegí el período).
  </>,
  <>
    En <strong>Formato</strong> elegí <strong>.csv</strong> y confirmá con <strong>Generar</strong>.
  </>,
  <>
    Esperá unos segundos a que deje de decir &quot;En preparación&quot;, abrí el resumen y tocá <strong>Abrir</strong> en la fila
    .csv: se descarga un archivo <code className="text-xs">account_statement-….csv</code>.
  </>,
  <>Subilo acá abajo.</>,
];

export default async function Importar() {
  await connection();
  const anteriores = await db.importacion.findMany({ orderBy: { creadaEn: "desc" }, take: 12 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Importar resumen de cuenta</h1>
        <p className="mt-1 max-w-2xl text-sm text-tinta-2">
          La API de Mercado Pago no dice <em>a quién</em> le transferiste. El resumen de cuenta mensual sí: al importarlo, cada
          transferencia pasa a mostrar el nombre (&quot;Transferencia a …&quot;) y la app aprende por nombre. Se hace una vez por
          mes y no reemplaza la sincronización automática: la completa.
        </p>
      </div>

      <section className="rounded-xl border border-borde bg-superficie p-4">
        <h2 className="mb-3 text-sm font-medium text-tinta-2">Cómo descargarlo</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          {PASOS.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-borde bg-superficie p-4">
        <h2 className="mb-3 text-sm font-medium text-tinta-2">Subir el archivo</h2>
        <SubirResumen />
      </section>

      {anteriores.length > 0 && (
        <section className="rounded-xl border border-borde bg-superficie p-4">
          <h2 className="mb-2 text-sm font-medium text-tinta-2">Importados</h2>
          <ul className="divide-y divide-borde text-sm">
            {anteriores.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {fechaCorta(i.desde)} al {fechaCorta(i.hasta)}
                </span>
                <span className="cifras text-tinta-3">
                  {i.conNombre} con nombre · {i.cruzadas}/{i.filas} cruzadas · {fechaHora(i.creadaEn)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
