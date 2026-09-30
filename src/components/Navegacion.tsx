"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", texto: "Resumen" },
  { href: "/movimientos", texto: "Movimientos" },
  { href: "/chat", texto: "Chat" },
  { href: "/importar", texto: "Importar" },
];

export function Navegacion({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  return (
    <nav className="-mx-1 flex gap-0.5 overflow-x-auto px-1">
      {LINKS.map((l) => {
        const activo = l.href === "/" ? ruta === "/" : ruta.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] transition-colors duration-200 ${
              activo ? "bg-tinta text-plano font-medium" : "text-tinta-2 hover:text-tinta"
            }`}
          >
            {l.texto}
            {l.href === "/chat" && pendientes > 0 && (
              <span className="cifras min-w-[18px] rounded-full bg-aviso px-1.5 text-center text-[11px] leading-[18px] font-semibold text-white">
                {pendientes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
