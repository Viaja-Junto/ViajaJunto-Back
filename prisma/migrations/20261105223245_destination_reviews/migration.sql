-- CreateTable
CREATE TABLE "destination_review" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "destination_review_destination_id_idx" ON "destination_review"("destination_id");

-- CreateIndex
CREATE UNIQUE INDEX "destination_review_user_id_destination_id_key" ON "destination_review"("user_id", "destination_id");

-- AddForeignKey
ALTER TABLE "destination_review" ADD CONSTRAINT "destination_review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_review" ADD CONSTRAINT "destination_review_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
