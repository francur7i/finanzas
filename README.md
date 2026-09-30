# Finanzas

Control de finanzas personales **sin carga manual**. Los movimientos de Mercado Pago entran
solos y se categorizan con reglas. Lo que no se puede resolver automáticamente (por ejemplo,
a quién fue una transferencia) se pregunta **una sola vez** y la app aprende la respuesta.
Tiene un chat con IA para preguntar cosas en lenguaje natural.

> **Dónde quedamos (30/09/2026):** ver [Estado del proyecto](#estado-del-proyecto).

## Cómo abrir la app

1. Abrir una terminal (PowerShell) **nueva**.
2. Ejecutar:
   ```powershell
   cd C:\Users\FrancoCurti\finanzas
   npm run dev
   ```
3. Entrar a **http://localhost:3000** en el navegador.

Funciona mientras esa terminal esté abierta; al cerrarla se apaga. `localhost` significa que
solo se ve desde esta PC (para verla desde el celular hay que subirla a la nube, pendiente).
Mientras está prendida se sincroniza con Mercado Pago al arrancar y cada 6 horas.

## Cómo funciona

```
Mercado Pago ──(reporte "Todas las transacciones", cada 6 h)──▶ Sincronización
                                                                    │
                          detalle de cada pago (/v1/payments/{id}) ─┤  comercio, rubro y cuenta del otro lado
                                                                    ▼
                                                           Motor de reglas
                                                  ┌─────────────┴─────────────┐
                                           la reconoce                 no la reconoce
                                          (estado: auto)            (estado: pendiente)
                                                  │                           │
                                                  ▼                           ▼
                                             Panel web  ◀── confirmás ── Chat (botones o IA)
                                                                              │
                                                                   aprende una regla nueva
```

1. **Sincronización** (`src/lib/sincronizar.ts`): pide a Mercado Pago el reporte
   "Todas las transacciones" desde la última sincronización (con 3 días de solapamiento),
   espera a que se genere, lo descarga (CSV separado por `;`) y guarda los movimientos nuevos.
   Nunca pisa un movimiento que ya existe, para no perder categorías elegidas a mano.
2. **Detalle del pago**: el reporte no dice dónde se pagó. Para cada pago se consulta
   `GET /v1/payments/{id}`, que trae:
   - `description`: el comercio (ej. `Apple.com/bill`, `Primevideo`);
   - `point_of_interaction.business_info.branch`: el **rubro** (ej. `Transport - Tolls paygo` = peaje);
   - `collector.id` / `payer.id`: la **cuenta del otro lado**. No da el nombre, pero es un número fijo por
     persona o comercio, así que sirve para reconocer "a quién" sin saber su nombre.

   Los movimientos viejos que no tenían estos datos se completan solos en la sincronización siguiente
   (`enriquecerFaltantes`).
3. **Categorización** (`src/lib/categorizar.ts`): reglas con condiciones (texto/rubro, cuenta del otro
   lado, tipo, operación, signo, rango de monto, rango de días del mes). Gana la regla más prioritaria:
   primero las del usuario, después las aprendidas y por último las de fábrica (`src/lib/semilla.ts`).
4. **Aprendizaje**: al confirmar la categoría de un pendiente, en este orden:
   - si se conoce la **cuenta del otro lado** → regla por cuenta (la próxima vez que le pagues a esa
     persona o comercio, se categoriza solo);
   - si tiene un **comercio identificable** → regla por texto;
   - si no (transferencias a otros bancos) → regla por **monto parecido (±15 %) y día del mes (±3)** que
     *sugiere* la categoría pero pide confirmar.

   Después de aprender, vuelve a pasar las reglas por todos los pendientes: contestar uno puede resolver varios.

### Qué da y qué no da la API de Mercado Pago

| Movimiento | Tipo en el reporte | ¿Se sabe qué fue? |
|---|---|---|
| Pagos (QR, tarjeta, débitos, suscripciones, peajes) | `SETTLEMENT` negativo | Sí: descripción y rubro con `/v1/payments/{id}` |
| Transferencias a cuentas de Mercado Pago | `SETTLEMENT` + `money_transfer` | La cuenta de destino (id), no el nombre |
| Ingresos desde un banco propio | `SETTLEMENT` + `account_fund` | Sí |
| Rendimientos diarios | `SETTLEMENT` positivo sin medio de pago | Se deduce (sin detalle) |
| Devoluciones y reclamos | `REFUND`, `DISPUTE` | Sí |
| **Transferencias a otros bancos** | `PAYOUTS` | **No**: la API no informa el destinatario |

Probado y descartado: `/v1/payouts/{id}` y `/mercadopago_account/movements/search` dan **403** a apps
comunes; `/merchant_orders/{id}` y la API de órdenes de Mercado Libre también rechazan el token;
Mercado Pago no manda mail por transferencias salientes. Las transferencias a otros bancos se
resuelven con el flujo de pendientes + aprendizaje.

## Chat con IA

`/chat` tiene dos partes:

- **Arriba, el pendiente actual** con botones de categoría, nota opcional, "Ver detalle" (fecha y hora,
  rubro, medio, si la cuenta de destino o el monto se repiten, número de operación para buscarlo en la
  app de Mercado Pago) y "Después".
- **Abajo, el asistente**: un modelo de lenguaje con **herramientas** sobre la base de datos
  (`src/lib/ia/herramientas.ts`):

| Herramienta | Qué hace |
|---|---|
| `resumenDelMes` | Totales del mes y gastos por categoría |
| `buscarMovimientos` | Busca por mes, texto, categoría, estado o monto aproximado |
| `detalleDeMovimiento` | Todo lo que se sabe de un movimiento |
| `listarCategorias` | Categorías disponibles |
| `categorizarMovimiento` | "El de $50.000 fue el alquiler" → categoriza y aprende |
| `anotarMovimiento` | "Café 2500" → anota un gasto en efectivo |

El asistente sabe qué pendiente estás mirando, así que entiende "¿qué es este pago?".
Las instrucciones del modelo están en `src/app/api/chat/route.ts`.

### Cambiar de modelo

Todo pasa por **una sola capa**, `src/lib/ia/modelo.ts`, construida sobre el
[AI SDK de Vercel](https://ai-sdk.dev). Para cambiar de proveedor o de modelo **no se toca código**, solo
dos variables de entorno:

| `CHAT_PROVEEDOR` | Modelo por defecto | Clave que necesita | Notas |
|---|---|---|---|
| `groq` (**actual**) | `openai/gpt-oss-120b` | `GROQ_API_KEY` | Plan gratis con límite diario. Rápido. |
| `anthropic` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` | Pago por uso. Muy buena calidad. |
| `google` | `gemini-2.5-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` | Tiene plan gratis. |
| `ollama` | `qwen3:8b` | ninguna (`OLLAMA_URL` opcional) | Corre en la PC. Gratis y privado, pero lento en esta máquina. |

`CHAT_MODELO` pisa el modelo por defecto (ej. `CHAT_MODELO=qwen/qwen3.8-27b` con Groq).
El modelo en uso se muestra abajo del chat.

> **Privacidad:** en los planes gratis de los proveedores en la nube, lo que se manda (movimientos y montos)
> puede usarse para mejorar sus modelos. Revisar los términos de cada uno. Ollama no manda nada afuera.

## Panel web

| Página | Qué muestra |
|---|---|
| `/` Resumen | Selector de mes, ingresos (y lo que pasaste desde tu banco), gastos, balance, pendientes; gastos por categoría en barras; últimos movimientos |
| `/movimientos` | Lista del mes con filtros por categoría y estado (la URL se puede compartir); cambiar la categoría de cualquier movimiento enseña una regla |
| `/chat` | Pendientes con botones + asistente con IA |

Criterios del resumen:
- **Gastos** incluye lo *sin categorizar* (transferencias pendientes): los totales son reales aunque falte revisar.
- La categoría **Entre mis cuentas** (tipo `neutro`) no es ingreso ni gasto. El sueldo llega a otro banco y
  se pasa a Mercado Pago: eso se muestra aparte en Ingresos y sí cuenta para el **balance**
  (= lo que entró menos lo que salió).
- Gráfico: barras horizontales de un solo tono ordenadas por monto, con monto y % escritos (el color no es la única
  forma de leerlas). Colores por rol en `globals.css`, con modo oscuro propio.

## Tecnologías

| Parte | Herramienta | Por qué |
|---|---|---|
| Web y servidor | [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript | Página y API en un solo proyecto, fácil de desplegar |
| Estilos | Tailwind CSS 4 | |
| Base de datos | SQLite (local) vía Prisma 7 + `@prisma/adapter-better-sqlite3` | Un archivo, cero instalación. Se pasa a Postgres cambiando el provider |
| Datos | API de Mercado Pago (reporte `settlement_report` + `payments`) | |
| IA | AI SDK 7 (`ai`, `@ai-sdk/react`) + proveedores Groq, Anthropic, Google, OpenAI-compatible (Ollama) | Una sola interfaz para cualquier modelo |
| Tareas automáticas | `src/instrumentation.ts` → `src/lib/programador.ts` | Sincroniza al arrancar y cada `SYNC_CADA_HORAS` |

Versiones fijadas: Prisma **7.10.0** (la etiqueta `latest` de npm apuntaba a una 8.0 RC y se evitó a propósito).

## Entorno

- Windows 11, Node.js 26, npm 11. Repo: https://github.com/francur7i/finanzas
- Variables de entorno (las claves se guardan como variables de usuario de Windows con `setx`, desde una
  terminal aparte, **nunca** en el código ni en el repo):

| Variable | Para qué |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de **producción** de la app "F1NANZAS" en el panel de developers de Mercado Pago |
| `GROQ_API_KEY` | Clave de [console.groq.com](https://console.groq.com) para el chat |
| `CHAT_PROVEEDOR` / `CHAT_MODELO` | Opcionales: ver [Cambiar de modelo](#cambiar-de-modelo) |
| `DATABASE_URL` | En `.env`. Por defecto `file:./prisma/dev.db` |
| `SYNC_CADA_HORAS` | Opcional: cada cuánto sincroniza (default 6) |
| `SYNC_DIAS_INICIALES` | Opcional: cuántos días hacia atrás trae la primera vez (default 90) |

Después de un `setx` hay que abrir una terminal **nueva** para que la variable exista.
`.env*` y `*.db` están en `.gitignore`: ni las claves ni los datos se suben al repo.

### Credenciales de Mercado Pago

1. [Panel de developers](https://www.mercadopago.com.ar/developers/panel/app) → aplicación (tipo Checkout API; no se cobra nada, solo se usa para leer reportes).
2. **Credenciales de producción** → copiar el **Access Token** (`APP_USR-...`).
3. `setx MP_ACCESS_TOKEN "APP_USR-..."` y abrir una terminal nueva.

La configuración del reporte se crea sola la primera vez (`asegurarConfiguracion`).

## Instalación desde cero

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

Sincronizar a mano: botón **Sincronizar** arriba a la derecha, o `POST http://localhost:3000/api/sync`.

## Estructura

```
prisma/
  schema.prisma          Modelos: Movimiento, Categoria, Regla, Sincronizacion
  migrations/
src/
  instrumentation.ts     Arranca el programador cuando levanta el servidor
  app/
    page.tsx             Resumen
    movimientos/         Lista con filtros
    chat/                Pendientes + asistente
    acciones.ts          Server actions: sincronizar, responder pendiente, cambiar categoría, detalle
    api/sync/route.ts    POST: sincroniza ahora
    api/chat/route.ts    POST: asistente (instrucciones + herramientas, respuesta en streaming)
  components/            Navegación, gráfico de categorías, lista, chat, selectores
  lib/
    db.ts                Cliente Prisma (una instancia por proceso)
    mercadopago.ts       Cliente de la API: config, generar/descargar reporte, detalle de pago
    sincronizar.ts       Trae, deduplica, enriquece y categoriza
    categorizar.ts       Motor de reglas y aprendizaje
    semilla.ts           Categorías y reglas de fábrica (idempotente: agrega las que falten)
    programador.ts       Sincronización periódica
    consultas.ts         Lecturas para las páginas (resumen del mes, listas)
    pendientes.ts        Pendientes, detalle de un movimiento, parser de "café 2500"
    manual.ts            Alta de movimientos en efectivo
    descripcion.ts       Texto legible de un movimiento
    formato.ts           Pesos, fechas y meses en hora argentina
    ia/modelo.ts         Capa de modelo: elige proveedor y modelo por variables de entorno
    ia/herramientas.ts   Herramientas del asistente sobre la base
```

Montos en **centavos** (`Int`), negativos = sale plata. Clave única de un movimiento:
`SOURCE_ID:TRANSACTION_TYPE:monto` (un mismo pago puede aparecer como cobro y como devolución).

## Estado del proyecto

Al **30/09/2026**:

- 194 movimientos de los últimos 90 días: **125 categorizados solos, 69 pendientes** (casi todos transferencias).
- El chat con IA (Groq, `openai/gpt-oss-120b`) funciona: se probó con "¿cuánto gasté en transporte y qué es
  el pago de 1192,99 que se repite?" y usó las herramientas bien (respuesta: $ 23.241,23; son peajes).
- Todavía **no se probó** desde la página contestar pendientes ni anotar efectivo con el asistente.

Hecho:
- [x] Conexión con Mercado Pago y reporte automático
- [x] Base de datos, reglas de fábrica y aprendizaje
- [x] Sincronización periódica
- [x] Rubro del comercio y cuenta del otro lado (aprende "a quién" sin saber el nombre)
- [x] Panel web: resumen del mes, gastos por categoría, movimientos con filtros y cambio de categoría
- [x] Chat: pendientes con botones y "Ver detalle"
- [x] Asistente con IA y capa para cambiar de modelo sin tocar código

Pendiente:
- [ ] Probar el chat de punta a punta desde la página y ajustar las instrucciones del modelo
- [ ] Decidir cómo categorizar las transferencias a otros bancos (siguen siempre visibles como "Sin categorizar")
- [ ] App instalable en el celular (PWA) con notificaciones
- [ ] Login y despliegue en la nube (Postgres), con cuentas personales
