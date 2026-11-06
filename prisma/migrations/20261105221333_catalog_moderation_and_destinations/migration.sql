-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DestinationCategory" AS ENUM ('CITY', 'BEACH', 'NATURE', 'CULTURAL');

-- DropForeignKey
ALTER TABLE "tourist_spot" DROP CONSTRAINT "tourist_spot_created_by_fkey";

-- AlterTable
ALTER TABLE "tourist_spot" ADD COLUMN     "destination_id" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status" "CatalogStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "created_by" DROP NOT NULL;

-- Every spot registered before moderation existed was already public: keep it so.
UPDATE "tourist_spot" SET "status" = 'APPROVED';

-- CreateTable
CREATE TABLE "destination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "country_code" VARCHAR(2),
    "category" "DestinationCategory",
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photo_url" TEXT,
    "average_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_by" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "destination_status_idx" ON "destination"("status");

-- CreateIndex
CREATE INDEX "destination_created_by_idx" ON "destination"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "destination_name_country_key" ON "destination"("name", "country");

-- CreateIndex
CREATE INDEX "tourist_spot_status_idx" ON "tourist_spot"("status");

-- CreateIndex
CREATE INDEX "tourist_spot_destination_id_idx" ON "tourist_spot"("destination_id");

-- AddForeignKey
ALTER TABLE "destination" ADD CONSTRAINT "destination_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination" ADD CONSTRAINT "destination_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tourist_spot" ADD CONSTRAINT "tourist_spot_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tourist_spot" ADD CONSTRAINT "tourist_spot_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tourist_spot" ADD CONSTRAINT "tourist_spot_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
