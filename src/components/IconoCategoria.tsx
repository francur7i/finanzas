// Íconos de línea monocromos (toman el color del texto), al estilo de SF Symbols.
// Reemplazan a los emojis de colores: el color queda reservado para los datos del gráfico.

const TRAZOS: Record<string, React.ReactNode> = {
  Supermercado: (
    <>
      <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" />
      <circle cx="9.5" cy="19.5" r="1.2" />
      <circle cx="17" cy="19.5" r="1.2" />
    </>
  ),
  "Comida y delivery": (
    <>
      <path d="M7 3v8M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
      <path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5V13H17" />
    </>
  ),
  Transporte: (
    <>
      <path d="M5 16V11.5l1.8-4.6A2 2 0 0 1 8.7 5.6h6.6a2 2 0 0 1 1.9 1.3L19 11.5V16" />
      <path d="M3.5 16h17M5 11.5h14" />
      <path d="M6.5 16v2.5M17.5 16v2.5" />
      <circle cx="8" cy="13.7" r=".6" />
      <circle cx="16" cy="13.7" r=".6" />
    </>
  ),
  Suscripciones: (
    <>
      <rect x="3" y="5" width="18" height="13" rx="2.5" />
      <path d="M10 9.2v4.6l4-2.3-4-2.3ZM8 21h8" />
    </>
  ),
  Servicios: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />,
  "Compras online": (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  Vivienda: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11h13V9M10 20v-5.5h4V20" />
    </>
  ),
  Salud: <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />,
  Ocio: (
    <>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" />
      <path d="M14.5 6v12" strokeDasharray="1.5 2" />
    </>
  ),
  Transferencias: <path d="M7 17 17 7M9 7h8v8" />,
  "Otros gastos": (
    <>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </>
  ),
  Sueldo: (
    <>
      <rect x="3.5" y="7" width="17" height="12" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" />
    </>
  ),
  Rendimientos: <path d="M4 17l5-5 3.5 3.5L20 8M15 8h5v5" />,
  Devoluciones: <path d="M9 14 4.5 9.5 9 5M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" />,
  "Otros ingresos": <path d="M12 5v14M5 12h14" />,
  "Entre mis cuentas": <path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13" />,
};

const SIN_CATEGORIA = (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.3M12 16.6v.1" />
  </>
);

export function IconoCategoria({ nombre, className = "h-5 w-5" }: { nombre?: string | null; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {(nombre && TRAZOS[nombre]) ?? SIN_CATEGORIA}
    </svg>
  );
}
