import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LINKEDIN_PROFILES = [
  { name: 'Sabeeh - CTO' },
  { name: 'Haris - CEO' },
  { name: 'Shuja - Dev' },
  { name: 'Muhammad Abuzar - BD' }
];

const SKILLS = [
  // Frontend
  'React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript',
  // Backend
  'Node.js', 'Express.js', 'NestJS', 'Java', 'Spring Boot', 'Python', 'Django', 'FastAPI', 'PHP', 'Laravel', '.NET', 'C#',
  // Mobile
  'React Native', 'Flutter', 'Swift', 'Kotlin',
  // Database
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase',
  // DevOps/Cloud
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'CI/CD',
  // AI & Emerging
  'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Generative AI', 'GenAI', 'LLM Integration', 'OpenAI Integration', 'Prompt Engineering', 'AI Agents', 'RAG', 'NLP', 'Computer Vision', 'AI Chatbot Development', 'AI Automation',
  // Blockchain/Web3
  'Blockchain', 'Web3', 'Smart Contracts', 'Solidity',
  // Emerging / Low-Code / No-Code
  'Low-Code Development', 'No-Code Development', 'Vibe Coding', 'SaaS Development', 'MVP Development', 'IoT', 'Edge Computing', 'AR/VR',
  // AI Tools
  'GitHub Copilot', 'Cursor AI', 'Replit AI', 'Replit Agent', 'Claude Code', 'Google Gemini Code Assist', 'Codeium', 'Tabnine', 'Amazon CodeWhisperer', 'JetBrains AI', 'Sourcegraph Cody',
  // Design
  'UI/UX Design', 'Figma', 'Product Design',
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

  // Seed Skills (batch insert, skip duplicates)
  const skillResult = await prisma.skill.createMany({
    data: SKILLS.map((name) => ({ name })),
    skipDuplicates: true,
  });
  console.log(`✅ Skills seeded: ${skillResult.count} new, ${SKILLS.length} total`);

  // Default user ID the extension uses - must exist for prospect creation
  const DEFAULT_ADMIN_USER_ID = 'aef5e700-1401-4e3f-bd54-5be9d645df0f';
  let adminUser = await prisma.user.findUnique({ where: { id: DEFAULT_ADMIN_USER_ID } });
  if (adminUser) {
    console.log('✅ Default extension user already exists:', adminUser.email);
  } else {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: 'admin@prospectmanager.com' }
    });
    if (existingByEmail) {
      await prisma.user.create({
        data: {
          id: DEFAULT_ADMIN_USER_ID,
          email: 'extension@prospectmanager.com',
          name: 'Extension Default User',
          role: 'admin',
          password_hash: null
        }
      });
      console.log('✅ Extension default user created (admin@ already existed with another id)');
    } else {
      adminUser = await prisma.user.create({
        data: {
          id: DEFAULT_ADMIN_USER_ID,
          email: 'admin@prospectmanager.com',
          name: 'Admin User',
          role: 'admin',
          password_hash: null
        }
      });
      console.log('✅ Admin user created:', adminUser.email);
    }
  }
  console.log('💡 Extension uses user_id:', DEFAULT_ADMIN_USER_ID);

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
