# MashupAnalyzer

React 18 + TypeScript + Vite audio analysis application using Essentia.js WASM for BPM and key detection.

## Features
- Multi-threaded audio analysis with Web Workers
- BPM and key detection using Essentia.js WASM
- Mashup discovery and compatibility analysis
- Persistent player with crossfading
- Local-first with IndexedDB caching

## Cloudflare Pages Deployment

### Build Configuration
```bash
Build command: npm run build
Build output directory: dist
Environment variables:
  NODE_VERSION=20
  VITE_MAX_WORKERS=4 (optional, auto-detected)
```

### Requirements
- Node.js 20+
- WASM files in `public/essentia/` (automatically copied to `dist/`)
- `_headers` file in `public/` (Cloudflare Pages headers)

### What Was Fixed
1. **WASM Loading**: Switched from `instantiateStreaming` to `ArrayBuffer` instantiation (CF Pages compatible)
2. **Worker Pool**: Auto-detects Cloudflare environment and limits to 4 workers (prevents CPU throttling)
3. **Timeouts**: Added 45s initialization timeout, 60s per-task timeout, auto-restart on hang
4. **Headers**: Proper MIME types for `/essentia/*.js` and `/essentia/*.wasm` with CORS
5. **Error Handling**: Comprehensive logging, retry logic, fallback algorithms if WASM fails

### Verification
After deployment, check browser console:
1. `✅ Worker pool: 4 workers (4 cores available • Cloudflare safe mode)` 
2. `[Worker] ✅ Essentia scripts loaded`
3. `[Worker] ✅ Essentia initialized successfully`
4. Progress bars complete to 100% without hanging

### Troubleshooting
- **Workers hang at 15%**: Check console for `[Worker]` logs, look for WASM fetch errors
- **Timeout errors**: Workers will auto-restart, check if files eventually complete
- **CORS errors**: Verify `_headers` file deployed with `/essentia/*` rules
- **404 on WASM files**: Check `/essentia/essentia-wasm.umd.wasm` directly in browser

## Local Development

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Production Build

```bash
npm run build
npm run preview
```

## Architecture
- **Workers**: `src/workers/audioAnalysis.worker.js` (classic IIFE format)
- **Pool**: `src/utils/workerPool.ts` (manages 4-16 workers based on CPU cores)
- **WASM**: `public/essentia/` (Essentia.js UMD builds + WASM binaries)
- **Headers**: `public/_headers` (Cloudflare Pages configuration)
