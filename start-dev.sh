#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "=========================================================="
echo " Starting Echo – AI Voice-Based Memory Assistant"
echo "=========================================================="

# 1. Start MongoDB
"$DIR/backend/start-db.sh"

# 2. Check if backend server is running
if curl -s http://localhost:5000/api/health | grep -q "online"; then
  echo "[Backend] Server already running at http://localhost:5000"
else
  echo "[Backend] Starting Node.js Express server on port 5000..."
  (cd "$DIR/backend" && npm run dev) &
  sleep 2
fi

# 3. Start Expo development server for the mobile app
echo "[Frontend] Starting Expo bundler..."
cd "$DIR/frontend"
npx expo start
