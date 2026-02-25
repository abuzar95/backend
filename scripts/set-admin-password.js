/**
 * One-time script: set password (and username) for admin@prospectmanager.com
 * Run from backend: node scripts/set-admin-password.js
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';

const SALT_ROUNDS = 10;
const ADMIN_EMAIL = 'admin@prospectmanager.com';
const DEFAULT_PASSWORD = 'Admin123!';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (!user) {
    console.error('No user found with email:', ADMIN_EMAIL);
    process.exit(1);
  }
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: hash },
  });
  console.log('Password set for', ADMIN_EMAIL);
  console.log('You can log in with:');
  console.log('  Email:', ADMIN_EMAIL);
  console.log('  Password:', DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
