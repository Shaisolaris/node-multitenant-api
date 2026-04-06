#!/bin/bash
set -e
echo "🚀 Setting up node-multitenant-api..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 18+ required"; exit 1; }
echo "📦 Installing dependencies..."
npm install
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || echo "⚠️  Create .env from .env.example"
fi
echo ""; echo "✅ Setup complete! Run: npm run dev"
