#!/usr/bin/env tsx

/**
 * Utility script to promote a user to admin
 * Usage: npm run make-admin <email>
 * Example: npm run make-admin admin@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  try {
    console.log(`Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`✅ User ${email} is already an admin`);
      process.exit(0);
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    console.log(`✅ Successfully promoted ${email} to admin`);
    console.log(`\nUser details:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Admin: true`);
  } catch (error) {
    console.error('❌ Error promoting user to admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npm run make-admin <email>');
  console.log('Example: npm run make-admin admin@example.com');
  process.exit(1);
}

makeAdmin(email);
