/*
  Warnings:

  - You are about to drop the column `vehicleImagePublicId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleImageUrl` on the `bookings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingReference]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "vehicleImagePublicId",
DROP COLUMN "vehicleImageUrl",
ADD COLUMN     "additionalDrivers" JSONB,
ADD COLUMN     "bookingReference" TEXT,
ADD COLUMN     "bookingSource" TEXT,
ADD COLUMN     "customerIp" TEXT,
ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "driverAge" INTEGER,
ADD COLUMN     "insuranceLevel" TEXT,
ADD COLUMN     "pricingBreakdown" JSONB,
ADD COLUMN     "specialRequests" TEXT,
ADD COLUMN     "vehicleSnapshot" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingReference_key" ON "bookings"("bookingReference");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
