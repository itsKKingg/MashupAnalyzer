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
},

optimizeDeps: {
exclude: ['essentia.js'],
},

build: {
target: 'esnext',
sourcemap: true,
},
});