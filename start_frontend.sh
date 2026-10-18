#!/usr/bin/env bash
set -e

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend npm dependencies..."
    npm install
fi

echo "Starting Next.js frontend development server..."
echo " - Web UI: http://localhost:3000"
npm run dev
