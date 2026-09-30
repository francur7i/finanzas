import { connection } from "next/server";
import { Chat } from "@/components/Chat";
import { listarCategorias } from "@/lib/consultas";
import { configuracionModelo } from "@/lib/ia/modelo";
import { listarPendientes } from "@/lib/pendientes";

export default async function PaginaChat() {
  await connection();
  const [pendientes, categorias] = await Promise.all([listarPendientes(), listarCategorias()]);
  const { proveedor, modelo, falta } = configuracionModelo();
  return (
    <Chat
      pendientesIniciales={pendientes}
      categorias={categorias}
      modelo={{ nombre: `${proveedor} · ${modelo}`, falta }}
    />
  );
}
