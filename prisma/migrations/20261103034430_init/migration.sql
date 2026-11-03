-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERATOR');

-- CreateEnum
CREATE TYPE "LocationRole" AS ENUM ('PICK', 'RESERVE', 'DOCK');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'PUTAWAY', 'TRANSFER', 'ADJUSTMENT', 'PICK', 'RETURN', 'SHIP');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('MANUAL', 'IMPORT', 'API');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_WAVE', 'PICKED', 'SORTED', 'PACKED', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WaveStatus" AS ENUM ('OPEN', 'PICKING', 'SORTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickTaskStatus" AS ENUM ('PENDING', 'DONE', 'SHORT');

-- CreateEnum
CREATE TYPE "ReceptionStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "PutbackStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "aisle" INTEGER,
    "rack" INTEGER,
    "level" INTEGER,
    "position" INTEGER,
    "role" "LocationRole" NOT NULL DEFAULT 'PICK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortKey" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "qty" INTEGER NOT NULL,
    "type" "MovementType" NOT NULL,
    "reference" TEXT,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalRef" TEXT,
    "source" "OrderSource" NOT NULL DEFAULT 'MANUAL',
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "phone" TEXT,
    "carrier" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pickedAt" TIMESTAMP(3),
    "sortedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "sortedQty" INTEGER NOT NULL DEFAULT 0,
    "packedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus",
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wave" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "WaveStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Wave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaveOrder" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "WaveOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickTask" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "qtyRequired" INTEGER NOT NULL,
    "qtyPicked" INTEGER NOT NULL DEFAULT 0,
    "status" "PickTaskStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" INTEGER NOT NULL,
    "pickedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReceptionStatus" NOT NULL DEFAULT 'DRAFT',
    "supplier" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionLine" (
    "id" TEXT NOT NULL,
    "receptionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "ReceptionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PutbackTask" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "PutbackStatus" NOT NULL DEFAULT 'PENDING',
    "locationId" TEXT,
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "PutbackTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Location_code_idx" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_warehouseId_zone_sortKey_idx" ON "Location"("warehouseId", "zone", "sortKey");

-- CreateIndex
CREATE INDEX "Location_role_active_sortKey_idx" ON "Location"("role", "active", "sortKey");

-- CreateIndex
CREATE UNIQUE INDEX "Location_warehouseId_code_key" ON "Location"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "StockLevel_productId_idx" ON "StockLevel"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_locationId_productId_key" ON "StockLevel"("locationId", "productId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_fromLocationId_idx" ON "StockMovement"("fromLocationId");

-- CreateIndex
CREATE INDEX "StockMovement_toLocationId_idx" ON "StockMovement"("toLocationId");

-- CreateIndex
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");

-- CreateIndex
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_reference_idx" ON "StockMovement"("reference");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalRef_key" ON "Order"("externalRef");

-- CreateIndex
CREATE INDEX "Order_status_priority_createdAt_idx" ON "Order"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_carrier_idx" ON "Order"("status", "carrier");

-- CreateIndex
CREATE INDEX "Order_shippedAt_idx" ON "Order"("shippedAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLine_productId_idx" ON "OrderLine"("productId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_userId_idx" ON "OrderEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wave_code_key" ON "Wave"("code");

-- CreateIndex
CREATE INDEX "Wave_status_createdAt_idx" ON "Wave"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Wave_assignedUserId_idx" ON "Wave"("assignedUserId");

-- CreateIndex
CREATE INDEX "Wave_createdById_idx" ON "Wave"("createdById");

-- CreateIndex
CREATE INDEX "WaveOrder_orderId_idx" ON "WaveOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "WaveOrder_waveId_slot_key" ON "WaveOrder"("waveId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "WaveOrder_waveId_orderId_key" ON "WaveOrder"("waveId", "orderId");

-- CreateIndex
CREATE INDEX "PickTask_waveId_sequence_idx" ON "PickTask"("waveId", "sequence");

-- CreateIndex
CREATE INDEX "PickTask_locationId_productId_status_idx" ON "PickTask"("locationId", "productId", "status");

-- CreateIndex
CREATE INDEX "PickTask_productId_idx" ON "PickTask"("productId");

-- CreateIndex
CREATE INDEX "PickTask_pickedById_idx" ON "PickTask"("pickedById");

-- CreateIndex
CREATE UNIQUE INDEX "Reception_code_key" ON "Reception"("code");

-- CreateIndex
CREATE INDEX "Reception_status_createdAt_idx" ON "Reception"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Reception_createdById_idx" ON "Reception"("createdById");

-- CreateIndex
CREATE INDEX "ReceptionLine_receptionId_idx" ON "ReceptionLine"("receptionId");

-- CreateIndex
CREATE INDEX "ReceptionLine_productId_idx" ON "ReceptionLine"("productId");

-- CreateIndex
CREATE INDEX "ReceptionLine_locationId_idx" ON "ReceptionLine"("locationId");

-- CreateIndex
CREATE INDEX "PutbackTask_status_createdAt_idx" ON "PutbackTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PutbackTask_orderId_idx" ON "PutbackTask"("orderId");

-- CreateIndex
CREATE INDEX "PutbackTask_productId_idx" ON "PutbackTask"("productId");

-- CreateIndex
CREATE INDEX "PutbackTask_locationId_idx" ON "PutbackTask"("locationId");

-- CreateIndex
CREATE INDEX "PutbackTask_doneById_idx" ON "PutbackTask"("doneById");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaveOrder" ADD CONSTRAINT "WaveOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "Wave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_pickedById_fkey" FOREIGN KEY ("pickedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLine" ADD CONSTRAINT "ReceptionLine_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "Reception"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLine" ADD CONSTRAINT "ReceptionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionLine" ADD CONSTRAINT "ReceptionLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutbackTask" ADD CONSTRAINT "PutbackTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutbackTask" ADD CONSTRAINT "PutbackTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutbackTask" ADD CONSTRAINT "PutbackTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PutbackTask" ADD CONSTRAINT "PutbackTask_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invariants enforced by the database
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_qty_nonnegative" CHECK ("qty" >= 0);
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_minmax_valid" CHECK (("minQty" IS NULL OR "minQty" >= 0) AND ("maxQty" IS NULL OR "maxQty" >= 0));
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_qty_valid" CHECK ("qty" > 0 AND "pickedQty" >= 0 AND "pickedQty" <= "qty" AND "sortedQty" >= 0 AND "sortedQty" <= "pickedQty" AND "packedQty" >= 0 AND "packedQty" <= "sortedQty");
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_qty_valid" CHECK ("qtyRequired" >= 0 AND "qtyPicked" >= 0 AND "qtyPicked" <= "qtyRequired");
ALTER TABLE "ReceptionLine" ADD CONSTRAINT "ReceptionLine_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "PutbackTask" ADD CONSTRAINT "PutbackTask_qty_positive" CHECK ("qty" > 0);

-- Human-readable document numbers
CREATE SEQUENCE "order_code_seq";
CREATE SEQUENCE "wave_code_seq";
CREATE SEQUENCE "reception_code_seq";
