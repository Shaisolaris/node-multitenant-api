import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
      plan: 'PRO',
      users: {
        create: {
          email: 'owner@demo.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Owner',
          role: 'OWNER',
        },
      },
    },
  });

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'Demo Project',
      description: 'Seeded demo project',
      tenantId: tenant.id,
      metadata: { source: 'seed', tags: ['demo'] },
    },
  });

  console.log(`✓ Tenant: ${tenant.slug}`);
  console.log(`✓ Project: ${project.name}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
