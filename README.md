# Finanzas

Control de finanzas personales **sin carga manual**. Los movimientos de Mercado Pago entran
solos y se categorizan con reglas. Lo que no se puede resolver automáticamente (por ejemplo,
a quién fue una transferencia) se pregunta **una sola vez** y la app aprende la respuesta.

> Estado: **en construcción**. Ver [Estado del proyecto](#estado-del-proyecto).

## Cómo funciona

```
Mercado Pago ──(reporte "Todas las transacciones", cada 6 h)──▶ Sincronización
                                                                    │
                          detalle de cada pago (/v1/payments/{id}) ─┤  agrega el comercio
                                                                    ▼
                                                           Motor de reglas
                                                  ┌─────────────┴─────────────┐
                                           la reconoce                 no la reconoce
                                          (estado: auto)            (estado: pendiente)
                                                  │                           │
                                                  ▼                           ▼
                                             Panel web  ◀── confirmás ── Chat de pendientes
                                                                              │
                                                                   aprende una regla nueva
```

1. **Sincronización** (`src/lib/sincronizar.ts`): pide a Mercado Pago el reporte
   "Todas las transacciones" desde la última sincronización (con 3 días de solapamiento),
   espera a que se genere, lo descarga (CSV separado por `;`) y guarda los movimientos nuevos.
   Nunca pisa un movimiento que ya existe, para no perder categorías elegidas a mano.
2. **Detalle del comercio**: el reporte no dice dónde se pagó. Para cada pago se consulta
   `GET /v1/payments/{id}`, que sí trae la descripción (ej. `Apple.com/bill`, `Primevideo`).
3. **Categorización** (`src/lib/categorizar.ts`): reglas con condiciones (texto, tipo,
   operación, signo, rango de monto, rango de días del mes). Gana la regla más prioritaria:
   primero las del usuario, después las aprendidas y por último las de fábrica.
4. **Aprendizaje**: al confirmar la categoría de un pendiente:
   - si tiene un comercio identificable, se crea una regla por texto y la próxima vez se categoriza solo;
   - si no (transferencias), se crea una regla por **monto parecido (±15 %) y día del mes (±3)**
     que *sugiere* la categoría pero pide confirmar, porque dos transferencias parecidas pueden
     ser cosas distintas.

### Qué da y qué no da la API de Mercado Pago

| Movimiento | Tipo en el reporte | ¿Se sabe qué fue? |
|---|---|---|
| Pagos (QR, tarjeta, débitos, suscripciones) | `SETTLEMENT` negativo | Sí, con `/v1/payments/{id}` |
| Ingresos desde un banco propio | `SETTLEMENT` + `account_fund` | Sí |
| Rendimientos diarios | `SETTLEMENT` positivo sin medio de pago | Se deduce (sin detalle) |
| Devoluciones y reclamos | `REFUND`, `DISPUTE` | Sí |
| **Transferencias enviadas** | `PAYOUTS` | **No**: la API no informa el destinatario |

Se probaron `/v1/payouts/{id}` y `/mercadopago_account/movements/search` (dan **403** a apps
comunes), y Mercado Pago no manda mail por transferencias salientes. Por eso las transferencias
se resuelven con el flujo de pendientes + aprendizaje.

## Tecnologías

| Parte | Herramienta | Por qué |
|---|---|---|
| Web y servidor | [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript | Página y API en un solo proyecto, fácil de desplegar |
| Estilos | Tailwind CSS 4 | |
| Base de datos | SQLite (local) vía Prisma 7 + `@prisma/adapter-better-sqlite3` | Un archivo, cero instalación. Se pasa a Postgres cambiando el provider |
| Datos | API de Mercado Pago (reporte `settlement_report` + `payments`) | |
| Tareas automáticas | `src/instrumentation.ts` → `src/lib/programador.ts` | Sincroniza al arrancar y cada `SYNC_CADA_HORAS` |

Versiones fijadas: Prisma **7.10.0** (la etiqueta `latest` de npm apuntaba a una 8.0 RC y se evitó a propósito).

## Entorno

- Windows 11, Node.js 26, npm 11.
- Variables de entorno:

| Variable | Dónde | Para qué |
|---|---|---|
| `MP_ACCESS_TOKEN` | Variable de usuario de Windows (o `.env.local`) | Access Token de **producción** de la app "F1NANZAS" en el panel de developers de Mercado Pago |
| `DATABASE_URL` | `.env` | Ruta de la base. Por defecto `file:./prisma/dev.db` |
| `SYNC_CADA_HORAS` | opcional | Cada cuánto sincroniza (default 6) |
| `SYNC_DIAS_INICIALES` | opcional | Cuántos días hacia atrás trae la primera vez (default 90) |

`.env*` y `*.db` están en `.gitignore`: ni el token ni los datos se suben al repo.

### Credenciales de Mercado Pago

1. [Panel de developers](https://www.mercadopago.com.ar/developers/panel/app) → aplicación (tipo Checkout API; no se cobra nada, solo se usa para leer reportes).
2. **Credenciales de producción** → copiar el **Access Token** (`APP_USR-...`).
3. Guardarlo desde una terminal propia: `setx MP_ACCESS_TOKEN "APP_USR-..."` y abrir una terminal nueva.

La configuración del reporte se crea sola la primera vez (`asegurarConfiguracion`).

## Puesta en marcha

```powershell
npm install
npx prisma migrate dev   # crea prisma/dev.db con las tablas
npx prisma generate      # genera el cliente en src/generated/prisma
npm run dev              # http://localhost:3000
```

npm 11 bloquea los scripts de instalación por defecto. Si `better-sqlite3` falla:

```powershell
npm install-scripts approve better-sqlite3 prisma @prisma/engines unrs-resolver
npm rebuild better-sqlite3
```

Sincronizar a mano: `POST http://localhost:3000/api/sync`.

## Estructura

```
prisma/
  schema.prisma          Modelos: Movimiento, Categoria, Regla, Sincronizacion
  migrations/
src/
  instrumentation.ts     Arranca el programador cuando levanta el servidor
  app/api/sync/route.ts  POST: sincroniza ahora
  lib/
    db.ts                Cliente Prisma (una instancia por proceso)
    mercadopago.ts       Cliente de la API: config, generar/descargar reporte, detalle de pago
    sincronizar.ts       Trae, deduplica, enriquece y categoriza
    categorizar.ts       Motor de reglas y aprendizaje
    semilla.ts           Categorías y reglas de fábrica (se cargan si la base está vacía)
    programador.ts       Sincronización periódica
```

Montos en **centavos** (`Int`), negativos = sale plata. Clave única de un movimiento:
`SOURCE_ID:TRANSACTION_TYPE:monto` (un mismo pago puede aparecer como cobro y como devolución).

## Estado del proyecto

- [x] Conexión con Mercado Pago y reporte automático
- [x] Base de datos, reglas de fábrica y aprendizaje
- [x] Sincronización periódica
- [ ] Panel web (resumen del mes, gastos por categoría, movimientos)
- [ ] Chat de pendientes y carga rápida ("café 2500")
- [ ] Preguntas en lenguaje natural con IA
- [ ] App instalable en el celular (PWA) con notificaciones
- [ ] Login y despliegue en la nube (Postgres)
