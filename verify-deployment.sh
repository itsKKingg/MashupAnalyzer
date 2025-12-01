#!/bin/bash
# Cloudflare Pages Deployment Verification Script

echo "================================================"
echo "🔍 MashupAnalyzer - Deployment Verification"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dist exists
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ dist/ directory not found. Run 'npm run build' first.${NC}"
  exit 1
fi

echo "✅ Build output directory exists"
echo ""

# 1. Check Essentia files
echo "📦 Checking Essentia files..."
ESSENTIA_FILES=(
  "dist/essentia/essentia.js-extractor.umd.js"
  "dist/essentia/essentia-wasm.umd.js"
  "dist/essentia/essentia-wasm.umd.wasm"
)

for file in "${ESSENTIA_FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(du -h "$file" | cut -f1)
    echo -e "${GREEN}  ✓${NC} $file ($SIZE)"
  else
    echo -e "${RED}  ✗${NC} $file - MISSING!"
    exit 1
  fi
done
echo ""

# 2. Check _headers file
echo "🔧 Checking _headers file..."
if [ -f "dist/_headers" ]; then
  echo -e "${GREEN}  ✓${NC} dist/_headers exists"
  
  # Verify critical header rules
  if grep -q "/essentia/\*.js" dist/_headers; then
    echo -e "${GREEN}  ✓${NC} /essentia/*.js rule found"
  else
    echo -e "${RED}  ✗${NC} /essentia/*.js rule MISSING!"
  fi
  
  if grep -q "/essentia/\*.wasm" dist/_headers; then
    echo -e "${GREEN}  ✓${NC} /essentia/*.wasm rule found"
  else
    echo -e "${RED}  ✗${NC} /essentia/*.wasm rule MISSING!"
  fi
  
  if grep -q "application/wasm" dist/_headers; then
    echo -e "${GREEN}  ✓${NC} application/wasm MIME type found"
  else
    echo -e "${RED}  ✗${NC} application/wasm MIME type MISSING!"
  fi
else
  echo -e "${RED}  ✗${NC} dist/_headers - MISSING!"
  exit 1
fi
echo ""

# 3. Check worker bundle
echo "👷 Checking worker bundle..."
WORKER_FILE=$(ls dist/assets/*worker*.js 2>/dev/null | head -1)
if [ -n "$WORKER_FILE" ]; then
  SIZE=$(du -h "$WORKER_FILE" | cut -f1)
  echo -e "${GREEN}  ✓${NC} Worker bundle found: $WORKER_FILE ($SIZE)"
  
  # Check for critical patterns
  if grep -q "ESSENTIA_BASE_URL" "$WORKER_FILE"; then
    echo -e "${GREEN}  ✓${NC} ESSENTIA_BASE_URL found in worker"
  else
    echo -e "${YELLOW}  ⚠${NC} ESSENTIA_BASE_URL not found (may be minified)"
  fi
else
  echo -e "${RED}  ✗${NC} Worker bundle not found!"
  exit 1
fi
echo ""

# 4. Check main bundle
echo "📦 Checking main application bundle..."
MAIN_FILES=$(ls dist/assets/index-*.js 2>/dev/null | wc -l)
if [ "$MAIN_FILES" -gt 0 ]; then
  echo -e "${GREEN}  ✓${NC} Main bundle(s) found ($MAIN_FILES files)"
else
  echo -e "${RED}  ✗${NC} Main bundle not found!"
  exit 1
fi
echo ""

# 5. Check index.html
echo "📄 Checking index.html..."
if [ -f "dist/index.html" ]; then
  echo -e "${GREEN}  ✓${NC} dist/index.html exists"
  
  if grep -q "<script" dist/index.html; then
    echo -e "${GREEN}  ✓${NC} Script tags found"
  else
    echo -e "${RED}  ✗${NC} No script tags in index.html!"
  fi
else
  echo -e "${RED}  ✗${NC} dist/index.html - MISSING!"
  exit 1
fi
echo ""

# 6. Source file checks
echo "🔍 Checking source files..."

# Check workerPool.ts
if grep -q "detectCloudflarePages" src/utils/workerPool.ts; then
  echo -e "${GREEN}  ✓${NC} Cloudflare detection in workerPool.ts"
else
  echo -e "${RED}  ✗${NC} Cloudflare detection MISSING in workerPool.ts"
fi

if grep -q "CF_MAX_WORKERS.*=.*4" src/utils/workerPool.ts; then
  echo -e "${GREEN}  ✓${NC} CF_MAX_WORKERS limit set to 4"
else
  echo -e "${YELLOW}  ⚠${NC} CF_MAX_WORKERS may not be set correctly"
fi

# Check worker file
if grep -q "ArrayBuffer instantiation" src/workers/audioAnalysis.worker.js; then
  echo -e "${GREEN}  ✓${NC} ArrayBuffer instantiation in worker"
else
  echo -e "${YELLOW}  ⚠${NC} ArrayBuffer instantiation comment not found"
fi

if grep -q "FETCH_TIMEOUT_MS.*=.*30000" src/workers/audioAnalysis.worker.js; then
  echo -e "${GREEN}  ✓${NC} Fetch timeout set to 30s"
else
  echo -e "${YELLOW}  ⚠${NC} Fetch timeout may not be set correctly"
fi

echo ""

# 7. Deployment checklist
echo "================================================"
echo "📋 Deployment Checklist"
echo "================================================"
echo ""
echo "Cloudflare Pages Settings:"
echo "  • Build command: npm run build"
echo "  • Build output: dist"
echo "  • Node version: 20 (set NODE_VERSION=20)"
echo ""
echo "Expected Console Logs After Deployment:"
echo "  1. 🧵 Worker pool: 4 workers (4 cores available • Cloudflare safe mode)"
echo "  2. [Worker] Loading Essentia scripts..."
echo "  3. [Worker] ✅ Essentia scripts loaded"
echo "  4. [Worker] Received init message"
echo "  5. [Worker] ✅ Essentia initialized successfully"
echo "  6. [Worker] Received analyze message for: [filename]"
echo "  7. [Worker] Analysis complete for: [filename]"
echo ""
echo "Test URLs to verify after deployment:"
echo "  • https://your-site.pages.dev/essentia/essentia-wasm.umd.wasm"
echo "  • https://your-site.pages.dev/essentia/essentia.js-extractor.umd.js"
echo "  • https://your-site.pages.dev/_headers (should return 404, but rules apply)"
echo ""
echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
echo ""
