import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const template = await prisma.mealScheduleTemplate.findFirst();
  console.log('ID:', template.id);
  console.log('Name:', template.name);
  console.log('Schedule type:', typeof template.schedule);
  console.log('Schedule value:', JSON.stringify(template.schedule, null, 2));
  await prisma.$disconnect();
}

test().catch(console.error);
