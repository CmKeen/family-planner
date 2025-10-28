import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplate() {
  const template = await prisma.mealScheduleTemplate.findFirst();
  console.log('Template data:');
  console.log(JSON.stringify(template, null, 2));
  await prisma.$disconnect();
}

checkTemplate().catch(console.error);
