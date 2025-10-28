import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const planId = '4f825386-2f05-4e22-996b-33c16788267d';

  const meals = await prisma.meal.findMany({
    where: { weeklyPlanId: planId },
    include: { mealComponents: { include: { component: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }]
  });

  console.log(`\nTotal meals: ${meals.length}\n`);

  meals.forEach(m => {
    console.log(`${m.dayOfWeek} ${m.mealType}:`);
    console.log(`  Recipe: ${m.recipeId ? 'YES' : 'NO'}`);
    console.log(`  Components: ${m.mealComponents.length}`);
    if (m.mealComponents.length > 0) {
      m.mealComponents.forEach(mc => {
        console.log(`    - ${mc.component.name} (${mc.quantity}${mc.unit})`);
      });
    }
    console.log('');
  });

  await prisma.$disconnect();
}

check().catch(console.error);
