/**
 * Seed script — populates database with demo data.
 * Run: npx prisma db push && npx tsx src/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: { name: "Acme Corp", slug: "acme-" + Date.now(), plan: "PRO" },
  });

  // Create demo users
  await prisma.user.createMany({
    data: [
      { email: `admin-${Date.now()}@demo.com`, passwordHash: "$2a$10$placeholder", role: "ADMIN", tenantId: tenant.id },
      { email: `dev-${Date.now()}@demo.com`, passwordHash: "$2a$10$placeholder", role: "MEMBER", tenantId: tenant.id },
    ],
  });

  // Create demo project
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id }, take: 1 });
  await prisma.project.create({
    data: { name: "Website Redesign", description: "Complete redesign of the marketing site", status: "ACTIVE", tenantId: tenant.id, ownerId: users[0].id },
  });

  console.log("✅ Seed complete! Created tenant, 2 users, 1 project.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
