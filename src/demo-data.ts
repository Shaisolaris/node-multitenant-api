/**
 * Demo data — used when no database is connected.
 * Import this in controllers/resolvers to serve sample data.
 */
export const DEMO_MODE = !process.env.DATABASE_URL;

export const DEMO_USERS = [
  { id: "u1", email: "admin@demo.com", name: "Sarah Chen", role: "ADMIN" },
  { id: "u2", email: "dev@demo.com", name: "James Wilson", role: "MEMBER" },
];

export const DEMO_PROJECTS = [
  { id: "p1", name: "Website Redesign", status: "ACTIVE", description: "Complete site overhaul" },
  { id: "p2", name: "Mobile App v2", status: "ACTIVE", description: "React Native rewrite" },
];
