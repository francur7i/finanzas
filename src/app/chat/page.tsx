import { connection } from "next/server";
import { Chat } from "@/components/Chat";
import { listarCategorias } from "@/lib/consultas";
import { listarPendientes } from "@/lib/pendientes";

export default async function PaginaChat() {
  await connection();
  const [pendientes, categorias] = await Promise.all([listarPendientes(), listarCategorias()]);
  return <Chat pendientesIniciales={pendientes} categorias={categorias} />;
}
