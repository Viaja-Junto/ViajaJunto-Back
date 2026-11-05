-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tourist_spot_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "visited_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_tourist_spot_id_idx" ON "review"("tourist_spot_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_user_id_tourist_spot_id_key" ON "review"("user_id", "tourist_spot_id");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_tourist_spot_id_fkey" FOREIGN KEY ("tourist_spot_id") REFERENCES "tourist_spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
