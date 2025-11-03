-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('PLAN_CREATED', 'PLAN_STATUS_CHANGED', 'MEAL_ADDED', 'MEAL_REMOVED', 'RECIPE_CHANGED', 'PORTIONS_CHANGED', 'MEAL_LOCKED', 'MEAL_UNLOCKED', 'COMPONENT_ADDED', 'COMPONENT_REMOVED', 'COMPONENT_CHANGED', 'COMMENT_ADDED', 'COMMENT_EDITED', 'COMMENT_DELETED', 'VOTE_ADDED', 'VOTE_CHANGED', 'TEMPLATE_SWITCHED', 'CUTOFF_CHANGED', 'ATTENDANCE_CHANGED');

-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN "canViewAuditLog" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WeeklyPlan"
DROP COLUMN "allowDeltaAfterCutoff",
ADD COLUMN "allowCommentsAfterCutoff" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "MealComment" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChangeLog" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "mealId" TEXT,
    "memberId" TEXT,
    "changeType" "ChangeType" NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionNl" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealComment_mealId_idx" ON "MealComment"("mealId");

-- CreateIndex
CREATE INDEX "MealComment_memberId_idx" ON "MealComment"("memberId");

-- CreateIndex
CREATE INDEX "MealComment_createdAt_idx" ON "MealComment"("createdAt");

-- CreateIndex
CREATE INDEX "PlanChangeLog_weeklyPlanId_idx" ON "PlanChangeLog"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "PlanChangeLog_mealId_idx" ON "PlanChangeLog"("mealId");

-- CreateIndex
CREATE INDEX "PlanChangeLog_memberId_idx" ON "PlanChangeLog"("memberId");

-- CreateIndex
CREATE INDEX "PlanChangeLog_changeType_idx" ON "PlanChangeLog"("changeType");

-- CreateIndex
CREATE INDEX "PlanChangeLog_createdAt_idx" ON "PlanChangeLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MealComment" ADD CONSTRAINT "MealComment_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealComment" ADD CONSTRAINT "MealComment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeLog" ADD CONSTRAINT "PlanChangeLog_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeLog" ADD CONSTRAINT "PlanChangeLog_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeLog" ADD CONSTRAINT "PlanChangeLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
