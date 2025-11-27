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
```
Build command: npm run build
Build output directory: dist
Node version: 20 (set NODE_VERSION=20 env var)
```

### Requirements
- Node.js 20+
- WASM files in `public/essentia/` (automatically copied to `dist/`)
- `_headers` file in `public/` (Cloudflare Pages headers)

### Verification
After deployment, check:
1. `/essentia/essentia-wasm.umd.wasm` returns 200 with `Content-Type: application/wasm`
2. Browser console shows `✅ Essentia initialized successfully`
3. File analysis completes without hanging

### Troubleshooting
- **Workers hang at 15%**: Check browser console for WASM instantiation errors
- **CORS errors**: Verify `_headers` file is deployed correctly
- **404 on WASM files**: Ensure `public/essentia/` directory exists

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
