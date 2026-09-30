-- AlterTable
ALTER TABLE "Regla" ADD COLUMN "destinatario" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movimiento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "origen" TEXT NOT NULL,
    "idExterno" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "montoCentavos" INTEGER NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'ARS',
    "tipo" TEXT NOT NULL,
    "operacion" TEXT,
    "medio" TEXT,
    "descripcion" TEXT,
    "rubro" TEXT,
    "destinatario" TEXT,
    "enriquecido" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "categoriaId" INTEGER,
    "reglaId" INTEGER,
    "crudo" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Movimiento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Movimiento_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "Regla" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movimiento" ("actualizadoEn", "categoriaId", "creadoEn", "crudo", "descripcion", "estado", "fecha", "id", "idExterno", "medio", "moneda", "montoCentavos", "nota", "operacion", "origen", "reglaId", "tipo") SELECT "actualizadoEn", "categoriaId", "creadoEn", "crudo", "descripcion", "estado", "fecha", "id", "idExterno", "medio", "moneda", "montoCentavos", "nota", "operacion", "origen", "reglaId", "tipo" FROM "Movimiento";
DROP TABLE "Movimiento";
ALTER TABLE "new_Movimiento" RENAME TO "Movimiento";
CREATE INDEX "Movimiento_fecha_idx" ON "Movimiento"("fecha");
CREATE INDEX "Movimiento_estado_idx" ON "Movimiento"("estado");
CREATE UNIQUE INDEX "Movimiento_origen_idExterno_key" ON "Movimiento"("origen", "idExterno");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
