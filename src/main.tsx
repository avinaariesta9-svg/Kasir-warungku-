import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrasi Service Worker PWA secara aman (tidak memblokir render jika browser/iframe membatasi)
try {
  registerSW({ immediate: true });
} catch (err) {
  console.warn('Service worker registration note:', err);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
