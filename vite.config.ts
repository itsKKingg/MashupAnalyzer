// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom plugin to process worker files through esbuild
function workerTranspiler() {
  return {
    name: 'worker-transpiler',
    async load(id) {
      if (id.includes('.worker.js')) {
        // Let Vite handle the worker file normally
        return null;
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [react(), workerTranspiler()],

// Bind dev server and HMR to 127.0.0.1:5173
server: {
host: '127.0.0.1',
port: 5173,
strictPort: true,
hmr: {
host: '127.0.0.1',
port: 5173,
protocol: 'ws',
clientPort: 5173,
},
// Optional but helpful for OneDrive paths on Windows
watch: {
usePolling: true,
interval: 800,
},
},

// Also bind preview to 127.0.0.1
preview: {
host: '127.0.0.1',
port: 5173,
},

// Workers: classic format to allow importScripts, but ensure proper transpilation
worker: {
  format: 'iife',
  rollupOptions: {
    output: {
      entryFileNames: '[name]-[hash].js',
      format: 'iife',
    }
  },
  plugins: () => []
},

resolve: {
  alias: {
    buffer: 'buffer',
  },
},

define: {
global: 'globalThis',
},

optimizeDeps: {
exclude: ['essentia.js'],
esbuildOptions: {
define: {
global: 'globalThis',
},
},
},

build: {
  target: 'es2015',
  sourcemap: true,
  rollupOptions: {
    output: {
      manualChunks: undefined,
    },
  },
},
});