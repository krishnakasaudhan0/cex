/*
  Warnings:

  - Added the required column `side` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED', 'PARTIALLY_FILLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "side" "OrderSide" NOT NULL,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'OPEN';
