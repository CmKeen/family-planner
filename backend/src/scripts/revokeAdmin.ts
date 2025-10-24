#!/usr/bin/env tsx

/**
 * Utility script to revoke admin privileges from a user
 * Usage: npm run revoke-admin <email>
 * Example: npm run revoke-admin user@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function revokeAdmin(email: string) {
  try {
    console.log(`Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    if (!user.isAdmin) {
      console.log(`✅ User ${email} is not an admin`);
      process.exit(0);
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: false },
    });

    console.log(`✅ Successfully revoked admin privileges from ${email}`);
    console.log(`\nUser details:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Admin: false`);
  } catch (error) {
    console.error('❌ Error revoking admin privileges:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npm run revoke-admin <email>');
  console.log('Example: npm run revoke-admin user@example.com');
  process.exit(1);
}

revokeAdmin(email);
