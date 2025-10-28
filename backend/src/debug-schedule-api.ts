import { PrismaClient } from '@prisma/client';
import * as AdminJSPrisma from '@adminjs/prisma';
import AdminJS from 'adminjs';

const { Database, Resource, getModelByName } = AdminJSPrisma;
const prisma = new PrismaClient();

AdminJS.registerAdapter({ Database, Resource });

async function debugScheduleField() {
  try {
    console.log('\n=== Testing MealScheduleTemplate Resource ===\n');

    const model = getModelByName('MealScheduleTemplate');
    const resource = new AdminJSPrisma.Resource({ model, client: prisma });

    // Get properties
    const scheduleProperty = resource.properties().find(p => p.name() === 'schedule');

    console.log('Schedule Property Info:');
    console.log('  Name:', scheduleProperty?.name());
    console.log('  Type:', scheduleProperty?.type());
    console.log('  Available:', scheduleProperty?.availableValues());
    console.log('  IsVisible:', scheduleProperty?.isVisible());
    console.log('  IsEditable:', scheduleProperty?.isEditable());

    // Get a record
    const records = await resource.find({}, { limit: 1, offset: 0 });

    if (records.length > 0) {
      const record = records[0];
      console.log('\n=== Record Data ===');
      console.log('Record ID:', record.id);
      console.log('Record params:', JSON.stringify(record.params, null, 2));
      console.log('\nSchedule param specifically:');
      console.log('  Type:', typeof record.params.schedule);
      console.log('  Value:', record.params.schedule);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugScheduleField();
