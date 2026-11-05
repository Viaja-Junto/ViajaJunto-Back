-- CreateEnum
CREATE TYPE "SpotCategory" AS ENUM ('NATURE', 'BEACH', 'PARK', 'MUSEUM', 'MONUMENT', 'HISTORICAL', 'ENTERTAINMENT', 'OTHER');

-- CreateTable
CREATE TABLE "tourist_spot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "SpotCategory" NOT NULL DEFAULT 'OTHER',
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "country_code" VARCHAR(2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photo_url" TEXT,
    "average_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tourist_spot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tourist_spot_city_idx" ON "tourist_spot"("city");

-- CreateIndex
CREATE INDEX "tourist_spot_category_idx" ON "tourist_spot"("category");

-- CreateIndex
CREATE INDEX "tourist_spot_created_by_idx" ON "tourist_spot"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "tourist_spot_name_city_country_key" ON "tourist_spot"("name", "city", "country");

-- AddForeignKey
ALTER TABLE "tourist_spot" ADD CONSTRAINT "tourist_spot_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
