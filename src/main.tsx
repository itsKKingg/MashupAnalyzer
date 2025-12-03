// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { PlaybackProvider } from './contexts/PlaybackContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Add Buffer polyfill for music-metadata
import { Buffer } from 'buffer';
(window as any).global = window;
(window as any).Buffer = Buffer;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PlaybackProvider>
        <App />
      </PlaybackProvider>
    </ErrorBoundary>
  </React.StrictMode>
);