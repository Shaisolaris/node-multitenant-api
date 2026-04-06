#!/bin/bash
set -e

echo "🚀 Setting up node-multitenant-api"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker required. Install from https://docker.com"
  exit 1
fi

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker compose up -d
echo "   Waiting for database..."
sleep 3

# Install deps
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f .env ]; then
  cat > .env << 'ENV'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multitenant
JWT_ACCESS_SECRET=demo-access-secret-change-in-production
JWT_REFRESH_SECRET=demo-refresh-secret-change-in-production
PORT=3000
NODE_ENV=development
ENV
  echo "✅ Created .env"
fi

# Generate Prisma client + push schema
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

# Seed
echo "🌱 Seeding demo data..."
npx tsx src/seed.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the server:"
echo "  npm run dev"
echo ""
echo "Test endpoints:"
echo '  # Register a new tenant'
echo '  curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '"'"'{"tenantName":"My Company","tenantSlug":"my-company","email":"admin@test.com","password":"password123","firstName":"John","lastName":"Doe"}'"'"''
echo ""
echo '  # Login'
echo '  curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '"'"'{"email":"admin@test.com","password":"password123","tenantSlug":"my-company"}'"'"''
