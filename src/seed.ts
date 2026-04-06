/**
 * Seed script — populates database with demo data.
 * Run: npx tsx src/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create tenants
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: { name: "Acme Corp", slug: "acme-corp", plan: "PRO" },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: "startup-inc" },
    update: {},
    create: { name: "Startup Inc", slug: "startup-inc", plan: "FREE" },
  });

  // Create users
  const passwordHash = await bcrypt.hash("demo123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: {
      email: "admin@acme.com", name: "Sarah Chen",
      passwordHash, role: "ADMIN", tenantId: tenant1.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "dev@acme.com" },
    update: {},
    create: {
      email: "dev@acme.com", name: "James Wilson",
      passwordHash, role: "MEMBER", tenantId: tenant1.id,
    },
  });

  // Create projects
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1", name: "Website Redesign",
      description: "Complete redesign of the marketing site",
      status: "ACTIVE", tenantId: tenant1.id, ownerId: admin.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("   Admin: admin@acme.com / demo123");
  console.log("   Member: dev@acme.com / demo123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
