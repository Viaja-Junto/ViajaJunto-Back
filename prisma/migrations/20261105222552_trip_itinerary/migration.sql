-- CreateEnum
CREATE TYPE "TripActivityStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED');

-- CreateTable
CREATE TABLE "trip_destination" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "arrival" DATE,
    "departure" DATE,
    "description" TEXT,
    "display_order" INTEGER,

    CONSTRAINT "trip_destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activity" (
    "id" TEXT NOT NULL,
    "trip_destination_id" TEXT NOT NULL,
    "tourist_spot_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "expected_cost" DOUBLE PRECISION,
    "status" "TripActivityStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "trip_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_destination_trip_id_idx" ON "trip_destination"("trip_id");

-- CreateIndex
CREATE INDEX "trip_destination_destination_id_idx" ON "trip_destination"("destination_id");

-- CreateIndex
CREATE INDEX "trip_activity_trip_destination_id_idx" ON "trip_activity"("trip_destination_id");

-- CreateIndex
CREATE INDEX "trip_activity_tourist_spot_id_idx" ON "trip_activity"("tourist_spot_id");

-- AddForeignKey
ALTER TABLE "trip_destination" ADD CONSTRAINT "trip_destination_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_destination" ADD CONSTRAINT "trip_destination_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_trip_destination_id_fkey" FOREIGN KEY ("trip_destination_id") REFERENCES "trip_destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activity" ADD CONSTRAINT "trip_activity_tourist_spot_id_fkey" FOREIGN KEY ("tourist_spot_id") REFERENCES "tourist_spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
