-- CreateEnum
CREATE TYPE "ComponentCategory" AS ENUM ('PROTEIN', 'VEGETABLE', 'CARB', 'FRUIT', 'SAUCE', 'CONDIMENT', 'SPICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ComponentRole" AS ENUM ('MAIN_PROTEIN', 'SECONDARY_PROTEIN', 'PRIMARY_VEGETABLE', 'SECONDARY_VEGETABLE', 'BASE_CARB', 'SIDE_CARB', 'SAUCE', 'GARNISH', 'OTHER');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "isComponentBased" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FoodComponent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameNl" TEXT,
    "category" "ComponentCategory" NOT NULL DEFAULT 'OTHER',
    "defaultQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "unit" TEXT NOT NULL,
    "vegetarian" BOOLEAN NOT NULL DEFAULT true,
    "vegan" BOOLEAN NOT NULL DEFAULT false,
    "pescatarian" BOOLEAN NOT NULL DEFAULT false,
    "glutenFree" BOOLEAN NOT NULL DEFAULT true,
    "lactoseFree" BOOLEAN NOT NULL DEFAULT true,
    "kosherCategory" TEXT,
    "halalFriendly" BOOLEAN NOT NULL DEFAULT true,
    "allergens" TEXT[],
    "shoppingCategory" TEXT NOT NULL DEFAULT 'produce',
    "defaultPricePerUnit" DOUBLE PRECISION,
    "seasonality" TEXT[],
    "isSystemComponent" BOOLEAN NOT NULL DEFAULT false,
    "familyId" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealComponent" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "role" "ComponentRole" NOT NULL DEFAULT 'OTHER',
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodComponent_category_idx" ON "FoodComponent"("category");

-- CreateIndex
CREATE INDEX "FoodComponent_isSystemComponent_familyId_idx" ON "FoodComponent"("isSystemComponent", "familyId");

-- CreateIndex
CREATE INDEX "MealComponent_mealId_idx" ON "MealComponent"("mealId");

-- CreateIndex
CREATE INDEX "MealComponent_componentId_idx" ON "MealComponent"("componentId");

-- AddForeignKey
ALTER TABLE "FoodComponent" ADD CONSTRAINT "FoodComponent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealComponent" ADD CONSTRAINT "MealComponent_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealComponent" ADD CONSTRAINT "MealComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "FoodComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
