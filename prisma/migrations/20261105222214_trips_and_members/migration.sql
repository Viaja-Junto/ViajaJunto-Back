-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'CONFIRMED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MemberPermission" AS ENUM ('EDITOR', 'VIEWER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_PERMISSION_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'DESTINATION_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITY_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITY_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITY_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'BUDGET_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'TRIP_STATUS_CHANGED';

-- CreateTable
CREATE TABLE "trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
    "created_by" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_member" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "MemberPermission" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_invite_code_key" ON "trip"("invite_code");

-- CreateIndex
CREATE INDEX "trip_created_by_idx" ON "trip"("created_by");

-- CreateIndex
CREATE INDEX "trip_member_user_id_idx" ON "trip_member"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_member_trip_id_user_id_key" ON "trip_member"("trip_id", "user_id");

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_member" ADD CONSTRAINT "trip_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
