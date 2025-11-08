-- AlterTable
ALTER TABLE "Meal" ADD COLUMN "isSkipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "skipReason" TEXT;
