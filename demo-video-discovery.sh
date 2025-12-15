#!/bin/bash
echo "🎥 WHALE VIDEO DISCOVERY DEMO"
echo "=============================="
echo ""
echo "Checking server status..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Server is running!"
  echo ""
  echo "To trigger discovery:"
  echo "1. Open: http://localhost:3000/admin/video-management"
  echo "2. Click '🔍 Discover Videos' button"
  echo ""
  echo "OR run this API call:"
  echo ""
  echo "curl -X POST http://localhost:3000/api/youtube/discover-all \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"forceAll\": false, \"minScore\": 60}'"
else
  echo "❌ Server not running!"
  echo "Start it with: npm run dev"
fi
