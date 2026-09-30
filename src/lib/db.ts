import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Una sola instancia por proceso: en desarrollo Next recarga módulos y abriría conexiones de más.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
