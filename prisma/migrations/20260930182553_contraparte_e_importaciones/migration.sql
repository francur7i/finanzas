-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN "contraparte" TEXT;

-- CreateTable
CREATE TABLE "Importacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "archivo" TEXT NOT NULL,
    "desde" DATETIME NOT NULL,
    "hasta" DATETIME NOT NULL,
    "filas" INTEGER NOT NULL,
    "cruzadas" INTEGER NOT NULL,
    "conNombre" INTEGER NOT NULL,
    "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
