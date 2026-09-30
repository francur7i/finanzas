-- CreateTable
CREATE TABLE "Movimiento" (
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

-- CreateTable
CREATE TABLE "Categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icono" TEXT NOT NULL DEFAULT '•'
);

-- CreateTable
CREATE TABLE "Regla" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoriaId" INTEGER NOT NULL,
    "descripcionContiene" TEXT,
    "tipo" TEXT,
    "operacion" TEXT,
    "signo" TEXT,
    "montoMinCentavos" INTEGER,
    "montoMaxCentavos" INTEGER,
    "diaDesde" INTEGER,
    "diaHasta" INTEGER,
    "requiereConfirmar" BOOLEAN NOT NULL DEFAULT false,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "origen" TEXT NOT NULL DEFAULT 'sistema',
    "usos" INTEGER NOT NULL DEFAULT 0,
    "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Regla_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sincronizacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fuente" TEXT NOT NULL,
    "desde" DATETIME NOT NULL,
    "hasta" DATETIME NOT NULL,
    "estado" TEXT NOT NULL,
    "filas" INTEGER NOT NULL DEFAULT 0,
    "nuevas" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "reporteId" TEXT,
    "iniciadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadaEn" DATETIME
);

-- CreateIndex
CREATE INDEX "Movimiento_fecha_idx" ON "Movimiento"("fecha");

-- CreateIndex
CREATE INDEX "Movimiento_estado_idx" ON "Movimiento"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Movimiento_origen_idExterno_key" ON "Movimiento"("origen", "idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");
