"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", texto: "Resumen" },
  { href: "/movimientos", texto: "Movimientos" },
  { href: "/chat", texto: "Chat" },
];

export function Navegacion({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const activo = l.href === "/" ? ruta === "/" : ruta.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              activo ? "bg-acento-suave font-medium text-tinta" : "text-tinta-2 hover:bg-grilla"
            }`}
          >
            {l.texto}
            {l.href === "/chat" && pendientes > 0 && (
              <span className="cifras rounded-full bg-aviso px-1.5 text-xs font-semibold text-white dark:text-black">
                {pendientes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
