-- CreateTable
CREATE TABLE "MealScheduleTemplate" (
    "id" TEXT NOT NULL,
    "familyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Family" ADD COLUMN "defaultTemplateId" TEXT;

-- AlterTable
ALTER TABLE "WeeklyPlan" ADD COLUMN "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "MealScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealScheduleTemplate" ADD CONSTRAINT "MealScheduleTemplate_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
