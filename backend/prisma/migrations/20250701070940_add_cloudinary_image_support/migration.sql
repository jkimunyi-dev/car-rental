/*
  Warnings:

  - The `images` column on the `vehicles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "vehicleImagePublicId" TEXT,
ADD COLUMN     "vehicleImageUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarPublicId" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "primaryImage" TEXT,
ADD COLUMN     "primaryImagePublicId" TEXT,
DROP COLUMN "images",
ADD COLUMN     "images" JSONB[];
