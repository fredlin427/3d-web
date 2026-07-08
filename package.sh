#!/bin/bash
# Build QEH Deploy Package for Linux
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  QEH 3D Printing - Build Linux Package"
echo "============================================"
echo ""

# Step 1: Build Next.js
echo "[1/5] Building Next.js (standalone mode)..."
npx next build

# Step 2: Prepare deploy folder
echo "[2/5] Preparing deploy package..."
rm -rf deploy-package-linux
mkdir -p deploy-package-linux

cp -r .next/standalone/* deploy-package-linux/
cp -r .next/static deploy-package-linux/.next/static 2>/dev/null || true
cp .next/BUILD_ID deploy-package-linux/.next/ 2>/dev/null || true
cp .next/*.json deploy-package-linux/.next/ 2>/dev/null || true
[ -d public ] && cp -r public deploy-package-linux/
cp -r node_modules/@prisma deploy-package-linux/node_modules/@prisma 2>/dev/null || true

# Prisma hash alias
for dir in .next/standalone/node_modules/@prisma/client-*; do
  if [ -d "$dir" ]; then
    hash_dir=$(basename "$dir")
    [ ! -d "deploy-package-linux/node_modules/@prisma/$hash_dir" ] && \
      cp -r deploy-package-linux/node_modules/@prisma/client "deploy-package-linux/node_modules/@prisma/$hash_dir" 2>/dev/null || true
    echo "  Alias: $hash_dir"
  fi
done

cp dev.db deploy-package-linux/ 2>/dev/null || true
cp prisma.config.ts deploy-package-linux/ 2>/dev/null || true

# Step 3: Create Linux start script
echo "[3/5] Creating start.sh..."
cat > deploy-package-linux/start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export PORT=8080
export HOST=0.0.0.0
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "============================================"
echo "  QEH 3D Printing Office - Linux Server"
echo "============================================"
echo ""
echo "  Local:   http://localhost:8080"
[ -n "$IP" ] && echo "  Network: http://$IP:8080"
echo ""
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""
exec "$(dirname "$0")/bin/node" "$(dirname "$0")/server.js"
EOF
chmod +x deploy-package-linux/start.sh
echo "  Created start.sh"

# Step 4: Bundle Node.js Linux portable
echo "[4/5] Bundling Node.js (Linux)..."
NODE_VERSION="v24.16.0"
NODE_ARCH="linux-x64"
NODE_TAR="node-${NODE_VERSION}-${NODE_ARCH}.tar.gz"

if [ ! -f "node-portable-linux/bin/node" ]; then
    echo "  Downloading portable Node.js ${NODE_VERSION} for Linux..."
    curl -L -o node-tmp.tar.gz "https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR}"
    mkdir -p node-portable-linux
    tar -xzf node-tmp.tar.gz -C node-portable-linux --strip-components=1
    rm node-tmp.tar.gz
fi

cp -r node-portable-linux/* deploy-package-linux/
echo "  Node.js ${NODE_VERSION} bundled"

# Step 5: Create tar.gz
echo "[5/5] Creating archive..."
tar -czf qeh-3d-print-linux.tar.gz -C deploy-package-linux .
rm -rf deploy-package-linux

echo ""
echo "============================================"
echo "  DONE - qeh-3d-print-linux.tar.gz"
echo "============================================"
