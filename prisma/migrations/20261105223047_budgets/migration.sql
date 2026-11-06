-- CreateTable
CREATE TABLE "budget" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_trip_id_key" ON "budget"("trip_id");

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
