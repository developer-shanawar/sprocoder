import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Client-side guard for dynamic third-party and cross-origin scripts (e.g. AdSense)
if (typeof window !== 'undefined') {
  const isIgnoredError = (msg: string | null) => {
    if (!msg) return false;
    const lower = String(msg).toLowerCase();
    return lower.includes('script error') || 
           lower.includes('adsbygoogle') || 
           lower.includes('googleads') ||
           lower.includes('cross-origin');
  };

  window.addEventListener('error', (e) => {
    if (isIgnoredError(e.message) || isIgnoredError(e.filename)) {
      console.warn('[System Guard Client] Suppressed cross-origin error:', e.message);
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msgStr = typeof message === 'string' ? message : '';
    if (isIgnoredError(msgStr) || isIgnoredError(source || '')) {
      console.warn('[System Guard Client] Suppressed cross-origin error via onerror:', message);
      return true;
    }
    if (prevOnError) {
      return prevOnError(message, source, lineno, colno, error);
    }
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
