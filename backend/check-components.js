import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database state...\n');

  // Check FoodComponents
  const foodComponentsCount = await prisma.foodComponent.count();
  console.log(`✅ FoodComponents: ${foodComponentsCount} records`);

  if (foodComponentsCount > 0) {
    const sampleComponents = await prisma.foodComponent.findMany({
      take: 5,
      select: { id: true, name: true, category: true }
    });
    console.log('Sample components:', sampleComponents);
  }

  // Check MealComponents
  const mealComponentsCount = await prisma.mealComponent.count();
  console.log(`\n✅ MealComponents: ${mealComponentsCount} records`);

  if (mealComponentsCount > 0) {
    const sampleMealComponents = await prisma.mealComponent.findMany({
      take: 5,
      include: { component: true, meal: true }
    });
    console.log('Sample meal components:', JSON.stringify(sampleMealComponents, null, 2));
  }

  // Check meals without recipes
  const mealsWithoutRecipes = await prisma.meal.count({
    where: { recipeId: null }
  });
  console.log(`\n✅ Meals without recipes: ${mealsWithoutRecipes} records`);

  if (mealsWithoutRecipes > 0) {
    const sampleMeals = await prisma.meal.findMany({
      where: { recipeId: null },
      take: 3,
      include: {
        mealComponents: {
          include: { component: true }
        }
      }
    });
    console.log('\nSample meals without recipes:');
    sampleMeals.forEach(meal => {
      console.log(`  - Meal ${meal.id}:`);
      console.log(`    Day: ${meal.dayOfWeek}, Type: ${meal.mealType}`);
      console.log(`    MealComponents: ${meal.mealComponents.length}`);
      if (meal.mealComponents.length > 0) {
        meal.mealComponents.forEach(mc => {
          console.log(`      - ${mc.component.name} (${mc.quantity}${mc.unit})`);
        });
      }
    });
  }

  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
