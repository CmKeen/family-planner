-- Drop the role column from MealComponent table
ALTER TABLE "MealComponent" DROP COLUMN "role";

-- Drop the ComponentRole enum type
DROP TYPE "ComponentRole";
