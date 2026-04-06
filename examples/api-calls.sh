#!/bin/bash
# Example API calls for node-multitenant-api
# Run: chmod +x examples/api-calls.sh && ./examples/api-calls.sh

BASE="http://localhost:3000/api"

echo "=== 1. Register Tenant ==="
REGISTER=$(curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"Demo Corp","tenantSlug":"demo-corp","email":"admin@demo.com","password":"demo123","firstName":"Sarah","lastName":"Chen"}')
echo "$REGISTER" | python3 -m json.tool 2>/dev/null || echo "$REGISTER"

echo ""
echo "=== 2. Login ==="
LOGIN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123","tenantSlug":"demo-corp"}')
echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('accessToken',''))" 2>/dev/null)

echo ""
echo "=== 3. Get Current User ==="
curl -s $BASE/users/me -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== 4. Create Project ==="
curl -s -X POST $BASE/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign","description":"Complete redesign of marketing site","status":"ACTIVE"}' | python3 -m json.tool 2>/dev/null

echo ""
echo "=== 5. List Projects ==="
curl -s $BASE/projects -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== 6. List Users ==="
curl -s $BASE/users -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== 7. Health Check ==="
curl -s $BASE/../health | python3 -m json.tool 2>/dev/null
