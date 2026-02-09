import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LINKEDIN_PROFILES = [
  { name: 'Sabeeh - CTO' },
  { name: 'Haris - CEO' },
  { name: 'Shuja - Dev' },
  { name: 'Muhammad Abuzar - BD' }
];

async function main() {
  console.log('Seeding database...');

  // Seed LinkedIn profiles (upsert by name to avoid duplicates on re-seed)
  for (const profile of LINKEDIN_PROFILES) {
    await prisma.linkedInProfile.upsert({
      where: { name: profile.name },
      create: profile,
      update: {}
    });
  }
  console.log('✅ LinkedIn profiles seeded:', LINKEDIN_PROFILES.map((p) => p.name).join(', '));

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@prospectmanager.com' }
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping user seed.');
  } else {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@prospectmanager.com',
        name: 'Admin User',
        role: 'admin',
        password_hash: null // Will be set when auth is implemented
      }
    });
    console.log('✅ Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });
    console.log('📝 Admin User ID:', adminUser.id);
    console.log('💡 Use this user_id when creating prospects from extension');
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
