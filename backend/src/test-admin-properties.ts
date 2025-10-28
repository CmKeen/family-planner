import { PrismaClient } from '@prisma/client';
import * as AdminJSPrisma from '@adminjs/prisma';

const { getModelByName } = AdminJSPrisma;
const prisma = new PrismaClient();

async function testProperties() {
  try {
    const model = getModelByName('MealScheduleTemplate');
    const resource = new AdminJSPrisma.Resource({ model, client: prisma });

    console.log('\n=== MealScheduleTemplate Resource Properties ===');
    const properties = resource.properties();
    properties.forEach(prop => {
      console.log(`\nProperty: ${prop.name()}`);
      console.log(`  Type: ${prop.type()}`);
      console.log(`  Available: ${prop.isArray ? 'Array' : 'Single'}`);
      console.log(`  Visible: ${prop.isVisible()}`);
    });

    // Test data
    const template = await prisma.mealScheduleTemplate.findFirst();
    console.log('\n=== Sample Data ===');
    console.log('Schedule field:', JSON.stringify(template?.schedule, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProperties();
