-- CreateTable
CREATE TABLE "favorite_destination" (
    "user_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_destination_pkey" PRIMARY KEY ("user_id","destination_id")
);

-- CreateTable
CREATE TABLE "favorite_tourist_spot" (
    "user_id" TEXT NOT NULL,
    "tourist_spot_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_tourist_spot_pkey" PRIMARY KEY ("user_id","tourist_spot_id")
);

-- CreateIndex
CREATE INDEX "favorite_destination_destination_id_idx" ON "favorite_destination"("destination_id");

-- CreateIndex
CREATE INDEX "favorite_tourist_spot_tourist_spot_id_idx" ON "favorite_tourist_spot"("tourist_spot_id");

-- AddForeignKey
ALTER TABLE "favorite_destination" ADD CONSTRAINT "favorite_destination_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_destination" ADD CONSTRAINT "favorite_destination_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_tourist_spot" ADD CONSTRAINT "favorite_tourist_spot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_tourist_spot" ADD CONSTRAINT "favorite_tourist_spot_tourist_spot_id_fkey" FOREIGN KEY ("tourist_spot_id") REFERENCES "tourist_spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

