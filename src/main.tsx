import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Client-side guard for dynamic third-party and cross-origin scripts (e.g. AdSense)
if (typeof window !== 'undefined') {
  const isIgnoredError = (msg: unknown) => {
    if (!msg) return true;
    const lower = String(msg).toLowerCase();
    return lower === 'script error.' ||
           lower === 'script error' ||
           lower.includes('script error') || 
           lower.includes('cannot set property fetch') ||
           lower.includes('only a getter') ||
           lower.includes('adsbygoogle') || 
           lower.includes('googleads') ||
           lower.includes('cross-origin') ||
           lower.includes('load failed') ||
           lower.includes('failed to fetch') ||
           lower.includes('ezo') ||
           lower.includes('aclib');
  };

  // Auto-reload if dynamic asset chunk preload fails on new deploys
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite] Preload error detected. Reloading page to fetch latest assets...', event);
    window.location.reload();
  });

  window.addEventListener('error', (e) => {
    if ((e.target && (e.target as HTMLElement).tagName === 'SCRIPT') || isIgnoredError(e.message) || isIgnoredError(e.filename)) {
      console.warn('[System Guard Client] Suppressed cross-origin error:', e.message || 'Script error');
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isIgnoredError(message) || isIgnoredError(source || '')) {
      console.warn('[System Guard Client] Suppressed cross-origin error via onerror:', message);
      return true;
    }
    if (prevOnError) {
      return prevOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (e) => {
    const reasonStr = e.reason ? String(e.reason.message || e.reason) : '';
    if (isIgnoredError(reasonStr)) {
      console.warn('[System Guard Client] Suppressed unhandled promise rejection:', reasonStr);
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

