// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { PlaybackProvider } from './contexts/PlaybackContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlaybackProvider>
      <App />
    </PlaybackProvider>
  </React.StrictMode>
);