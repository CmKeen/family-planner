-- CreateIndex
CREATE INDEX "Ingredient_recipeId_order_idx" ON "Ingredient"("recipeId", "order");

-- CreateIndex
CREATE INDEX "Meal_weeklyPlanId_isSkipped_idx" ON "Meal"("weeklyPlanId", "isSkipped");

-- CreateIndex
CREATE INDEX "Meal_weeklyPlanId_dayOfWeek_mealType_idx" ON "Meal"("weeklyPlanId", "dayOfWeek", "mealType");

-- CreateIndex
CREATE INDEX "Guest_mealId_idx" ON "Guest"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_weeklyPlanId_key" ON "ShoppingList"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "InventoryItem_familyId_idx" ON "InventoryItem"("familyId");

-- CreateIndex
CREATE INDEX "InventoryItem_familyId_name_idx" ON "InventoryItem"("familyId", "name");
