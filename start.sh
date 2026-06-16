#!/bin/bash
set -e

echo "============================================"
echo "  QEH 3D Printing Office - Startup"
echo "============================================"
echo ""

# Check Node.js — auto-install if missing
if ! command -v node &> /dev/null; then
    echo ""
    echo "[INFO] Node.js not found. Attempting automatic install..."
    if command -v brew &> /dev/null; then
        brew install node
        echo "[OK] Node.js installed via Homebrew"
    elif command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        echo "[OK] Node.js installed via apt"
    else
        echo "[ERROR] Cannot auto-install. Please install Node.js: https://nodejs.org/"
        exit 1
    fi
fi
echo "[OK] Node.js: $(node -v)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[1/4] Installing dependencies..."
    npm install
fi
echo "[OK] node_modules exists"

# Generate Prisma client + push schema
echo ""
echo "[2/4] Setting up database..."
npx prisma generate
npx prisma db push

# Seed database
echo ""
echo "[3/4] Seeding database..."
npx prisma db seed || echo "[WARN] Seed may have partial failures, continuing..."

# Get LAN IP
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "")

echo ""
echo "[4/4] Starting server..."
echo ""
echo "============================================"
echo "  SERVER READY"
echo "  Local:   http://localhost:3000"
if [ -n "$LAN_IP" ]; then
    echo "  Network: http://$LAN_IP:3000"
fi
echo "============================================"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

npm run dev -- -H 0.0.0.0
