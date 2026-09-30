"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

type Tema = "sistema" | "claro" | "oscuro";
const CLAVE = "tema";
const ATRIBUTO: Record<Tema, string | null> = { sistema: null, claro: "light", oscuro: "dark" };

/** Script que corre antes de pintar: aplica el tema guardado sin parpadeo. Va en <head>. */
export const scriptTema = `(function(){try{var t=localStorage.getItem("${CLAVE}");var a=t==="claro"?"light":t==="oscuro"?"dark":null;if(a)document.documentElement.setAttribute("data-theme",a)}catch(e){}})()`;

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === "claro" || t === "oscuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

function aplicar(t: Tema) {
  const a = ATRIBUTO[t];
  if (a) document.documentElement.setAttribute("data-theme", a);
  else document.documentElement.removeAttribute("data-theme");
}

const OPCIONES: { valor: Tema; titulo: string; icono: React.ReactNode }[] = [
  {
    valor: "sistema",
    titulo: "Automático (según el sistema)",
    icono: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="10" cy="10" r="6.5" />
        <path d="M10 3.5v13a6.5 6.5 0 0 0 0-13Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    valor: "claro",
    titulo: "Claro",
    icono: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1" />
      </svg>
    ),
  },
  {
    valor: "oscuro",
    titulo: "Oscuro",
    icono: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
        <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5Z" />
      </svg>
    ),
  },
];

// El tema guardado es un "store" externo (localStorage): se lee con useSyncExternalStore.
const EVENTO = "tema-cambiado";
function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

export function BotonTema() {
  const tema = useSyncExternalStore(suscribir, leer, () => "sistema" as Tema);

  // Vuelve a aplicar el atributo: en desarrollo React lo limpia al remontar <html>.
  useLayoutEffect(() => aplicar(leer()), []);

  function elegir(t: Tema) {
    aplicar(t);
    try {
      localStorage.setItem(CLAVE, t);
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div role="radiogroup" aria-label="Tema" className="flex rounded-full bg-grilla p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.valor}
          role="radio"
          aria-checked={tema === o.valor}
          title={o.titulo}
          onClick={() => elegir(o.valor)}
          className={`grid h-7 w-8 place-items-center rounded-full transition-all duration-200 ${
            tema === o.valor ? "bg-superficie text-tinta shadow-suave" : "text-tinta-3 hover:text-tinta-2"
          }`}
        >
          {o.icono}
        </button>
      ))}
    </div>
  );
}
