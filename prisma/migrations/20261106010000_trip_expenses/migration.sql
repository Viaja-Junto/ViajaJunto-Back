-- CreateEnum
CREATE TYPE "ExpenseSplitType" AS ENUM ('EQUAL', 'EXACT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_ADDED';

-- CreateTable
CREATE TABLE "trip_expense" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SpotCategory",
    "spent_on" DATE,
    "split_type" "ExpenseSplitType" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_expense_share" (
    "expense_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "trip_expense_share_pkey" PRIMARY KEY ("expense_id","user_id")
);

-- CreateIndex
CREATE INDEX "trip_expense_trip_id_idx" ON "trip_expense"("trip_id");

-- CreateIndex
CREATE INDEX "trip_expense_payer_id_idx" ON "trip_expense"("payer_id");

-- CreateIndex
CREATE INDEX "trip_expense_created_by_idx" ON "trip_expense"("created_by");

-- CreateIndex
CREATE INDEX "trip_expense_share_user_id_idx" ON "trip_expense_share"("user_id");

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense" ADD CONSTRAINT "trip_expense_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense_share" ADD CONSTRAINT "trip_expense_share_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "trip_expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expense_share" ADD CONSTRAINT "trip_expense_share_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

