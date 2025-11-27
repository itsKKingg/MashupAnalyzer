// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
plugins: [react()],

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

// Workers: classic format to allow importScripts in your worker
worker: {
  format: 'iife',
  plugins: () => [],
  rollupOptions: {
    output: {
      entryFileNames: '[name]-[hash].js',
      format: 'iife',
    }
  }
},

esbuild: {
  target: 'es2015',
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