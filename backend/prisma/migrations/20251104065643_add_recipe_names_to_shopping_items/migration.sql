-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN IF NOT EXISTS "recipeNames" TEXT[] DEFAULT ARRAY[]::TEXT[];
