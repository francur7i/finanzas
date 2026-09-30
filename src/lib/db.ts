import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Una sola instancia por proceso: en desarrollo Next recarga módulos y abriría conexiones de más.
// Se guarda junto con la clase que la creó: si `prisma generate` regeneró el cliente (cambió el schema),
// la clase es otra y se crea una instancia nueva. Así no hace falta reiniciar `npm run dev`.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClase?: typeof PrismaClient };

function crearCliente() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function obtenerCliente() {
  const g = globalParaPrisma;
  if (g.prisma && g.prismaClase === PrismaClient) return g.prisma;
  void g.prisma?.$disconnect();
  const cliente = crearCliente();
  if (process.env.NODE_ENV !== "production") {
    g.prisma = cliente;
    g.prismaClase = PrismaClient;
  }
  return cliente;
}

export const db = obtenerCliente();
